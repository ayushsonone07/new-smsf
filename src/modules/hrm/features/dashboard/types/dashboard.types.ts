export interface KpiCardData {
  label: string;
  value: number | string;
  icon: string;
  trend?: number;
  trendLabel?: string;
  supportingText?: string;
  color: "primary" | "success" | "warning" | "danger" | "info";
}

export interface DashboardActivity {
  id: string;
  type: "candidate" | "employee" | "leave" | "attendance" | "onboarding" | "general";
  description: string;
  timestamp: string;
  user?: { name: string; avatar?: string };
}

export interface DashboardEvent {
  id: string;
  title: string;
  date: string;
  type: "interview" | "birthday" | "anniversary" | "holiday" | "approval";
  description?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  description?: string;
  read: boolean;
  createdAt: string;
  type: "info" | "warning" | "success" | "error";
}

export interface QuickAction {
  label: string;
  icon: string;
  to?: string;
  action?: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

export interface ChartColors {
  primary: string;
  secondary: string;
  tertiary: string;
  quaternary: string;
  quinary: string;
}

export interface EmployeeGrowthPoint {
  month: string;
  total: number;
  newJoiners: number;
}

export interface AttendanceTrendPoint {
  date: string;
  present: number;
  absent: number;
  late: number;
  leave: number;
}

export interface DepartmentDistribution {
  name: string;
  value: number;
  color: string;
}

export interface GenderDistribution {
  name: string;
  value: number;
  color: string;
}

export interface RecruitmentFunnel {
  stage: string;
  count: number;
}

export interface HiringTrendPoint {
  month: string;
  hired: number;
  offers: number;
}


export interface LeaveTrendPoint {
  month: string;
  approved: number;
  pending: number;
}

export interface CandidateSource {
  source: string;
  count: number;
}

export interface OnboardingProgress {
  stage: string;
  completed: number;
  total: number;
}

export interface DashboardKpi {
  totalEmployees: number;
  activeEmployees: number;
  newJoiners: number;
  onProbation: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  onLeaveToday: number;
  openPositions: number;
  activeCandidates: number;
  pendingApprovals: number;
  candidatesAddedToday: number;
  interviewsToday: number;
  offersPending: number;
  assignedCandidates: number;
  followUpsDue: number;
  pendingOnboardingTasks: number;
  documentsToVerify: number;
  attendanceCorrections: number;
  leaveBalance: number;
  workedHours: number;
  monthlyAttendancePct: number;
  lateArrivals: number;
}
