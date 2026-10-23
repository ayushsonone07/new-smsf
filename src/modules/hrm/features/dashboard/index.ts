export { RoleDashboardRouter } from "./components/RoleDashboardRouter";
export { TimeAttendanceOverviewPage } from "./pages/TimeAttendanceOverviewPage";
export { useRoleDashboard } from "./hooks/useRoleDashboard";

export {
  getNavigationForRole,
  getVisibleNavigation,
  isGroupItem,
  getActiveGroupLabel,
  ROLE_NAVIGATION,
} from "./config/dashboardNavigation";
export type { NavLeafItem, NavGroupItem, NavigationItem } from "./config/dashboardNavigation";

export { hasPermission, ROLE_PERMISSIONS } from "./config/dashboardPermissions";
export type { Permission } from "./config/dashboardPermissions";

export type { NotificationItem, DashboardKpi } from "./types/dashboard.types";
