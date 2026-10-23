import { Download } from "lucide-react";

import { env } from "@config/env";
import {
  Card,
  EmptyState,
  ErrorDisplay,
  PageHeader,
  StaggerContainer,
  StaggerItem,
} from "@shared/components/ui";

import { AttendanceLineChart } from "../components/AttendanceLineChart";
import { LeaveTrendChart } from "../components/LeaveTrendChart";
import { RecruitmentFunnelChart } from "../components/RecruitmentFunnelChart";
import { ReportKPICards } from "../components/ReportKPICards";
import { REPORTS_DEMO_DATA } from "../data/reports.demo";
import { useReportsData } from "../hooks";

export function ReportsPage() {
  const { data, isLoading, error } = useReportsData();
  const reportData = data ?? (env.enableDemoData ? REPORTS_DEMO_DATA : undefined);
  const loading = isLoading && !data;

  if (!loading && (!reportData || error)) {
    return (
      <StaggerContainer className="space-y-6">
        <StaggerItem>
          <PageHeader title="Reports & Analytics" description="Key metrics and trends across the organization." />
        </StaggerItem>
        <StaggerItem>
          <ErrorDisplay message="Reports could not be loaded from the server." />
        </StaggerItem>
      </StaggerContainer>
    );
  }
  if (!reportData) return null;

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <PageHeader
          title="Reports & Analytics"
          description="Key metrics and trends across the organization."
          actions={
            <button
              type="button"
              onClick={() => window.print()}
              title="Print or save this report"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-card-foreground shadow transition hover:bg-muted"
            >
              <Download size={16} /> Export
            </button>
          }
        />
      </StaggerItem>

      <StaggerItem variant="card">
        <ReportKPICards kpis={reportData.kpis} isLoading={loading} error={null} />
      </StaggerItem>

      <StaggerItem variant="card">
        <LeaveTrendChart data={reportData.leaveTrend} isLoading={loading} error={null} />
      </StaggerItem>

      <StaggerItem variant="card">
        <AttendanceLineChart data={reportData.attendanceTrend} isLoading={loading} error={null} />
      </StaggerItem>

      <StaggerItem variant="card">
        <Card padding="lg" className="group hover:shadow-md">
          <h3 className="mb-4 flex items-center justify-between text-sm font-semibold text-card-foreground">
            <span>Department Distribution</span>
            <span className="text-xs font-medium text-muted-foreground">
              {reportData.departmentDistribution.length} departments
            </span>
          </h3>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : reportData.departmentDistribution.length === 0 ? (
            <EmptyState title="No data" description="No department distribution data." />
          ) : (
            <div className="space-y-4">
              {reportData.departmentDistribution.map((dept) => (
                <div key={dept.department}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-medium text-card-foreground">{dept.department}</span>
                    <span className="text-muted-foreground">
                      {dept.count} ({dept.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary-hover transition-all duration-700"
                      style={{ width: `${dept.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </StaggerItem>
    </StaggerContainer>
  );
}
