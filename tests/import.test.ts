import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";
import JSZip from "jszip";
import { importFile } from "@/lib/import";
import { AppError } from "@/lib/errors";

/** Builds a minimal but genuine Word document in memory (same zip/XML layout Word writes). */
async function buildDocx(): Promise<Buffer> {
  const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const REL = "http://schemas.openxmlformats.org/package/2006/relationships";
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="${REL}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="${REL}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
  );
  zip.file(
    "word/styles.xml",
    `<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="${W}"><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style></w:styles>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="${W}"><w:body>` +
      `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Kickoff</w:t></w:r></w:p>` +
      `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Bold</w:t></w:r><w:r><w:t xml:space="preserve">, </w:t></w:r>` +
      `<w:r><w:rPr><w:i/></w:rPr><w:t>italic</w:t></w:r><w:r><w:t xml:space="preserve"> and </w:t></w:r>` +
      `<w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>underlined</w:t></w:r></w:p>` +
      `</w:body></w:document>`,
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

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

  it("converts a real .docx (heading, bold, italic, underline) into editor JSON", async () => {
    const { title, content } = await importFile("Meeting notes.docx", await buildDocx());
    expect(title).toBe("Meeting notes");
    expect(types(content)).toEqual(["heading", "paragraph"]);
    expect(content.content?.[0].attrs?.level).toBe(1);
    expect(content.content?.[0].content?.[0].text).toBe("Kickoff");
    expect(marksIn(content)).toEqual(expect.arrayContaining(["bold", "italic", "underline"]));
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
