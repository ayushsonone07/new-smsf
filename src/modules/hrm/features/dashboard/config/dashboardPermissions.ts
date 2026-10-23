import type { Role } from "@features/auth";

export type Permission =
  | "employee:view"
  | "employee:directory"
  | "employee:create"
  | "employee:update"
  | "employee:delete"
  | "candidate:view"
  | "candidate:create"
  | "candidate:update"
  | "candidate:delete"
  | "department:manage"
  | "designation:manage"
  | "attendance:view_all"
  | "attendance:view_self"
  | "attendance:manage"
  | "leave:view_all"
  | "leave:view_self"
  | "leave:approve"
  | "payroll:view_all"
  | "payroll:view_self"
  | "payroll:manage"

  | "reports:view_all"
  | "reports:view_limited"
  | "settings:manage"
  | "roles:manage"
  | "audit:view"
  | "recruitment:view"
  | "onboarding:manage"
  | "performance:view"
  | "announcements:view";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  HR_HEAD: [
    "employee:view",
    "employee:directory",
    "employee:create",
    "employee:update",
    "candidate:view",
    "candidate:create",
    "candidate:update",
    "candidate:delete",
    "department:manage",
    "designation:manage",
    "attendance:view_all",
    "attendance:view_self",
    "attendance:manage",
    "leave:view_all",
    "leave:view_self",
    "payroll:view_self",
    "leave:approve",
    "payroll:view_all",

    "reports:view_all",
    "reports:view_limited",
    "settings:manage",
    "recruitment:view",
    "onboarding:manage",
    "performance:view",
    "announcements:view",
  ],
  ADMIN: [
    "employee:view",
    "employee:directory",
    "employee:create",
    "employee:update",
    "employee:delete",
    "candidate:view",
    "candidate:create",
    "candidate:update",
    "candidate:delete",
    "department:manage",
    "designation:manage",
    "attendance:view_all",
    "attendance:view_self",
    "attendance:manage",
    "leave:view_all",
    "leave:view_self",
    "payroll:view_self",
    "leave:approve",
    "payroll:view_all",

    "reports:view_all",
    "settings:manage",
    "roles:manage",
    "audit:view",
    "recruitment:view",
    "onboarding:manage",
    "performance:view",
    "announcements:view",
  ],
  HR: [
    "employee:view",
    "employee:directory",
    "employee:create",
    "employee:update",
    "candidate:view",
    "candidate:create",
    "candidate:update",
    "candidate:delete",
    "department:manage",
    "designation:manage",
    "attendance:view_all",
    "attendance:view_self",
    "attendance:manage",
    "leave:view_all",
    "leave:view_self",
    "payroll:view_self",
    "leave:approve",
    "payroll:view_all",

    "reports:view_all",
    "recruitment:view",
    "onboarding:manage",
    "performance:view",
    "announcements:view",
  ],
  SUB_HR: [
    "employee:view",
    "employee:directory",
    "employee:create",
    "employee:update",
    "candidate:view",
    "candidate:create",
    "candidate:update",
    "candidate:delete",
    "department:manage",
    "designation:manage",
    "attendance:view_all",
    "attendance:view_self",
    "attendance:manage",
    "leave:view_all",
    "leave:view_self",
    "leave:approve",
    "payroll:view_self",
    

    "reports:view_limited",
    "recruitment:view",
    "onboarding:manage",
    "performance:view",
    "announcements:view",
  ],
  MANAGER: [
    "employee:view",
    "attendance:view_all",
    "attendance:view_self",
    "leave:view_all",
    "leave:view_self",
    "payroll:view_self",

    "reports:view_limited",
    "performance:view",
    "announcements:view",
  ],
  EMPLOYEE: [
    "employee:view",
    "attendance:view_self",
    "leave:view_self",
    "payroll:view_self",

    "reports:view_limited",
    "performance:view",
    "announcements:view",
  ],
};

export function hasPermission(role: Role | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
