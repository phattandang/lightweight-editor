/**
 * Access policy: the single place that decides who may do what to a document.
 * Kept pure (no I/O) so it is trivially unit-testable.
 */
export type Role = "owner" | "editor" | "viewer";
export type Action = "read" | "edit" | "rename" | "share" | "delete";

const PERMISSIONS: Record<Role, readonly Action[]> = {
  owner: ["read", "edit", "rename", "share", "delete"],
  editor: ["read", "edit", "rename"],
  viewer: ["read"],
};

export function can(role: Role | null | undefined, action: Action): boolean {
  if (!role) return false;
  return PERMISSIONS[role].includes(action);
}

/** Owner wins over any share row; otherwise the share's role; otherwise no access. */
export function resolveRole(
  userId: string,
  doc: { ownerId: string },
  share?: { role: "viewer" | "editor" } | null,
): Role | null {
  if (doc.ownerId === userId) return "owner";
  return share?.role ?? null;
}
