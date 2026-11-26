export type TargetStatus = "PENDING" | "IN_PROGRESS" | "ACHIEVED" | "MISSED" | "CANCELLED";

export type TargetType = "MONTHLY" | "QUARTERLY" | "YEARLY" | "CUSTOM";

export type TargetCategory = "SALES" | "OPERATION";

export interface SalesTarget {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  employeeDepartment?: string | null;
  assignedById?: number | null;
  assignedByName?: string | null;
  category: TargetCategory;
  targetType: TargetType;
  cycle: string;
  periodStart: string;
  periodEnd: string;
  targetAmount: number;
  achievedAmount: number;
  achievementPercentage: number;
  targetDeals?: number | null;
  achievedDeals?: number | null;
  dealsAchievementPercentage?: number | null;
  incentiveAmount?: number | null;
  clientTickets?: number | null;
  solvedTickets?: number | null;
  potentialCra?: number | null;
  status: TargetStatus;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalesTargetInput {
  employeeId: number | "";
  assignedById?: number | "";
  category: TargetCategory;
  targetType: TargetType;
  cycle: string;
  periodStart: string;
  periodEnd: string;
  targetAmount?: number | "";
  achievedAmount?: number | "";
  targetDeals?: number | "";
  achievedDeals?: number | "";
  incentiveAmount?: number | "";
  clientTickets?: number | "";
  solvedTickets?: number | "";
  potentialCra?: number | "";
  status: TargetStatus;
  remarks: string;
}

export interface SalesTargetProgressInput {
  achievedAmount?: number;
  achievedDeals?: number;
  solvedTickets?: number;
  status?: TargetStatus;
  remarks?: string;
}

export interface SalesTargetSummary {
  totalTargets: number;
  totalTargetAmount: number;
  totalAchievedAmount: number;
  overallAchievementPercentage: number;
  pendingTargets: number;
  inProgressTargets: number;
  achievedTargets: number;
  missedTargets: number;
}

export interface SalesTargetListParams {
  page?: number;
  size?: number;
  category?: TargetCategory | "";
  status?: TargetStatus | "";
  targetType?: TargetType | "";
  cycle?: string;
  employeeSearch?: string;
  sort?: string;
}
