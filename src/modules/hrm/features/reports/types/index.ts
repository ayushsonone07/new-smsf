export interface EmployeeGrowthPoint {
  month: string;
  total: number;
  newHires: number;
  attrition: number;
}

export interface AttendanceTrendPoint {
  month: string;
  averageAttendance: number;
  onTime: number;
  late: number;
  absent: number;
}

export interface LeaveTrendPoint {
  month: string;
  casual: number;
  sick: number;
  unpaid: number;
}

export interface RecruitmentFunnelStage {
  stage: string;
  count: number;
  rate: number;
}

export interface DepartmentDistribution {
  department: string;
  count: number;
  percentage: number;
}

export interface MonthlyHiringPoint {
  month: string;
  hired: number;
  joined: number;
  left: number;
}

export interface ReportKPIs {
  totalEmployees: number;
  activeEmployees: number;
  newThisMonth: number;
  attritionThisMonth: number;
  avgAttendance: number;
  pendingLeaves: number;
  openPositions: number;
  candidatesInPipeline: number;
}

export interface ReportsData {
  kpis: ReportKPIs;
  employeeGrowth: EmployeeGrowthPoint[];
  attendanceTrend: AttendanceTrendPoint[];
  leaveTrend: LeaveTrendPoint[];
  recruitmentFunnel: RecruitmentFunnelStage[];
  departmentDistribution: DepartmentDistribution[];
  monthlyHiring: MonthlyHiringPoint[];
}
