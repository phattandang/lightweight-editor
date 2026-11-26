import { getSchema, type JSONContent } from "@tiptap/core";
import { Node } from "@tiptap/pm/model";
import { baseExtensions } from "./editor/extensions";
import { badRequest, payloadTooLarge } from "./errors";

export const MAX_CONTENT_BYTES = 1_000_000; // ~1 MB of JSON per document

export const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

let schema: ReturnType<typeof getSchema> | null = null;
export function docSchema() {
  schema ??= getSchema(baseExtensions);
  return schema;
}

/**
 * Validates that `value` is a well-formed document for OUR editor schema
 * (unknown node types, bad nesting, etc. are rejected) and within size limits.
 * Returns the normalized JSON.
 */
export function validateContent(value: unknown): JSONContent {
  if (!value || typeof value !== "object" || (value as { type?: unknown }).type !== "doc") {
    throw badRequest("Content must be a document object.");
  }
  const size = new TextEncoder().encode(JSON.stringify(value)).length;
  if (size > MAX_CONTENT_BYTES) {
    throw payloadTooLarge(`Document is too large (${Math.round(size / 1024)} KB). Limit is 1 MB.`);
  }
  try {
    const node = Node.fromJSON(docSchema(), value);
    node.check();
    return node.toJSON() as JSONContent;
  } catch (err) {
    throw badRequest("Content does not match the document schema.", {
      reason: err instanceof Error ? err.message : String(err),
    });
  }
}

export const TITLE_MAX = 200;

export function normalizeTitle(raw: unknown): string {
  if (typeof raw !== "string") throw badRequest("Title must be a string.");
  const title = raw.replace(/\s+/g, " ").trim();
  if (!title) throw badRequest("Title cannot be empty.");
  if (title.length > TITLE_MAX) throw badRequest(`Title must be at most ${TITLE_MAX} characters.`);
  return title;
}
