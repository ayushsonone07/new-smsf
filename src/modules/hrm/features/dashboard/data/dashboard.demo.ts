import type {
  EmployeeDashboardResponse,
  HrHeadDashboardResponse,
  SubHrDashboardResponse,
} from "../services/dashboardService";

export const HR_HEAD_DEMO_DATA: HrHeadDashboardResponse = {
  generatedAt: "2026-07-31T16:30:00+05:30",
  counts: {
    totalEmployees: 248,
    activeEmployees: 236,
    inactiveEmployees: 12,
    totalDepartments: 8,
    totalDesignations: 16,
    totalCandidates: 92,
    openPositions: 12,
    pendingLeaveRequests: 3,
    approvedLeavesThisMonth: 28,
    rejectedLeavesThisMonth: 5,
    employeesOnLeaveToday: 9,
    presentToday: 214,
    absentToday: 13,
    lateToday: 3,
    pendingInterviews: 2,
    upcomingInterviews: 6,
    onboardingsInProgress: 8,
  },
  attendanceTrend: [
    { date: "2026-07-25", present: 204, absent: 16, late: 6, onLeave: 8 },
    { date: "2026-07-26", present: 208, absent: 15, late: 5, onLeave: 9 },
    { date: "2026-07-27", present: 211, absent: 13, late: 4, onLeave: 9 },
    { date: "2026-07-28", present: 214, absent: 12, late: 4, onLeave: 9 },
    { date: "2026-07-29", present: 216, absent: 11, late: 3, onLeave: 9 },
    { date: "2026-07-30", present: 218, absent: 10, late: 3, onLeave: 9 },
  ],
  departmentDistribution: [
    { departmentId: 1, departmentName: "Engineering", employeeCount: 68 },
    { departmentId: 2, departmentName: "Sales", employeeCount: 42 },
    { departmentId: 3, departmentName: "Operations", employeeCount: 38 },
    { departmentId: 4, departmentName: "Marketing", employeeCount: 26 },
    { departmentId: 5, departmentName: "Finance", employeeCount: 24 },
    { departmentId: 6, departmentName: "Human Resources", employeeCount: 18 },
  ],
  recruitmentFunnel: [
    { stage: "APPLIED", count: 54 },
    { stage: "SCREENED", count: 22 },
    { stage: "INTERVIEW", count: 12 },
    { stage: "OFFER", count: 3 },
    { stage: "HIRED", count: 1 },
  ],
  leaveStatusDistribution: [
    { status: "PENDING", count: 3 },
    { status: "APPROVED", count: 28 },
    { status: "REJECTED", count: 5 },
  ],
  recentActivities: [
    { id: 1, type: "employee", title: "New employee onboarded", description: "Priya Sharma joined Engineering", createdAt: "2026-07-31T11:20:00+05:30" },
    { id: 2, type: "candidate", title: "Candidate moved to offer", description: "Sourabh Patel · Senior Engineer", createdAt: "2026-07-31T10:05:00+05:30" },
  ],
  upcomingEvents: [
    { id: 1, title: "National Coder's Day", type: "holiday", date: "2026-08-10" },
    { id: 2, title: "Mid-year review", type: "approval", date: "2026-08-04T15:00:00+05:30" },
  ],
};

export const SUB_HR_DEMO_DATA: SubHrDashboardResponse = {
  generatedAt: HR_HEAD_DEMO_DATA.generatedAt,
  counts: {
    accessibleEmployees: 68,
    pendingLeaveRequests: 3,
    employeesOnLeaveToday: 4,
    presentToday: 57,
    absentToday: 3,
    totalCandidates: 34,
    upcomingInterviews: 4,
    onboardingInProgress: 3,
  },
  recruitmentFunnel: HR_HEAD_DEMO_DATA.recruitmentFunnel,
  attendanceTrend: HR_HEAD_DEMO_DATA.attendanceTrend,
  recentActivities: HR_HEAD_DEMO_DATA.recentActivities,
  upcomingEvents: HR_HEAD_DEMO_DATA.upcomingEvents,
};

export const EMPLOYEE_DEMO_DATA: EmployeeDashboardResponse = {
  generatedAt: HR_HEAD_DEMO_DATA.generatedAt,
  employee: {
    id: 42,
    employeeCode: "EMP042",
    name: "Rahul Nair",
    department: "Engineering",
    designation: "Senior Engineer",
  },
  counts: {
    presentDaysThisMonth: 19,
    absentDaysThisMonth: 1,
    lateDaysThisMonth: 2,
    leaveDaysThisMonth: 1,
    pendingLeaveRequests: 1,
    approvedLeaveRequests: 2,
  },
  todayAttendance: { status: "PRESENT", checkIn: "09:12", workingMinutes: 300 },
  leaveBalances: [
    { leaveType: "Casual leave", total: 12, used: 6, remaining: 6 },
    { leaveType: "Sick leave", total: 10, used: 2, remaining: 8 },
    { leaveType: "Earned leave", total: 18, used: 7, remaining: 11 },
    { leaveType: "Comp-offs", total: 4, used: 2, remaining: 2 },
  ],
  attendanceTrend: [
    { date: "2026-07-27", status: "PRESENT", workingMinutes: 544 },
    { date: "2026-07-28", status: "PRESENT", workingMinutes: 532 },
    { date: "2026-07-29", status: "WORK_FROM_HOME", workingMinutes: 520 },
    { date: "2026-07-30", status: "LATE", workingMinutes: 490 },
    { date: "2026-07-31", status: "PRESENT", workingMinutes: 300 },
  ],
  upcomingEvents: HR_HEAD_DEMO_DATA.upcomingEvents,
};
