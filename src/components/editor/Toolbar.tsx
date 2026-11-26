"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import type { ReactNode } from "react";

export function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      block: e.isActive("heading", { level: 1 })
        ? "h1"
        : e.isActive("heading", { level: 2 })
          ? "h2"
          : e.isActive("heading", { level: 3 })
            ? "h3"
            : "p",
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const chain = () => editor.chain().focus();

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap items-center gap-0.5 rounded-2xl border border-border bg-white/90 px-2 py-1.5 shadow-[0_8px_24px_-14px_rgb(79_70_229/0.35)]"
    >
      <Btn label="Undo (Ctrl+Z)" disabled={!s.canUndo} onClick={() => chain().undo().run()}>
        <Icon d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
      </Btn>
      <Btn label="Redo (Ctrl+Y)" disabled={!s.canRedo} onClick={() => chain().redo().run()}>
        <Icon d="m15 14 5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
      </Btn>
      <Sep />
      <select
        aria-label="Text style"
        value={s.block}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "p") chain().setParagraph().run();
          else chain().setHeading({ level: Number(v[1]) as 1 | 2 | 3 }).run();
        }}
        className="h-8 rounded-md bg-transparent px-2 text-sm hover:bg-black/5 focus:outline-none"
      >
        <option value="p">Normal text</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>
      <Sep />
      <Btn label="Bold (Ctrl+B)" active={s.bold} onClick={() => chain().toggleBold().run()}>
        <span className="font-bold">B</span>
      </Btn>
      <Btn label="Italic (Ctrl+I)" active={s.italic} onClick={() => chain().toggleItalic().run()}>
        <span className="font-serif italic">I</span>
      </Btn>
      <Btn label="Underline (Ctrl+U)" active={s.underline} onClick={() => chain().toggleUnderline().run()}>
        <span className="underline">U</span>
      </Btn>
      <Btn label="Strikethrough (Ctrl+Shift+S)" active={s.strike} onClick={() => chain().toggleStrike().run()}>
        <span className="line-through">S</span>
      </Btn>
      <Sep />
      <Btn label="Bulleted list (Ctrl+Shift+8)" active={s.bullet} onClick={() => chain().toggleBulletList().run()}>
        <Icon d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
      </Btn>
      <Btn label="Numbered list (Ctrl+Shift+7)" active={s.ordered} onClick={() => chain().toggleOrderedList().run()}>
        <Icon d="M10 6h10M10 12h10M10 18h10M4 4h1v4M4 8h2M4 14.5a1 1 0 0 1 2 0c0 1-2 1.5-2 3h2" />
      </Btn>
      <Btn label="Quote" active={s.quote} onClick={() => chain().toggleBlockquote().run()}>
        <Icon d="M7 7h4v4c0 3-2 5-4 6M15 7h4v4c0 3-2 5-4 6" />
      </Btn>
      <Btn label="Clear formatting" onClick={() => chain().unsetAllMarks().clearNodes().run()}>
        <Icon d="M6 5h12M12 5 8 19M4 4l16 16" />
      </Btn>
    </div>
  );
}

function Btn(props: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={props.label}
      aria-label={props.label}
      aria-pressed={props.active}
      disabled={props.disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={props.onClick}
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-[15px] disabled:opacity-35 ${
        props.active ? "bg-accent-soft text-accent" : "hover:bg-black/5"
      }`}
    >
      {props.children}
    </button>
  );
}

function Sep() {
  return <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />;
}

function Icon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
