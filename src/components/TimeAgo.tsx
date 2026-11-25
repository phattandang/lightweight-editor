"use client";

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function formatRelative(iso: string | Date) {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const diff = (date.getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 45) return "just now";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), "day");
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function TimeAgo({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} title={new Date(iso).toLocaleString()} suppressHydrationWarning>
      {formatRelative(iso)}
    </time>
  );
}
