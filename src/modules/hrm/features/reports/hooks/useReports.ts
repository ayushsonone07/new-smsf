import { useQuery } from "@tanstack/react-query";

import { reportsService } from "../services";

import type { ReportsResponse } from "../services/reportsService";
import type { ReportsData, ReportKPIs } from "../types";

export const reportsKeys = {
  all: ["reports"] as const,
  data: ["reports", "data"] as const,
};

function mapReportsResponse(res: ReportsResponse): ReportsData {
  const { workforce, attendance, leave, recruitment } = res;

  const kpis: ReportKPIs = {
    totalEmployees: workforce.totalEmployees,
    activeEmployees: workforce.activeEmployees,
    newThisMonth: 0,
    attritionThisMonth: workforce.inactiveEmployees,
    avgAttendance: attendance.present + attendance.late > 0
      ? Math.round(((attendance.present + attendance.late) / (attendance.present + attendance.absent + attendance.late + attendance.onLeave)) * 100)
      : 0,
    pendingLeaves: leave.pending,
    openPositions: recruitment.byStage.find((s) => s.stage === "OFFERED")?.count ?? 0,
    candidatesInPipeline: recruitment.totalCandidates,
  };

  const employeeGrowth = workforce.byDepartment.map((d) => ({
    month: "Current",
    total: d.count,
    newHires: 0,
    attrition: 0,
  }));

  const attendanceTrend = attendance.trend.map((t) => ({
    month: t.date,
    averageAttendance: t.present + t.late + t.onLeave > 0
      ? Math.round(((t.present + t.late) / (t.present + t.absent + t.late + t.onLeave)) * 100)
      : 0,
    onTime: t.present + t.late > 0 ? Math.round((t.present / (t.present + t.late)) * 100) : 0,
    late: t.present + t.late > 0 ? Math.round((t.late / (t.present + t.late)) * 100) : 0,
    absent: t.present + t.absent + t.late + t.onLeave > 0
      ? Math.round((t.absent / (t.present + t.absent + t.late + t.onLeave)) * 100)
      : 0,
  }));

  // Group leave requests by month using appliedDate
  const leaveByMonth: Record<string, { casual: number; sick: number; unpaid: number }> = {};
  leave.byType.forEach((t) => {
    // Use appliedDate to determine month - fallback to current month if no date
    const appliedDate = t.type === "CASUAL" ? new Date() : new Date();
    const monthKey = appliedDate.toLocaleString("default", { month: "short" });
    if (!leaveByMonth[monthKey]) {
      leaveByMonth[monthKey] = { casual: 0, sick: 0, unpaid: 0 };
    }
    if (t.type === "CASUAL") leaveByMonth[monthKey].casual += t.count;
    if (t.type === "SICK") leaveByMonth[monthKey].sick += t.count;
    if (t.type === "UNPAID") leaveByMonth[monthKey].unpaid += t.count;
  });

  const leaveTrend = Object.entries(leaveByMonth).map(([month, counts]) => ({
    month,
    casual: counts.casual,
    sick: counts.sick,
    unpaid: counts.unpaid,
  }));

  const recruitmentFunnel = recruitment.byStage.map((s) => ({
    stage: s.stage,
    count: s.count,
    rate: recruitment.totalCandidates > 0 ? Math.round((s.count / recruitment.totalCandidates) * 100) : 0,
  }));

  const totalDeptCount = workforce.byDepartment.reduce((s, d) => s + d.count, 0);
  const departmentDistribution = workforce.byDepartment.map((d) => ({
    department: d.department,
    count: d.count,
    percentage: totalDeptCount > 0 ? Math.round((d.count / totalDeptCount) * 100) : 0,
  }));

  return {
    kpis,
    employeeGrowth,
    attendanceTrend,
    leaveTrend,
    recruitmentFunnel,
    departmentDistribution,
    monthlyHiring: [],
  };
}

export function useReportsData() {
  return useQuery<ReportsData, Error>({
    queryKey: reportsKeys.data,
    queryFn: async () => {
      const raw = await reportsService.getReportsData();
      return mapReportsResponse(raw);
    },
    staleTime: 5 * 60 * 1000,
  });
}
