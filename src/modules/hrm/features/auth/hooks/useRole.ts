import { useAppSelector } from "@app/store";

import { selectAuthRole } from "../store";

import type { Role } from "../types";

/**
 * Returns true if the current user's role matches one of the allowed roles.
 *
 * Reminder: this is a UI hint only — the server is the source of truth.
 * Hiding a button here doesn't protect the endpoint; the backend must
 * re-check the role on every API call.
 */
export function useRole(allowed: Role | Role[]): boolean {
  const role = useAppSelector(selectAuthRole);
  if (!role) return false;
  const list = Array.isArray(allowed) ? allowed : [allowed];
  return list.includes(role);
}
