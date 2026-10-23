import { env } from "@config/env";

import type {
  DashboardActivity,
  DashboardEvent,
  DashboardKpi,
  EmployeeGrowthPoint,
  AttendanceTrendPoint,
  DepartmentDistribution,
  GenderDistribution,
  RecruitmentFunnel,
  HiringTrendPoint,
  LeaveTrendPoint,
  CandidateSource,
  OnboardingProgress,
  NotificationItem,
} from "../types/dashboard.types";

const isDemo = env.enableDashboardDemo;

const EMPTY_KPIS: DashboardKpi = {
  totalEmployees: 0,
  activeEmployees: 0,
  newJoiners: 0,
  onProbation: 0,
  presentToday: 0,
  absentToday: 0,
  lateToday: 0,
  onLeaveToday: 0,
  openPositions: 0,
  activeCandidates: 0,
  pendingApprovals: 0,
  candidatesAddedToday: 0,
  interviewsToday: 0,
  offersPending: 0,
  assignedCandidates: 0,
  followUpsDue: 0,
  pendingOnboardingTasks: 0,
  documentsToVerify: 0,
  attendanceCorrections: 0,
  leaveBalance: 0,
  workedHours: 0,
  monthlyAttendancePct: 0,
  lateArrivals: 0,
};

const DEMO_KPIS: DashboardKpi = {
  totalEmployees: 248,
  activeEmployees: 224,
  newJoiners: 12,
  onProbation: 18,
  presentToday: 198,
  absentToday: 14,
  lateToday: 8,
  onLeaveToday: 16,
  openPositions: 24,
  activeCandidates: 156,
  pendingApprovals: 7,
  candidatesAddedToday: 8,
  interviewsToday: 6,
  offersPending: 4,
  assignedCandidates: 42,
  followUpsDue: 15,
  pendingOnboardingTasks: 9,
  documentsToVerify: 11,
  attendanceCorrections: 3,
  leaveBalance: 14,
  workedHours: 164,
  monthlyAttendancePct: 94,
  lateArrivals: 5,
};

export const MOCK_KPIS: DashboardKpi = isDemo ? DEMO_KPIS : EMPTY_KPIS;

const EMPTY_EMPLOYEE_GROWTH: EmployeeGrowthPoint[] = [];

const DEMO_EMPLOYEE_GROWTH: EmployeeGrowthPoint[] = [
  { month: "Jan", total: 180, newJoiners: 5 },
  { month: "Feb", total: 186, newJoiners: 8 },
  { month: "Mar", total: 192, newJoiners: 7 },
  { month: "Apr", total: 201, newJoiners: 10 },
  { month: "May", total: 210, newJoiners: 9 },
  { month: "Jun", total: 218, newJoiners: 11 },
  { month: "Jul", total: 224, newJoiners: 8 },
  { month: "Aug", total: 230, newJoiners: 6 },
  { month: "Sep", total: 235, newJoiners: 7 },
  { month: "Oct", total: 240, newJoiners: 5 },
  { month: "Nov", total: 245, newJoiners: 9 },
  { month: "Dec", total: 248, newJoiners: 4 },
];

export const MOCK_EMPLOYEE_GROWTH: EmployeeGrowthPoint[] = isDemo
  ? DEMO_EMPLOYEE_GROWTH
  : EMPTY_EMPLOYEE_GROWTH;

const EMPTY_ATTENDANCE_TREND: AttendanceTrendPoint[] = [];

const DEMO_ATTENDANCE_TREND: AttendanceTrendPoint[] = [
  { date: "Mon", present: 195, absent: 12, late: 6, leave: 14 },
  { date: "Tue", present: 198, absent: 10, late: 8, leave: 12 },
  { date: "Wed", present: 192, absent: 14, late: 5, leave: 16 },
  { date: "Thu", present: 200, absent: 8, late: 7, leave: 13 },
  { date: "Fri", present: 188, absent: 16, late: 9, leave: 15 },
];

export const MOCK_ATTENDANCE_TREND: AttendanceTrendPoint[] = isDemo
  ? DEMO_ATTENDANCE_TREND
  : EMPTY_ATTENDANCE_TREND;

const EMPTY_DEPARTMENT_DISTRIBUTION: DepartmentDistribution[] = [];

const DEMO_DEPARTMENT_DISTRIBUTION: DepartmentDistribution[] = [
  { name: "Engineering", value: 85, color: "#3b82f6" },
  { name: "Marketing", value: 32, color: "#10b981" },
  { name: "Sales", value: 45, color: "#f59e0b" },
  { name: "HR", value: 18, color: "#8b5cf6" },
  { name: "Finance", value: 22, color: "#ec4899" },
  { name: "Operations", value: 46, color: "#06b6d4" },
];

export const MOCK_DEPARTMENT_DISTRIBUTION: DepartmentDistribution[] = isDemo
  ? DEMO_DEPARTMENT_DISTRIBUTION
  : EMPTY_DEPARTMENT_DISTRIBUTION;

const EMPTY_GENDER_DISTRIBUTION: GenderDistribution[] = [];

const DEMO_GENDER_DISTRIBUTION: GenderDistribution[] = [
  { name: "Male", value: 158, color: "#3b82f6" },
  { name: "Female", value: 82, color: "#ec4899" },
  { name: "Other", value: 8, color: "#8b5cf6" },
];

export const MOCK_GENDER_DISTRIBUTION: GenderDistribution[] = isDemo
  ? DEMO_GENDER_DISTRIBUTION
  : EMPTY_GENDER_DISTRIBUTION;

const EMPTY_RECRUITMENT_FUNNEL: RecruitmentFunnel[] = [];

const DEMO_RECRUITMENT_FUNNEL: RecruitmentFunnel[] = [
  { stage: "Applications", count: 450 },
  { stage: "Screened", count: 280 },
  { stage: "Interviewed", count: 150 },
  { stage: "Offered", count: 45 },
  { stage: "Hired", count: 28 },
];

export const MOCK_RECRUITMENT_FUNNEL: RecruitmentFunnel[] = isDemo
  ? DEMO_RECRUITMENT_FUNNEL
  : EMPTY_RECRUITMENT_FUNNEL;

const EMPTY_HIRING_TREND: HiringTrendPoint[] = [];

const DEMO_HIRING_TREND: HiringTrendPoint[] = [
  { month: "Jan", hired: 4, offers: 6 },
  { month: "Feb", hired: 6, offers: 8 },
  { month: "Mar", hired: 5, offers: 7 },
  { month: "Apr", hired: 8, offers: 11 },
  { month: "May", hired: 7, offers: 9 },
  { month: "Jun", hired: 9, offers: 12 },
  { month: "Jul", hired: 6, offers: 8 },
  { month: "Aug", hired: 5, offers: 7 },
  { month: "Sep", hired: 7, offers: 10 },
];

export const MOCK_HIRING_TREND: HiringTrendPoint[] = isDemo
  ? DEMO_HIRING_TREND
  : EMPTY_HIRING_TREND;

const EMPTY_LEAVE_TREND: LeaveTrendPoint[] = [];

const DEMO_LEAVE_TREND: LeaveTrendPoint[] = [
  { month: "Jan", approved: 22, pending: 8 },
  { month: "Feb", approved: 18, pending: 6 },
  { month: "Mar", approved: 25, pending: 10 },
  { month: "Apr", approved: 20, pending: 7 },
  { month: "May", approved: 28, pending: 12 },
  { month: "Jun", approved: 24, pending: 9 },
];

export const MOCK_LEAVE_TREND: LeaveTrendPoint[] = isDemo ? DEMO_LEAVE_TREND : EMPTY_LEAVE_TREND;

const EMPTY_CANDIDATE_SOURCES: CandidateSource[] = [];

const DEMO_CANDIDATE_SOURCES: CandidateSource[] = [
  { source: "LinkedIn", count: 85 },
  { source: "Naukri", count: 52 },
  { source: "Referral", count: 38 },
  { source: "Walk-in", count: 24 },
  { source: "College", count: 18 },
  { source: "Other", count: 15 },
];

export const MOCK_CANDIDATE_SOURCES: CandidateSource[] = isDemo
  ? DEMO_CANDIDATE_SOURCES
  : EMPTY_CANDIDATE_SOURCES;

const EMPTY_ONBOARDING_PROGRESS: OnboardingProgress[] = [];

const DEMO_ONBOARDING_PROGRESS: OnboardingProgress[] = [
  { stage: "Document Submission", completed: 12, total: 18 },
  { stage: "Verification", completed: 8, total: 12 },
  { stage: "IT Setup", completed: 6, total: 10 },
  { stage: "Orientation", completed: 4, total: 8 },
];

export const MOCK_ONBOARDING_PROGRESS: OnboardingProgress[] = isDemo
  ? DEMO_ONBOARDING_PROGRESS
  : EMPTY_ONBOARDING_PROGRESS;

const EMPTY_ACTIVITIES: DashboardActivity[] = [];
const EMPTY_EVENTS: DashboardEvent[] = [];
const EMPTY_NOTIFICATIONS: NotificationItem[] = [];

const DEMO_ACTIVITIES: DashboardActivity[] = [
  {
    id: "1",
    type: "candidate",
    description: "John Doe was added as candidate",
    timestamp: "2 min ago",
    user: { name: "Priya S." },
  },
  {
    id: "2",
    type: "employee",
    description: "Sarah Chen was onboarded",
    timestamp: "15 min ago",
    user: { name: "Rahul K." },
  },
  {
    id: "3",
    type: "leave",
    description: "Michael Brown applied for sick leave",
    timestamp: "1 hour ago",
    user: { name: "Michael B." },
  },
  {
    id: "4",
    type: "attendance",
    description: "Late arrival recorded for 3 employees",
    timestamp: "2 hours ago",
  },
  {
    id: "5",
    type: "onboarding",
    description: "Onboarding completed for David Wilson",
    timestamp: "3 hours ago",
    user: { name: "Anita D." },
  },
  {
    id: "6",
    type: "general",
    description: "Monthly HR report generated",
    timestamp: "5 hours ago",
    user: { name: "System" },
  },
];

export const MOCK_RECENT_ACTIVITIES: DashboardActivity[] = isDemo
  ? DEMO_ACTIVITIES
  : EMPTY_ACTIVITIES;

const DEMO_HR_ACTIVITIES: DashboardActivity[] = [
  {
    id: "1",
    type: "candidate",
    description: "New application received from Alice Johnson",
    timestamp: "5 min ago",
  },
  {
    id: "2",
    type: "candidate",
    description: "Interview scheduled with Bob Smith",
    timestamp: "30 min ago",
    user: { name: "HR Team" },
  },
  {
    id: "3",
    type: "onboarding",
    description: "Onboarding documents verified for Emma Davis",
    timestamp: "1 hour ago",
    user: { name: "HR Team" },
  },
  {
    id: "4",
    type: "employee",
    description: "New joiner orientation completed for 3 employees",
    timestamp: "2 hours ago",
  },
  {
    id: "5",
    type: "general",
    description: "Leave policy updated for Q3",
    timestamp: "4 hours ago",
    user: { name: "Admin" },
  },
];

export const MOCK_HR_ACTIVITIES: DashboardActivity[] = isDemo
  ? DEMO_HR_ACTIVITIES
  : EMPTY_ACTIVITIES;

const DEMO_SUB_HR_ACTIVITIES: DashboardActivity[] = [
  {
    id: "1",
    type: "candidate",
    description: "Follow-up call completed with Raj Patel",
    timestamp: "10 min ago",
  },
  {
    id: "2",
    type: "candidate",
    description: "Candidate status updated for 2 applicants",
    timestamp: "25 min ago",
  },
  {
    id: "3",
    type: "onboarding",
    description: "Onboarding task verified for Neha Gupta",
    timestamp: "1 hour ago",
  },
  {
    id: "4",
    type: "attendance",
    description: "Attendance correction approved",
    timestamp: "2 hours ago",
  },
];

export const MOCK_SUB_HR_ACTIVITIES: DashboardActivity[] = isDemo
  ? DEMO_SUB_HR_ACTIVITIES
  : EMPTY_ACTIVITIES;

const DEMO_EVENTS: DashboardEvent[] = [
  {
    id: "1",
    title: "Frontend Developer Interview",
    date: "Today, 2:00 PM",
    type: "interview",
    description: "With John Doe via Google Meet",
  },
  { id: "2", title: "Sarah Johnson - Birthday", date: "Tomorrow", type: "birthday" },
  {
    id: "3",
    title: "Rahul Verma - 3 Year Anniversary",
    date: "Jul 25",
    type: "anniversary",
    description: "Congratulations to Rahul!",
  },
  {
    id: "4",
    title: "Independence Day",
    date: "Aug 15",
    type: "holiday",
    description: "National holiday",
  },
  {
    id: "5",
    title: "Backend Developer Interview",
    date: "Tomorrow, 11:00 AM",
    type: "interview",
    description: "With Priya Sharma",
  },
  {
    id: "6",
    title: "Leave Approval Pending",
    date: "Today",
    type: "approval",
    description: "2 pending leave requests",
  },
];

export const MOCK_UPCOMING_EVENTS: DashboardEvent[] = isDemo ? DEMO_EVENTS : EMPTY_EVENTS;

const DEMO_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "1",
    title: "New candidate added",
    description: "John Doe has been added to the candidate pipeline",
    read: false,
    createdAt: "2 min ago",
    type: "info",
  },
  {
    id: "2",
    title: "Leave request",
    description: "Michael Brown requests sick leave for Jul 25-26",
    read: false,
    createdAt: "1 hour ago",
    type: "warning",
  },
  {
    id: "3",
    title: "Onboarding completed",
    description: "Sarah Chen has completed onboarding",
    read: true,
    createdAt: "3 hours ago",
    type: "success",
  },
  {
    id: "4",
    title: "Attendance alert",
    description: "3 employees marked late today",
    read: true,
    createdAt: "5 hours ago",
    type: "error",
  },

];

export const MOCK_NOTIFICATIONS: NotificationItem[] = isDemo
  ? DEMO_NOTIFICATIONS
  : EMPTY_NOTIFICATIONS;

