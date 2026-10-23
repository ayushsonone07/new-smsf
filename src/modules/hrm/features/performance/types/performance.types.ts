export type PerformanceReviewStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface PerformanceReview {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  employeeDepartment?: string | null;
  reviewerId: number;
  reviewerName: string;
  cycle: string;
  periodStart: string;
  periodEnd: string;
  goals: string;
  rating?: number | null;
  strengths?: string | null;
  improvements?: string | null;
  comments?: string | null;
  status: PerformanceReviewStatus;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PerformanceReviewInput {
  employeeId: number;
  reviewerId: number;
  cycle: string;
  periodStart: string;
  periodEnd: string;
  goals: string;
  rating?: number | null;
  strengths?: string | null;
  improvements?: string | null;
  comments?: string | null;
  status?: PerformanceReviewStatus;
}

export interface PerformanceSummary {
  totalReviews: number;
  pendingReviews: number;
  inProgressReviews: number;
  completedReviews: number;
  averageRating: number;
}

export interface PerformanceListParams {
  status?: PerformanceReviewStatus | "";
  cycle?: string;
  employeeSearch?: string;
  page?: number;
  size?: number;
  sort?: string;
}