export function RoleBadge({ role }: { role: "owner" | "viewer" | "editor" }) {
  if (role === "owner")
    return (
      <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">Owner</span>
    );
  return role === "editor" ? (
    <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Can edit</span>
  ) : (
    <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">View only</span>
  );
}
