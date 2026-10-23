/**
 * Single source of truth for app route paths.
 * Use these constants instead of hard-coded strings so renames are safe.
 */
export const ROUTES = {
  home: "/hrm",
  login: "/hrm/login",
  setPassword: "/hrm/set-password",
  resetPassword: "/hrm/reset-password",
  dashboard: "/hrm/dashboard",
  myTasks: "/hrm/my-tasks",
  employees: "/hrm/employees",
  employeeProfile: "/hrm/employees/:employeeId",
  employeeAttendanceHistory: "/hrm/employees/:employeeId/attendance-history",
  candidates: "/hrm/candidates",
  interviews: "/hrm/interviews",
  jobs: "/hrm/jobs",
  offers: "/hrm/offers",
  onboarding: "/hrm/onboarding",
  departments: "/hrm/departments",
  designations: "/hrm/designations",
  attendance: "/hrm/attendance",
  timeAttendanceOverview: "/hrm/time-attendance/overview",
  leave: "/hrm/leave",
  holidays: "/hrm/holidays",
  payroll: "/hrm/payroll",
  payslips: "/hrm/payslips",
  shifts: "/hrm/shifts",

  performance: "/hrm/performance",
  performanceGoals: "/hrm/performance/goals",
  performanceReviews: "/hrm/performance/reviews",
  reports: "/hrm/reports",
  announcements: "/hrm/announcements",
  notifications: "/hrm/notifications",
  documents: "/hrm/documents",
  help: "/hrm/help",
  settings: "/hrm/settings",
  updateProfile: "/hrm/profile/update",
  adminRoles: "/hrm/admin/roles",
  adminHrUsers: "/hrm/admin/hr-users",
  adminAuditLogs: "/hrm/admin/audit-logs",
  employeeOnboarding: "/hrm/employees/:employeeId/onboarding",
  publicOnboarding: "/hrm/onboarding/:token",
  forbidden: "/hrm/403",
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

/**
 * ROUTES ke paths "/hrm" se shuru hote hain. Nested <Routes> (CRM ke /hrm/* ke andar)
 * parent wala hissa pehle hi hata deta hai, isliye <Route path> ke liye prefix hatana padta hai.
 */
export const HRM_BASE = "/hrm";
export const rel = (path: string): string => path.slice(HRM_BASE.length) || "/";
