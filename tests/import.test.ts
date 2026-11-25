import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";
import { importFile } from "@/lib/import";
import { AppError } from "@/lib/errors";

const types = (doc: JSONContent) => (doc.content ?? []).map((n) => n.type);
const marksIn = (node: JSONContent): string[] =>
  [...(node.marks ?? []).map((m) => m.type), ...(node.content ?? []).flatMap(marksIn)];

describe("file import", () => {
  it("converts markdown structure and formatting into editor JSON", async () => {
    const md = [
      "# Quarterly plan",
      "",
      "Some **bold** and *italic* text.",
      "",
      "## Goals",
      "",
      "- First",
      "- Second",
      "",
      "1. One",
      "2. Two",
      "",
      "<script>alert('xss')</script>",
    ].join("\n");

    const { title, content } = await importFile("plan.md", Buffer.from(md));

    expect(title).toBe("Quarterly plan");
    expect(types(content)).toEqual(["heading", "paragraph", "heading", "bulletList", "orderedList"]);
    expect(content.content?.[0].attrs?.level).toBe(1);
    expect(marksIn(content)).toEqual(expect.arrayContaining(["bold", "italic"]));
    // Script tags are not part of the schema, so they can never be stored.
    expect(JSON.stringify(content)).not.toContain("alert");
  });

  it("turns plain text paragraphs into paragraphs and escapes HTML", async () => {
    const { title, content } = await importFile("notes.txt", Buffer.from("Hello <b>world</b>\n\nSecond paragraph"));
    expect(title).toBe("notes");
    expect(types(content)).toEqual(["paragraph", "paragraph"]);
    expect(content.content?.[0].content?.[0].text).toBe("Hello <b>world</b>");
  });

  it("rejects unsupported file types with a clear message", async () => {
    await expect(importFile("photo.png", Buffer.from("x"))).rejects.toMatchObject({ status: 415 });
  });

  it("rejects a fake .docx that is not a zip archive", async () => {
    const err = await importFile("fake.docx", Buffer.from("not a zip")).catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(400);
  });

  it("rejects empty and binary 'text' files", async () => {
    await expect(importFile("empty.txt", Buffer.alloc(0))).rejects.toMatchObject({ status: 400 });
    await expect(importFile("bin.txt", Buffer.from([0x48, 0x00, 0x49]))).rejects.toMatchObject({ status: 400 });
  });
});
