/**
 * API-level tests: real route handlers, real auth cookie, real (in-memory) Postgres.
 * They prove the "gateway" contract: every bad request gets the right status code and a
 * consistent JSON error ({ error: { code, message } }), and internals never leak.
 */
import { beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import * as login from "@/app/api/auth/login/route";
import * as documents from "@/app/api/documents/route";
import * as documentById from "@/app/api/documents/[id]/route";
import * as shares from "@/app/api/documents/[id]/shares/route";
import * as importRoute from "@/app/api/documents/import/route";
import { errorResponse } from "@/lib/http";

// getDb() reads this lazily on first use: an isolated, seeded in-memory database.
process.env.PGLITE_DIR = "memory://";

type Init = { method?: string; json?: unknown; raw?: string; form?: FormData; cookie?: string };
function request(path: string, init: Init = {}) {
  const headers = new Headers();
  if (init.cookie) headers.set("cookie", init.cookie);
  let body: BodyInit | undefined;
  if (init.form) body = init.form;
  else if (init.raw !== undefined || init.json !== undefined) {
    headers.set("content-type", "application/json");
    body = init.raw ?? JSON.stringify(init.json);
  }
  return new NextRequest(`http://localhost${path}`, { method: init.method ?? "GET", headers, body });
}
const params = <P extends Record<string, string>>(p: P) => ({ params: Promise.resolve(p) });
const noParams = params({} as Record<string, never>);

async function signIn(email: string) {
  const res = await login.POST(
    request("/api/auth/login", { method: "POST", json: { email, password: "demo1234" } }),
    noParams,
  );
  expect(res.status).toBe(200);
  const cookie = res.headers.get("set-cookie")?.split(";")[0];
  expect(cookie).toMatch(/^le_session=/);
  return cookie!;
}

let alice: string, carol: string, welcomeId: string;

beforeAll(async () => {
  alice = await signIn("alice@ajaia.test");
  carol = await signIn("carol@ajaia.test");
  const res = await documents.GET(request("/api/documents", { cookie: alice }), noParams);
  welcomeId = (await res.json()).owned[0].id;
});

describe("API error contract", () => {
  it("401 for requests without a session", async () => {
    const res = await documents.GET(request("/api/documents"), noParams);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: { code: "unauthorized", message: "Please sign in to continue." } });
  });

  it("401 for a wrong password, 400 with a readable message for a missing one", async () => {
    const wrong = await login.POST(
      request("/api/auth/login", { method: "POST", json: { email: "alice@ajaia.test", password: "nope" } }),
      noParams,
    );
    expect(wrong.status).toBe(401);
    expect((await wrong.json()).error.code).toBe("invalid_credentials");

    const missing = await login.POST(
      request("/api/auth/login", { method: "POST", json: { email: "alice@ajaia.test" } }),
      noParams,
    );
    expect(missing.status).toBe(400);
    expect((await missing.json()).error.code).toBe("validation_error");
  });

  it("400 for malformed JSON", async () => {
    const res = await documentById.PATCH(
      request(`/api/documents/${welcomeId}`, { method: "PATCH", raw: "{oops", cookie: alice }),
      params({ id: welcomeId }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_json");
  });

  it("400 with field messages for invalid share input", async () => {
    const badEmail = await shares.POST(
      request(`/api/documents/${welcomeId}/shares`, { method: "POST", json: { email: "not-an-email", role: "viewer" }, cookie: alice }),
      params({ id: welcomeId }),
    );
    expect(badEmail.status).toBe(400);
    expect((await badEmail.json()).error.message).toBe("Enter a valid email address.");

    const badRole = await shares.POST(
      request(`/api/documents/${welcomeId}/shares`, { method: "POST", json: { email: "bob@ajaia.test", role: "admin" }, cookie: alice }),
      params({ id: welcomeId }),
    );
    expect(badRole.status).toBe(400);
    expect((await badRole.json()).error.message).toBe("Role must be viewer or editor.");
  });

  it("404 (not a database error) for malformed document ids", async () => {
    const res = await documentById.GET(request("/api/documents/not-a-uuid", { cookie: alice }), params({ id: "not-a-uuid" }));
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not_found");
  });

  it("403 when a viewer tries to save", async () => {
    const res = await documentById.PUT(
      request(`/api/documents/${welcomeId}`, {
        method: "PUT",
        json: { version: 1, content: { type: "doc", content: [{ type: "paragraph" }] } },
        cookie: carol,
      }),
      params({ id: welcomeId }),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error.message).toBe("You have view-only access to this document.");
  });

  it("409 with the current version when a save is based on a stale copy", async () => {
    const created = await documents.POST(request("/api/documents", { method: "POST", cookie: alice }), noParams);
    const { document } = await created.json();
    const save = (version: number) =>
      documentById.PUT(
        request(`/api/documents/${document.id}`, {
          method: "PUT",
          json: { version, content: { type: "doc", content: [{ type: "paragraph" }] } },
          cookie: alice,
        }),
        params({ id: document.id }),
      );
    expect((await save(1)).status).toBe(200);
    const stale = await save(1);
    expect(stale.status).toBe(409);
    expect((await stale.json()).error.details.currentVersion).toBe(2);
  });

  it("415 for unsupported uploads, 400 for empty ones", async () => {
    const upload = async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return importRoute.POST(request("/api/documents/import", { method: "POST", form, cookie: alice }), noParams);
    };
    expect((await upload(new File(["x"], "photo.png"))).status).toBe(415);
    expect((await upload(new File([], "empty.md"))).status).toBe(400);
  });

  it("500 responses never leak internal error details", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = errorResponse(new Error("connection to db-internal.example:5432 refused"));
    spy.mockRestore();
    expect(res.status).toBe(500);
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain("db-internal");
    expect(text).toContain("Something went wrong");
  });
});
