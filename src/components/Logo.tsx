export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold text-foreground ${className}`}>
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#1a73e8" />
        <path d="M14 2v6h6" fill="#8ab4f8" />
        <path d="M8 13h8M8 16.5h8M8 9.5h3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      Lightweight Editor
    </span>
  );
}
