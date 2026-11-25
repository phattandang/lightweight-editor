import { generateJSON } from "@tiptap/html";
import type { JSONContent } from "@tiptap/core";
import mammoth from "mammoth";
import { marked } from "marked";
import { baseExtensions } from "./editor/extensions";
import { validateContent } from "./content";
import { badRequest, payloadTooLarge, unsupportedMedia } from "./errors";

/** Vercel caps function request bodies at 4.5 MB, so stay safely under it. */
export const MAX_IMPORT_BYTES = 4 * 1024 * 1024;
export const SUPPORTED_EXTENSIONS = [".txt", ".md", ".markdown", ".docx"] as const;
export const SUPPORTED_LABEL = ".txt, .md, .docx (max 4 MB)";

type Kind = "txt" | "md" | "docx";

function detectKind(filename: string): Kind {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".txt")) return "txt";
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "md";
  if (lower.endsWith(".docx")) return "docx";
  throw unsupportedMedia(`Unsupported file type. Supported: ${SUPPORTED_LABEL}.`);
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function textToHtml(text: string): string {
  const paragraphs = text.replace(/\r\n?/g, "\n").split(/\n\s*\n/);
  return paragraphs
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function markdownToHtml(md: string): string {
  return marked.parse(md, { async: false, gfm: true }) as string;
}

export async function docxToHtml(buffer: Buffer): Promise<string> {
  // Word files are zip archives: cheap magic-byte check before handing to mammoth.
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw badRequest("This file is not a valid .docx document.");
  }
  try {
    const result = await mammoth.convertToHtml({ buffer }, { styleMap: ["u => u"] });
    return result.value;
  } catch {
    throw badRequest("Could not read this .docx file. It may be corrupted or password-protected.");
  }
}

/** HTML -> editor JSON. Anything outside our schema (scripts, images, tables...) is dropped. */
export function htmlToDoc(html: string): JSONContent {
  const json = generateJSON(html || "<p></p>", baseExtensions);
  return validateContent(json);
}

function titleFrom(filename: string, kind: Kind, text?: string): string {
  if (kind === "md" && text) {
    const h1 = text.match(/^#\s+(.+)$/m);
    if (h1) return h1[1].trim().slice(0, 200);
  }
  const base = filename.replace(/\.[^.]+$/, "").trim();
  return (base || "Imported document").slice(0, 200);
}

export async function importFile(
  filename: string,
  buffer: Buffer,
): Promise<{ title: string; content: JSONContent }> {
  if (buffer.length === 0) throw badRequest("The file is empty.");
  if (buffer.length > MAX_IMPORT_BYTES) throw payloadTooLarge("File is larger than the 4 MB limit.");
  const kind = detectKind(filename);

  if (kind === "docx") {
    const html = await docxToHtml(buffer);
    return { title: titleFrom(filename, kind), content: htmlToDoc(html) };
  }

  if (buffer.includes(0)) throw badRequest("This doesn't look like a text file.");
  const text = buffer.toString("utf8").replace(/^﻿/, "");
  const html = kind === "md" ? markdownToHtml(text) : textToHtml(text);
  return { title: titleFrom(filename, kind, text), content: htmlToDoc(html) };
}
