import { matchPath, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@features/auth";
import { PageTransition } from "@shared/components/ui";
import { ROUTES } from "@shared/constants";

import { AppShell } from "./AppShell";

export function AuthenticatedLayout() {
  const { user, logout } = useAuth();
  const topBarUser = user ? { name: user.name, email: user.email, role: user.role } : null;
  const { pathname, search } = useLocation();
  const header = getWorkspaceHeader(pathname, search, user?.role);

  return (
    <AppShell
      user={topBarUser}
      onLogout={() => void logout()}
      title={header.title}
      {...(header.subtitle ? { subtitle: header.subtitle } : {})}
    >
      <PageTransition>
        <Outlet />
      </PageTransition>
    </AppShell>
  );
}

const ROUTE_TITLES: { path: string; title: string; subtitle: string }[] = [
  { path: ROUTES.dashboard, title: "Dashboard", subtitle: "Your HRM overview" },
  { path: ROUTES.myTasks, title: "My Tasks", subtitle: "Your assigned tasks" },
  { path: ROUTES.employees, title: "Employees", subtitle: "Employee directory and records" },
  {
    path: ROUTES.employeeProfile,
    title: "Employee Profile",
    subtitle: "Employee details and information",
  },
  { path: ROUTES.departments, title: "Departments", subtitle: "Organisation structure and teams" },
  { path: ROUTES.designations, title: "Designations", subtitle: "Roles and job titles" },
  {
    path: ROUTES.candidates,
    title: "Candidates",
    subtitle: "Candidate directory and recruiting pipeline",
  },
  { path: ROUTES.interviews, title: "Interviews", subtitle: "Candidate interview scheduling" },
  { path: ROUTES.onboarding, title: "Onboarding", subtitle: "New employee onboarding workflow" },
  { path: ROUTES.attendance, title: "Attendance", subtitle: "Daily attendance and work hours" },
  {
    path: ROUTES.timeAttendanceOverview,
    title: "Time & Attendance",
    subtitle: "Workforce attendance overview",
  },
  { path: ROUTES.leave, title: "Leave", subtitle: "Leave requests and approvals" },
  { path: ROUTES.holidays, title: "Holidays", subtitle: "Company holidays and observances" },
  {
    path: ROUTES.announcements,
    title: "Announcements",
    subtitle: "Company announcements and updates",
  },
  {
    path: ROUTES.notifications,
    title: "Notifications",
    subtitle: "Updates, announcements and approvals",
  },

  { path: ROUTES.performance, title: "Performance", subtitle: "Reviews and employee growth" },
  { path: ROUTES.reports, title: "Reports", subtitle: "Organisation reports and insights" },
  { path: ROUTES.settings, title: "Settings", subtitle: "Workspace preferences and access" },
  {
    path: ROUTES.updateProfile,
    title: "Update Profile",
    subtitle: "Your personal account settings",
  },
  {
    path: ROUTES.adminRoles,
    title: "Role-based Access",
    subtitle: "Permissions and access control",
  },
  { path: ROUTES.adminAuditLogs, title: "Audit Logs", subtitle: "System activity and audit trail" },
];

const DASHBOARD_HEADERS: Record<string, { title: string; subtitle: string }> = {
  recruitment: { title: "Recruitment", subtitle: "Candidate pipeline and hiring" },
  employees: { title: "People", subtitle: "Workforce directory and structure" },
  attendance: { title: "Time & Attendance", subtitle: "Daily workforce status" },
  performance: { title: "Performance", subtitle: "Reviews and growth insights" },
  analytics: { title: "Analytics", subtitle: "Organisation insights" },
  administration: {
    title: "Administration",
    subtitle: "System and people operations",
  },
};

function getWorkspaceHeader(
  pathname: string,
  search: string,
  role: string | undefined,
): { title: string; subtitle?: string } {
  if (pathname === ROUTES.dashboard) {
    if (role === "HR_HEAD") {
      return { title: "HR Head Dashboard", subtitle: "Organisation-wide overview" };
    }
    if (role === "ADMIN" || role === "HR") {
      const view =
        new URLSearchParams(search).get("view") ??
        (role === "ADMIN" ? "administration" : "recruitment");
      return DASHBOARD_HEADERS[view] ?? DASHBOARD_HEADERS.recruitment!;
    }
    if (role === "SUB_HR") return { title: "Sub-HR Dashboard", subtitle: "Your candidate pipeline" };
    if (role === "MANAGER") {
      return { title: "Manager Dashboard", subtitle: "Self-service and available team shortcuts" };
    }
    return { title: "My Dashboard", subtitle: "Your workspace at a glance" };
  }
  const match = ROUTE_TITLES.find((item) => matchPath({ path: item.path, end: true }, pathname));
  return match
    ? { title: match.title, subtitle: match.subtitle }
    : { title: "HR Workspace", subtitle: "Your HRM workspace" };
}
