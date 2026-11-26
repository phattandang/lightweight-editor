import type { JSONContent } from "@tiptap/core";
import type {
  Content,
  ContentText,
  CustomTableLayout,
  Decoration,
  TDocumentDefinitions,
} from "pdfmake/interfaces";

/**
 * Editor JSON -> pdfmake document definition. Pure and framework-free so it can be
 * unit-tested and rendered either in the browser (download) or in Node (tests).
 * Produces a real PDF with selectable text, not a screenshot.
 */
const QUOTE_LAYOUT: CustomTableLayout = {
  hLineWidth: () => 0,
  vLineWidth: (i) => (i === 0 ? 2 : 0),
  vLineColor: () => "#dadce0",
  paddingLeft: () => 10,
  paddingTop: () => 2,
  paddingBottom: () => 2,
};

const CODE_LAYOUT: CustomTableLayout = {
  hLineWidth: () => 0,
  vLineWidth: () => 0,
  fillColor: () => "#f1f3f4",
  paddingLeft: () => 8,
  paddingRight: () => 8,
  paddingTop: () => 6,
  paddingBottom: () => 6,
};

function inline(nodes: JSONContent[] | undefined): ContentText[] {
  return (nodes ?? []).map((n): ContentText => {
    if (n.type === "hardBreak") return { text: "\n" };
    const marks = new Set((n.marks ?? []).map((m) => m.type));
    const href = n.marks?.find((m) => m.type === "link")?.attrs?.href as string | undefined;
    const decoration: Decoration[] = [];
    if (marks.has("underline") || href) decoration.push("underline");
    if (marks.has("strike")) decoration.push("lineThrough");
    return {
      text: n.text ?? "",
      ...(marks.has("bold") ? { bold: true } : {}),
      ...(marks.has("italic") ? { italics: true } : {}),
      ...(decoration.length ? { decoration } : {}),
      ...(marks.has("code") ? { background: "#f1f3f4" } : {}),
      ...(href ? { link: href, color: "#1a73e8" } : {}),
    };
  });
}

function blocks(nodes: JSONContent[] | undefined, inList = false): Content[] {
  return (nodes ?? []).map((n) => block(n, inList)).filter((c): c is Content => c !== null);
}

function listItems(list: JSONContent): Content[] {
  return (list.content ?? []).map((item) => {
    const parts = blocks(item.content, true);
    return parts.length === 1 ? parts[0] : { stack: parts };
  });
}

function block(n: JSONContent, inList: boolean): Content | null {
  switch (n.type) {
    case "paragraph": {
      const runs = inline(n.content);
      // Keep empty paragraphs as vertical space, like in the editor.
      return { text: runs.length ? runs : " ", ...(inList ? {} : { style: "p" }) };
    }
    case "heading":
      return { text: inline(n.content), style: `h${(n.attrs?.level as number) ?? 1}` };
    case "bulletList":
      return { ul: listItems(n), ...(inList ? {} : { style: "list" }) };
    case "orderedList":
      return { ol: listItems(n), start: (n.attrs?.start as number) ?? 1, ...(inList ? {} : { style: "list" }) };
    case "blockquote":
      return {
        table: { widths: ["*"], body: [[{ stack: blocks(n.content, true), color: "#5f6368" }]] },
        layout: QUOTE_LAYOUT,
        style: "block",
      };
    case "codeBlock":
      return {
        table: {
          widths: ["*"],
          body: [[{ text: (n.content ?? []).map((t) => t.text ?? "").join(""), preserveLeadingSpaces: true, fontSize: 9.5 }]],
        },
        layout: CODE_LAYOUT,
        style: "block",
      };
    case "horizontalRule":
      return {
        canvas: [{ type: "line", x1: 0, y1: 0, x2: 483, y2: 0, lineWidth: 0.75, lineColor: "#dadce0" }],
        margin: [0, 6, 0, 12],
      };
    default:
      // Unknown block: keep its text rather than dropping content silently.
      return n.content ? { text: inline(n.content.flatMap((c) => c.content ?? [c])) } : null;
  }
}

export function docToPdfDefinition(doc: JSONContent, title: string): TDocumentDefinitions {
  return {
    info: { title },
    pageSize: "A4",
    pageMargins: [56, 56, 56, 56],
    content: blocks(doc.content),
    defaultStyle: { fontSize: 11, lineHeight: 1.3, color: "#202124" },
    styles: {
      h1: { fontSize: 22, bold: true, margin: [0, 10, 0, 6] },
      h2: { fontSize: 17, bold: true, margin: [0, 10, 0, 5] },
      h3: { fontSize: 13.5, bold: true, margin: [0, 8, 0, 4] },
      p: { margin: [0, 0, 0, 7] },
      list: { margin: [0, 0, 0, 7] },
      block: { margin: [0, 2, 0, 9] },
    },
  };
}

/** Safe file name from a document title. */
export function exportFileName(title: string, ext: "md" | "pdf"): string {
  const base = title.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
  return `${base || "document"}.${ext}`;
}
