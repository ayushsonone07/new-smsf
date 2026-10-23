import { hrApiGet } from "@shared/services";

export interface ReportsResponse {
  generatedAt: string;
  filters: { startDate?: string; endDate?: string; departmentId?: number };
  workforce: {
    totalEmployees: number;
    activeEmployees: number;
    inactiveEmployees: number;
    byDepartment: { department: string; count: number }[];
  };
  attendance: {
    present: number;
    absent: number;
    late: number;
    onLeave: number;
    trend: { date: string; present: number; absent: number; late: number; onLeave: number }[];
  };
  leave: {
    totalRequests: number;
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
    byType: { type: string; count: number }[];
  };
  recruitment: {
    totalCandidates: number;
    byStage: { stage: string; count: number }[];
    interviewsScheduled: number;
    onboardingsInProgress: number;
  };

}

export const REPORTS_ENDPOINTS = {
  data: "/api/v1/reports",
} as const;

export const reportsService = {
  async getReportsData(params?: {
    startDate?: string;
    endDate?: string;
    departmentId?: number;
  }): Promise<ReportsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set("startDate", params.startDate);
    if (params?.endDate) searchParams.set("endDate", params.endDate);
    if (params?.departmentId != null) searchParams.set("departmentId", String(params.departmentId));
    const qs = searchParams.toString();
    const url = qs ? `${REPORTS_ENDPOINTS.data}?${qs}` : REPORTS_ENDPOINTS.data;
    return hrApiGet<ReportsResponse>(url);
  },
};
