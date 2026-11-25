import { describe, expect, it } from "vitest";
import { can, resolveRole, type Action } from "@/lib/access";

const ALL: Action[] = ["read", "edit", "rename", "share", "delete"];

describe("access policy", () => {
  it("owner can do everything", () => {
    for (const a of ALL) expect(can("owner", a)).toBe(true);
  });

  it("editor can read, edit and rename but not share or delete", () => {
    expect(ALL.filter((a) => can("editor", a))).toEqual(["read", "edit", "rename"]);
  });

  it("viewer can only read", () => {
    expect(ALL.filter((a) => can("viewer", a))).toEqual(["read"]);
  });

  it("no role means no access", () => {
    for (const a of ALL) expect(can(null, a)).toBe(false);
  });

  it("ownership beats any share row", () => {
    expect(resolveRole("u1", { ownerId: "u1" }, { role: "viewer" })).toBe("owner");
    expect(resolveRole("u2", { ownerId: "u1" }, { role: "editor" })).toBe("editor");
    expect(resolveRole("u2", { ownerId: "u1" }, null)).toBeNull();
  });
});
