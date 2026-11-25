import StarterKit from "@tiptap/starter-kit";

/**
 * Shared by the browser editor AND the server (content validation + file import),
 * so both sides agree on exactly one document schema.
 * StarterKit v3 includes bold, italic, underline, strike, headings, lists, blockquote,
 * code, link, history and more.
 */
export const baseExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: { openOnClick: false, autolink: true },
  }),
];
