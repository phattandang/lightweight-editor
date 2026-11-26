import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";
import { docToMarkdown } from "@/lib/export/markdown";
import { docToPdfDefinition, exportFileName } from "@/lib/export/pdf";
import { importFile } from "@/lib/import";

const t = (text: string, ...marks: string[]): JSONContent => ({
  type: "text",
  text,
  ...(marks.length ? { marks: marks.map((type) => ({ type })) } : {}),
});
const p = (...content: JSONContent[]): JSONContent => ({ type: "paragraph", content });
const li = (...content: JSONContent[]): JSONContent => ({ type: "listItem", content });

/** A document that uses every node and mark the editor supports. */
const SAMPLE: JSONContent = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [t("Quarterly plan")] },
    p(t("Plain, "), t("bold", "bold"), t(", "), t("italic", "italic"), t(", "), t("underlined", "underline"), t(", "), t("struck", "strike"), t(" and "), t("code", "code"), t(".")),
    p(t("Special chars stay literal: 2*3 = 6, a_b, [x], # not a heading")),
    { type: "heading", attrs: { level: 2 }, content: [t("Goals")] },
    { type: "bulletList", content: [li(p(t("First"))), li(p(t("Second")), { type: "bulletList", content: [li(p(t("Nested")))] })] },
    { type: "orderedList", attrs: { start: 3 }, content: [li(p(t("Three"))), li(p(t("Four")))] },
    { type: "blockquote", content: [p(t("A quote"))] },
    { type: "codeBlock", attrs: { language: "ts" }, content: [t("const x = 1;")] },
    { type: "horizontalRule" },
    p(t("Line one"), { type: "hardBreak" }, t("Line two")),
  ],
};

/** Structure-only view for comparing documents: node types, heading levels, text, marks. */
function shape(node: JSONContent): unknown {
  if (node.type === "text") return { text: node.text, marks: (node.marks ?? []).map((m) => m.type).sort() };
  return {
    type: node.type,
    ...(node.type === "heading" ? { level: node.attrs?.level } : {}),
    ...(node.content ? { content: node.content.map(shape) } : {}),
  };
}

describe("export to Markdown", () => {
  it("writes standard Markdown for every block and mark", () => {
    const md = docToMarkdown(SAMPLE);
    expect(md).toContain("# Quarterly plan\n");
    expect(md).toContain("**bold**");
    expect(md).toContain("*italic*");
    expect(md).toContain("<u>underlined</u>");
    expect(md).toContain("~~struck~~");
    expect(md).toContain("`code`");
    expect(md).toContain("## Goals\n");
    expect(md).toMatch(/^- First\n- Second\n {2}- Nested$/m);
    expect(md).toMatch(/^3\. Three\n4\. Four$/m);
    expect(md).toContain("> A quote");
    expect(md).toContain("```ts\nconst x = 1;\n```");
    expect(md).toContain("---");
    // Characters that mean something in Markdown are escaped, so they don't turn into formatting.
    expect(md).toContain("2\\*3");
    expect(md).toContain("\\[x\\]");
  });

  it("round-trips: exporting then re-importing gives back the same document structure", async () => {
    const md = docToMarkdown(SAMPLE);
    const { content } = await importFile("roundtrip.md", Buffer.from(md));
    // Ordered-list start numbers and code-block languages aren't compared; everything else must match.
    expect(shape(content)).toEqual(shape(SAMPLE));
  });
});

describe("export to PDF", () => {
  it("maps blocks and marks onto a pdfmake definition", () => {
    const def = docToPdfDefinition(SAMPLE, "Quarterly plan");
    const content = def.content as unknown as Array<Record<string, unknown>>;
    expect(def.info?.title).toBe("Quarterly plan");
    expect(content[0]).toMatchObject({ style: "h1" });
    const runs = content[1].text as Array<Record<string, unknown>>;
    expect(runs.find((r) => r.text === "bold")).toMatchObject({ bold: true });
    expect(runs.find((r) => r.text === "italic")).toMatchObject({ italics: true });
    expect(runs.find((r) => r.text === "underlined")).toMatchObject({ decoration: ["underline"] });
    expect(runs.find((r) => r.text === "struck")).toMatchObject({ decoration: ["lineThrough"] });
    expect(content.find((c) => "ul" in c)).toBeTruthy();
    expect(content.find((c) => "ol" in c)).toMatchObject({ start: 3 });
  });

  it("renders a real PDF file", async () => {
    const pdfmake = (await import("pdfmake")).default as unknown as {
      addFonts: (f: unknown) => void;
      createPdf: (d: unknown) => { getBuffer: () => Promise<Buffer> };
    };
    const Roboto = (await import("pdfmake/fonts/Roboto")).default;
    pdfmake.addFonts(Roboto);
    const buffer = await pdfmake.createPdf(docToPdfDefinition(SAMPLE, "Quarterly plan")).getBuffer();
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(5_000);
  });

  it("makes safe file names from titles", () => {
    expect(exportFileName('Q1: "Plan" / draft?', "pdf")).toBe("Q1 Plan draft .pdf".replace(" .", "."));
    expect(exportFileName("   ", "md")).toBe("document.md");
  });
});
