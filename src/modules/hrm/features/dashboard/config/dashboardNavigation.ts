import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardList,
  Clock,
  FileText,
  Handshake,
  HelpCircle,
  LayoutDashboard,
  Medal,
  PiggyBank,
  Receipt,
  Settings,
  Shield,
  Trophy,
  UserCheck,
  UsersRound,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

import type { Role } from "@features/auth";

import { hasPermission, type Permission } from "./dashboardPermissions";

export interface NavLeafItem {
  type: "leaf";
  label: string;
  icon: LucideIcon;
  to?: string;
  comingSoon?: boolean;
  permission?: Permission;
}

export interface NavGroupItem {
  type: "group";
  label: string;
  icon: LucideIcon;
  children: NavLeafItem[];
}

export type NavigationItem = NavLeafItem | NavGroupItem;

export const ROLE_NAVIGATION = {
  ADMIN: [
    { type: "leaf" as const, label: "Dashboard", icon: LayoutDashboard, to: "/hrm/dashboard" },
    {
      type: "group" as const,
      label: "Employees",
      icon: UsersRound,
      children: [
        {
          type: "leaf" as const,
          label: "Employees",
          icon: UsersRound,
          to: "/hrm/employees",
          permission: "employee:directory",
        },
        {
          type: "leaf" as const,
          label: "Departments",
          icon: Building2,
          to: "/hrm/departments",
          permission: "department:manage",
        },
        {
          type: "leaf" as const,
          label: "Designations",
          icon: Briefcase,
          to: "/hrm/designations",
          permission: "designation:manage",
        },
      ],
    },
    {
      type: "group" as const,
      label: "Recruitment",
      icon: UserPlus,
      children: [
        {
          type: "leaf" as const,
          label: "Candidates",
          icon: UserCheck,
          to: "/hrm/candidates",
          permission: "candidate:view",
        },
        {
          type: "leaf" as const,
          label: "Interviews",
          icon: CalendarDays,
          to: "/hrm/interviews",
          permission: "recruitment:view",
        },
        {
          type: "leaf" as const,
          label: "Onboarding",
          icon: Handshake,
          to: "/hrm/onboarding",
          permission: "onboarding:manage",
        },
      ],
    },
    {
      type: "group" as const,
      label: "Time & Attendance",
      icon: Clock,
      children: [
        {
          type: "leaf" as const,
          label: "Attendance",
          icon: Clock,
          to: "/hrm/attendance",
          permission: "attendance:view_all",
        },
        {
          type: "leaf" as const,
          label: "Leave",
          icon: CalendarDays,
          to: "/hrm/leave",
          permission: "leave:view_all",
        },
        { type: "leaf" as const, label: "Holidays", icon: Trophy, to: "/hrm/holidays" },
      ],
    },
    {
      type: "group" as const,
      label: "Payroll",
      icon: PiggyBank,
      children: [
        {
          type: "leaf" as const,
          label: "Payroll",
          icon: PiggyBank,
          to: "/hrm/payroll",
          permission: "payroll:view_all",
        },
        {
          type: "leaf" as const,
          label: "Payslips",
          icon: Receipt,
          to: "/hrm/payslips",
          permission: "payroll:view_all",
        },
      ],
    },
    {
      type: "group" as const,
      label: "Performance",
      icon: Medal,
      children: [
        {
          type: "leaf" as const,
          label: "Performance",
          icon: Medal,
          to: "/hrm/performance",
          permission: "performance:view",
        },
      ],
    },
    {
      type: "group" as const,
      label: "Analytics",
      icon: BarChart3,
      children: [
        {
          type: "leaf" as const,
          label: "Reports",
          icon: BarChart3,
          to: "/hrm/reports",
          permission: "reports:view_all",
        },
      ],
    },
    {
      type: "group" as const,
      label: "Administration",
      icon: Shield,
      children: [
        {
          type: "leaf" as const,
          label: "Settings",
          icon: Settings,
          to: "/hrm/settings",
          permission: "settings:manage",
        },
        {
          type: "leaf" as const,
          label: "Audit Logs",
          icon: FileText,
          to: "/hrm/admin/audit-logs",
          permission: "audit:view",
        },
        {
          type: "leaf" as const,
          label: "Announcements",
          icon: Bell,
          to: "/hrm/announcements",
          permission: "announcements:view",
        },
      ],
    },
  ],
  HR_HEAD: [
    { type: "leaf" as const, label: "Dashboard", icon: LayoutDashboard, to: "/hrm/dashboard" },
    {
      type: "group" as const,
      label: "Employees",
      icon: UsersRound,
      children: [
        {
          type: "leaf" as const,
          label: "Employees",
          icon: UsersRound,
          to: "/hrm/employees",
          permission: "employee:directory",
        },
        {
          type: "leaf" as const,
          label: "Departments",
          icon: Building2,
          to: "/hrm/departments",
          permission: "department:manage",
        },
        {
          type: "leaf" as const,
          label: "Designations",
          icon: Briefcase,
          to: "/hrm/designations",
          permission: "designation:manage",
        },
      ],
    },
    {
      type: "group" as const,
      label: "Recruitment",
      icon: UserPlus,
      children: [
        {
          type: "leaf" as const,
          label: "Candidates",
          icon: UserCheck,
          to: "/hrm/candidates",
          permission: "candidate:view",
        },
        {
          type: "leaf" as const,
          label: "Interviews",
          icon: CalendarDays,
          to: "/hrm/interviews",
          permission: "recruitment:view",
        },
        {
          type: "leaf" as const,
          label: "Onboarding",
          icon: Handshake,
          to: "/hrm/onboarding",
          permission: "onboarding:manage",
        },
      ],
    },
    {
      type: "group" as const,
      label: "Time & Attendance",
      icon: Clock,
      children: [
        {
          type: "leaf" as const,
          label: "Attendance",
          icon: Clock,
          to: "/hrm/attendance",
          permission: "attendance:view_all",
        },
        {
          type: "leaf" as const,
          label: "Leave",
          icon: CalendarDays,
          to: "/hrm/leave",
          permission: "leave:view_all",
        },
        { type: "leaf" as const, label: "Holidays", icon: Trophy, to: "/hrm/holidays" },
      ],
    },
    {
      type: "group" as const,
      label: "Payroll",
      icon: PiggyBank,
      children: [
        {
          type: "leaf" as const,
          label: "Payroll",
          icon: PiggyBank,
          to: "/hrm/payroll",
          permission: "payroll:view_all",
        },
        {
          type: "leaf" as const,
          label: "Payslips",
          icon: Receipt,
          to: "/hrm/payslips",
          permission: "payroll:view_all",
        },
      ],
    },
    {
      type: "group" as const,
      label: "Performance",
      icon: Medal,
      children: [
        {
          type: "leaf" as const,
          label: "Performance",
          icon: Medal,
          to: "/hrm/performance",
          permission: "performance:view",
        },
      ],
    },
    {
      type: "group" as const,
      label: "Analytics",
      icon: BarChart3,
      children: [
        {
          type: "leaf" as const,
          label: "Reports",
          icon: BarChart3,
          to: "/hrm/reports",
          permission: "reports:view_all",
        },
      ],
    },
    {
      type: "group" as const,
      label: "Administration",
      icon: Shield,
      children: [
        {
          type: "leaf" as const,
          label: "Settings",
          icon: Settings,
          to: "/hrm/settings",
          permission: "settings:manage",
        },
        {
          type: "leaf" as const,
          label: "Announcements",
          icon: Bell,
          to: "/hrm/announcements",
          permission: "announcements:view",
        },
      ],
    },
  ],
  HR: [
    { type: "leaf" as const, label: "Dashboard", icon: LayoutDashboard, to: "/hrm/dashboard" },
    {
      type: "group" as const,
      label: "Recruitment",
      icon: UserPlus,
      children: [
        {
          type: "leaf" as const,
          label: "Candidates",
          icon: UserCheck,
          to: "/hrm/candidates",
          permission: "candidate:view",
        },
        {
          type: "leaf" as const,
          label: "Interviews",
          icon: CalendarDays,
          to: "/hrm/interviews",
          permission: "recruitment:view",
        },
        {
          type: "leaf" as const,
          label: "Onboarding",
          icon: Handshake,
          to: "/hrm/onboarding",
          permission: "onboarding:manage",
        },
      ],
    },
    {
      type: "group" as const,
      label: "Employees",
      icon: UsersRound,
      children: [
        {
          type: "leaf" as const,
          label: "All Employees",
          icon: UsersRound,
          to: "/hrm/employees",
          permission: "employee:directory",
        },
        {
          type: "leaf" as const,
          label: "Departments",
          icon: Building2,
          to: "/hrm/departments",
          permission: "department:manage",
        },
        {
          type: "leaf" as const,
          label: "Designations",
          icon: Briefcase,
          to: "/hrm/designations",
          permission: "designation:manage",
        },
      ],
    },
    {
      type: "group" as const,
      label: "Time & Attendance",
      icon: Clock,
      children: [
        {
          type: "leaf" as const,
          label: "Attendance",
          icon: Clock,
          to: "/hrm/attendance",
          permission: "attendance:view_all",
        },
        {
          type: "leaf" as const,
          label: "Leave",
          icon: CalendarDays,
          to: "/hrm/leave",
          permission: "leave:view_all",
        },
        { type: "leaf" as const, label: "Holidays", icon: Trophy, to: "/hrm/holidays" },
      ],
    },
    {
      type: "group" as const,
      label: "Payroll",
      icon: PiggyBank,
      children: [
        {
          type: "leaf" as const,
          label: "Payroll",
          icon: PiggyBank,
          to: "/hrm/payroll",
          permission: "payroll:view_all",
        },
        {
          type: "leaf" as const,
          label: "Payslips",
          icon: Receipt,
          to: "/hrm/payslips",
          permission: "payroll:view_all",
        },
      ],
    },
    {
      type: "group" as const,
      label: "Performance",
      icon: Medal,
      children: [
        {
          type: "leaf" as const,
          label: "Performance",
          icon: Medal,
          to: "/hrm/performance",
          permission: "performance:view",
        },
      ],
    },
    {
      type: "group" as const,
      label: "Analytics",
      icon: BarChart3,
      children: [
        {
          type: "leaf" as const,
          label: "Reports",
          icon: BarChart3,
          to: "/hrm/reports",
          permission: "reports:view_all",
        },
      ],
    },
    {
      type: "group" as const,
      label: "Administration",
      icon: Settings,
      children: [
        {
          type: "leaf" as const,
          label: "Settings",
          icon: Settings,
          to: "/hrm/settings",
          permission: "settings:manage",
        },
        {
          type: "leaf" as const,
          label: "Announcements",
          icon: Bell,
          to: "/hrm/announcements",
          permission: "announcements:view",
        },
      ],
    },
  ],
  SUB_HR: [
    { type: "leaf" as const, label: "Dashboard", icon: LayoutDashboard, to: "/hrm/dashboard" },
    {
      type: "group" as const,
      label: "Recruitment",
      icon: UserPlus,
      children: [
        {
          type: "leaf" as const,
          label: "Candidates",
          icon: UserCheck,
          to: "/hrm/candidates",
          permission: "candidate:view",
        },
        {
          type: "leaf" as const,
          label: "Interviews",
          icon: CalendarDays,
          to: "/hrm/interviews",
          permission: "recruitment:view",
        },
        {
          type: "leaf" as const,
          label: "Onboarding Tasks",
          icon: Handshake,
          to: "/hrm/onboarding",
          permission: "onboarding:manage",
        },
      ],
    },
    {
      type: "group" as const,
      label: "Employees",
      icon: UsersRound,
      children: [
        {
          type: "leaf" as const,
          label: "Employee",
          icon: UsersRound,
          to: "/hrm/employees",
          permission: "employee:directory",
        },
        {
          type: "leaf" as const,
          label: "Departments",
          icon: Building2,
          to: "/hrm/departments",
          permission: "department:manage",
        },
        {
          type: "leaf" as const,
          label: "Designations",
          icon: Briefcase,
          to: "/hrm/designations",
          permission: "designation:manage",
        },
      ],
    },
    {
      type: "group" as const,
      label: "Time & Attendance",
      icon: Clock,
      children: [
        {
          type: "leaf" as const,
          label: "Attendance",
          icon: Clock,
          to: "/hrm/attendance",
          permission: "attendance:view_all",
        },
        {
          type: "leaf" as const,
          label: "Leave",
          icon: CalendarDays,
          to: "/hrm/leave",
          permission: "leave:view_all",
        },
        { type: "leaf" as const, label: "Holidays", icon: Trophy, to: "/hrm/holidays" },
      ],
    },
   {
  type: "group" as const,
  label: "My Finance",
  icon: PiggyBank,
  children: [
    {
      type: "leaf" as const,
      label: "Payslips",
      icon: Receipt,
      to: "/hrm/payslips",
      permission: "payroll:view_self",
    },
  ],
},
    {
      type: "group" as const,
      label: "Performance",
      icon: Medal,
      children: [
        {
          type: "leaf" as const,
          label: "Performance",
          icon: Medal,
          to: "/hrm/performance",
          permission: "performance:view",
        },
      ],
    },
    {
      type: "group" as const,
      label: "Reports",
      icon: BarChart3,
      children: [
        {
          type: "leaf" as const,
          label: "Reports",
          icon: BarChart3,
          to: "/hrm/reports",
          permission: "reports:view_limited",
        },
      ],
    },
    {
      type: "group" as const,
      label: "Resources",
      icon: Bell,
      children: [
        {
          type: "leaf" as const,
          label: "Announcements",
          icon: Bell,
          to: "/hrm/announcements",
          permission: "announcements:view",
        },
      ],
    },

  ],
  MANAGER: [
    { type: "leaf" as const, label: "Home", icon: LayoutDashboard, to: "/hrm/dashboard" },
    {
      type: "group" as const,
      label: "My Team",
      icon: UsersRound,
      children: [
        {
          type: "leaf" as const,
          label: "Attendance",
          icon: Clock,
          to: "/hrm/attendance",
          permission: "attendance:view_self",
        },
        {
          type: "leaf" as const,
          label: "Leave",
          icon: CalendarDays,
          to: "/hrm/leave",
          permission: "leave:view_self",
        },
        { type: "leaf" as const, label: "Holidays", icon: Trophy, to: "/hrm/holidays" },
      ],
    },
    {
      type: "group" as const,
      label: "Self Service",
      icon: Medal,
      children: [
        {
          type: "leaf" as const,
          label: "Payslips",
          icon: Receipt,
          to: "/hrm/payslips",
          permission: "payroll:view_self",
        },
        {
          type: "leaf" as const,
          label: "Performance",
          icon: Medal,
          to: "/hrm/performance",
          permission: "performance:view",
        },
      ],
    },
    {
      type: "group" as const,
      label: "Resources",
      icon: Bell,
      children: [
        {
          type: "leaf" as const,
          label: "Announcements",
          icon: Bell,
          to: "/hrm/announcements",
          permission: "announcements:view",
        },
        { type: "leaf" as const, label: "Help & Support", icon: HelpCircle, to: "/hrm/help" },
      ],
    },
  ],
  EMPLOYEE: [
    { type: "leaf" as const, label: "Home", icon: LayoutDashboard, to: "/hrm/dashboard" },
    { type: "leaf" as const, label: "My Tasks", icon: ClipboardList, to: "/hrm/my-tasks" },
    {
      type: "group" as const,
      label: "My Time",
      icon: Clock,
      children: [
        {
          type: "leaf" as const,
          label: "Attendance",
          icon: Clock,
          to: "/hrm/attendance",
          permission: "attendance:view_self",
        },
        {
          type: "leaf" as const,
          label: "Leave",
          icon: CalendarDays,
          to: "/hrm/leave",
          permission: "leave:view_self",
        },
        { type: "leaf" as const, label: "Holidays", icon: Trophy, to: "/hrm/holidays" },
      ],
    },
    {
      type: "group" as const,
      label: "My Finance",
      icon: PiggyBank,
      children: [
        {
          type: "leaf" as const,
          label: "Payslips",
          icon: Receipt,
          to: "/hrm/payslips",
          permission: "payroll:view_self",
        },
      ],
    },

    {
      type: "group" as const,
      label: "My Growth",
      icon: Medal,
      children: [
        {
          type: "leaf" as const,
          label: "Performance",
          icon: Medal,
          to: "/hrm/performance",
          permission: "performance:view",
        },
      ],
    },
    {
      type: "group" as const,
      label: "Resources",
      icon: Bell,
      children: [
        {
          type: "leaf" as const,
          label: "Announcements",
          icon: Bell,
          to: "/hrm/announcements",
          permission: "announcements:view",
        },
        { type: "leaf" as const, label: "Documents", icon: FileText, to: "/hrm/documents" },
        { type: "leaf" as const, label: "Help & Support", icon: HelpCircle, to: "/hrm/help" },
      ],
    },
  ],
} satisfies Record<Role, NavigationItem[]>;

export function getNavigationForRole(role: Role | null): NavigationItem[] {
  if (!role || !ROLE_NAVIGATION[role]) return [];
  return ROLE_NAVIGATION[role];
}

export function isNavigationPathActive(itemPath: string, pathname: string): boolean {
  if (itemPath === "/hrm/dashboard") {
    return pathname === itemPath;
  }
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

export function getVisibleNavigation(role: Role | null): NavigationItem[] {
  if (!role || !ROLE_NAVIGATION[role]) return [];
  return ROLE_NAVIGATION[role].reduce<NavigationItem[]>((acc, item) => {
    if (item.type === "group") {
      const children = item.children.filter(
        (child) => !child.permission || hasPermission(role, child.permission),
      );
      if (children.length > 0) acc.push({ ...item, children });
    } else {
      acc.push(item);
    }
    return acc;
  }, []);
}

export function isGroupItem(item: NavigationItem): item is NavGroupItem {
  return item.type === "group";
}

export function getActiveGroupLabel(items: NavigationItem[], pathname: string): string | null {
  for (const item of items) {
    if (item.type === "group") {
      for (const child of item.children) {
        if (child.to && isNavigationPathActive(child.to, pathname)) return item.label;
      }
    }
  }
  return null;
}
