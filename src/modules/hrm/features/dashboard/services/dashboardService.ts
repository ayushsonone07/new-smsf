import { hrApiGet } from "@shared/services";

export interface KpiResponse {
  totalCandidates: number;
  addedToday: number;
  addedThisWeek: number;
  addedThisMonth: number;
  monthOverMonthGrowthPct: number;
  topSource: { source: string; count: number; pct: number } | null;
  activeSources: number;
  phoneDuplicates: number;
  withRemarksPct: number;
  updatedLast7Days: number;
}

export interface SourceBreakdownPoint {
  source: string;
  count: number;
  pct: number;
}

export interface CumulativeGrowthPoint {
  date: string;
  total: number;
}

export interface ChartsResponse {
  dailyIntake: { date: string; count: number }[];
  sourceBreakdown: SourceBreakdownPoint[];
  sourceTrend: { month: string; source: string; count: number }[];
  byDayOfWeek: { day: string; count: number }[];
  byHourOfDay: { hour: number; count: number }[];
  cumulativeGrowth: CumulativeGrowthPoint[];
}

export const HR_DASHBOARD_ENDPOINTS = {
  kpis: "/api/v1/hr/dashboard/kpis",
  charts: "/api/v1/hr/dashboard/charts",
} as const;

export const DASHBOARD_ENDPOINTS = {
  admin: "/api/v1/dashboard/admin",
  hrHead: "/api/v1/dashboard/hr_head",
  subHr: "/api/v1/dashboard/sub-hr",
  employee: "/api/v1/dashboard/employee",
} as const;

export interface AdminDashboardCounts {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  totalDepartments: number;
  totalDesignations: number;
  totalCandidates: number;
  openPositions: number;
  pendingLeaveRequests: number;
  approvedLeavesThisMonth: number;
  rejectedLeavesThisMonth: number;
  employeesOnLeaveToday: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  pendingInterviews: number;
  upcomingInterviews: number;
  onboardingsInProgress: number;
}

export interface EmployeeGrowthPoint {
  period: string;
  count: number;
}

export interface AttendanceTrendPoint {
  date: string;
  present: number;
  absent: number;
  late: number;
  onLeave: number;
}

export interface DepartmentDistribution {
  departmentId: number;
  departmentName: string;
  employeeCount: number;
}

export interface RecruitmentFunnelStage {
  stage: string;
  count: number;
}

export interface LeaveStatusDistribution {
  status: string;
  count: number;
}

export interface RecentActivity {
  id: string | number;
  type: string;
  title: string;
  description?: string;
  createdAt: string;
}

export interface UpcomingEvent {
  id: string | number;
  title: string;
  type: string;
  date: string;
}

export interface AdminDashboardResponse {
  generatedAt: string;
  counts: AdminDashboardCounts;
  employeeGrowth: EmployeeGrowthPoint[];
  attendanceTrend: AttendanceTrendPoint[];
  departmentDistribution: DepartmentDistribution[];
  recruitmentFunnel: RecruitmentFunnelStage[];
  leaveStatusDistribution: LeaveStatusDistribution[];
  recentActivities: RecentActivity[];
  upcomingEvents: UpcomingEvent[];
}

/** Response of GET /api/v1/dashboard/hr_head — mirrors AdminDashboardResponse minus employeeGrowth. */
export interface HrHeadDashboardResponse {
  generatedAt: string;
  counts: AdminDashboardCounts;
  attendanceTrend: AttendanceTrendPoint[];
  departmentDistribution: DepartmentDistribution[];
  recruitmentFunnel: RecruitmentFunnelStage[];
  leaveStatusDistribution: LeaveStatusDistribution[];
  recentActivities: RecentActivity[];
  upcomingEvents: UpcomingEvent[];
}

export interface SubHrDashboardCounts {
  accessibleEmployees: number;
  pendingLeaveRequests: number;
  employeesOnLeaveToday: number;
  presentToday: number;
  absentToday: number;
  totalCandidates: number;
  upcomingInterviews: number;
  onboardingInProgress: number;
}

export interface SubHrDashboardResponse {
  generatedAt: string;
  counts: SubHrDashboardCounts;
  recruitmentFunnel: RecruitmentFunnelStage[];
  attendanceTrend: AttendanceTrendPoint[];
  recentActivities: RecentActivity[];
  upcomingEvents: UpcomingEvent[];
}

export interface EmployeeDashboardResponse {
  generatedAt: string;
  employee: { id: number; employeeCode: string; name: string; department?: string; designation?: string };
  counts: {
    presentDaysThisMonth: number; absentDaysThisMonth: number; lateDaysThisMonth: number;
    leaveDaysThisMonth: number; pendingLeaveRequests: number; approvedLeaveRequests: number;
    upcomingInterviews?: number; pendingTasks?: number;
  };
  todayAttendance: { status: string; checkIn?: string; checkOut?: string; workingMinutes?: number } | null;
  leaveBalances: { leaveType: string; total: number; used: number; remaining: number }[];
  attendanceTrend: { date: string; status: string; workingMinutes?: number }[];
  upcomingEvents: UpcomingEvent[];
}

export const dashboardService = {
  async getKpis(): Promise<KpiResponse> {
    return hrApiGet<KpiResponse>(HR_DASHBOARD_ENDPOINTS.kpis);
  },

  async getCharts(): Promise<ChartsResponse> {
    return hrApiGet<ChartsResponse>(HR_DASHBOARD_ENDPOINTS.charts);
  },

  async getAdminDashboard(): Promise<AdminDashboardResponse> {
    return hrApiGet<AdminDashboardResponse>(DASHBOARD_ENDPOINTS.admin);
  },

  async getHrHeadDashboard(): Promise<HrHeadDashboardResponse> {
    return hrApiGet<HrHeadDashboardResponse>(DASHBOARD_ENDPOINTS.hrHead);
  },

  async getSubHrDashboard(): Promise<SubHrDashboardResponse> {
    return hrApiGet<SubHrDashboardResponse>(DASHBOARD_ENDPOINTS.subHr);
  },

  async getEmployeeDashboard(): Promise<EmployeeDashboardResponse> {
    return hrApiGet<EmployeeDashboardResponse>(DASHBOARD_ENDPOINTS.employee);
  },
};
