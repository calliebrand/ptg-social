export type AppRole = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";

export function canEdit(role: AppRole) {
  return role === "OWNER" || role === "ADMIN" || role === "EDITOR";
}

export function canApprove(role: AppRole) {
  return role === "OWNER" || role === "ADMIN";
}

export function canManageUsers(role: AppRole) {
  return role === "OWNER" || role === "ADMIN";
}

export function canAssignRole(actor: AppRole, target: AppRole) {
  if (actor === "OWNER") return true;
  if (actor === "ADMIN") return target !== "OWNER";
  return false;
}

export function isApproverRole(role: string | null | undefined) {
  return role === "OWNER" || role === "ADMIN";
}
