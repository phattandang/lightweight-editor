import type { JSONContent } from "@tiptap/core";
import { Node } from "@tiptap/pm/model";
import { defaultMarkdownSerializer as base, MarkdownSerializer } from "prosemirror-markdown";
import { docSchema } from "../content";

/**
 * Editor JSON -> Markdown, using ProseMirror's own serializer (correct escaping and
 * mark nesting) mapped onto TipTap's node/mark names. Markdown has no underline,
 * so it is written as inline <u>...</u> HTML, which Markdown renderers (and our own
 * importer) understand.
 */
const serializer = new MarkdownSerializer(
  {
    paragraph: base.nodes.paragraph,
    heading: base.nodes.heading,
    blockquote: base.nodes.blockquote,
    horizontalRule: base.nodes.horizontal_rule,
    hardBreak: base.nodes.hard_break,
    text: base.nodes.text,
    listItem: base.nodes.list_item,
    bulletList(state, node) {
      state.renderList(node, "  ", () => "- ");
    },
    orderedList(state, node) {
      const start = (node.attrs.start as number | undefined) ?? 1;
      const width = String(start + node.childCount - 1).length;
      const indent = state.repeat(" ", width + 2);
      state.renderList(node, indent, (i) => {
        const n = String(start + i);
        return state.repeat(" ", width - n.length) + n + ". ";
      });
    },
    codeBlock(state, node) {
      const runs = node.textContent.match(/`{3,}/gm);
      const fence = runs ? runs.sort().slice(-1)[0] + "`" : "```";
      state.write(fence + ((node.attrs.language as string | null) ?? "") + "\n");
      state.text(node.textContent, false);
      state.write("\n");
      state.write(fence);
      state.closeBlock(node);
    },
  },
  {
    bold: base.marks.strong,
    italic: base.marks.em,
    code: base.marks.code,
    link: base.marks.link,
    strike: { open: "~~", close: "~~", mixable: true, expelEnclosingWhitespace: true },
    underline: { open: "<u>", close: "</u>", mixable: true, expelEnclosingWhitespace: true },
  },
);

export function docToMarkdown(doc: JSONContent): string {
  const node = Node.fromJSON(docSchema(), doc);
  return serializer.serialize(node, { tightLists: true }).trim() + "\n";
}
