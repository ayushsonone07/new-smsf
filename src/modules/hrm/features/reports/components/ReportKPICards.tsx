import { Briefcase, Calendar, Clock, TrendingDown, UserCheck, UserPlus, Users } from "lucide-react";

import { IntegrationState, Card, MetricCardSkeleton, AnimatedNumber } from "@shared/components/ui";

import type { ReportKPIs } from "../types";

interface Props {
  kpis: ReportKPIs | undefined;
  isLoading: boolean;
  error: Error | null;
}

type KpiTone = "blue" | "emerald" | "amber" | "violet" | "rose";

const KPI_TONES: Record<KpiTone, { icon: string; badge: string }> = {
  blue: { icon: "bg-primary-soft text-primary", badge: "bg-primary/10 text-primary" },
  emerald: { icon: "bg-success-soft text-success", badge: "bg-success/10 text-success" },
  amber: { icon: "bg-warning-soft text-warning", badge: "bg-warning/10 text-warning" },
  violet: { icon: "bg-info-soft text-info", badge: "bg-info/10 text-info" },
  rose: { icon: "bg-danger-soft text-danger", badge: "bg-danger/10 text-danger" },
};

export function ReportKPICards({ kpis, isLoading, error }: Props) {
  if (isLoading) return <MetricCardSkeleton count={8} />;
  if (error) {
    return (
      <IntegrationState
        title="Organisation KPIs"
        description="Key workforce metrics will appear here as records are updated."
      />
    );
  }
  if (!kpis) {
    return <IntegrationState title="No data" description="No KPI data available." />;
  }

  const cards: { label: string; value: string | number; icon: typeof Users; tone: KpiTone }[] = [
    { label: "Total Employees", value: kpis.totalEmployees, icon: Users, tone: "blue" },
    { label: "Active Employees", value: kpis.activeEmployees, icon: UserCheck, tone: "emerald" },
    { label: "New This Month", value: kpis.newThisMonth, icon: UserPlus, tone: "violet" },
    { label: "Attrition", value: kpis.attritionThisMonth, icon: TrendingDown, tone: "rose" },
    { label: "Avg Attendance", value: `${kpis.avgAttendance}%`, icon: Calendar, tone: "blue" },
    { label: "Pending Leaves", value: kpis.pendingLeaves, icon: Clock, tone: "amber" },
    { label: "Open Positions", value: kpis.openPositions, icon: Briefcase, tone: "violet" },
    { label: "Candidates in Pipeline", value: kpis.candidatesInPipeline, icon: Users, tone: "emerald" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        const t = KPI_TONES[c.tone];
        return (
          <Card
            key={c.label}
            padding="md"
            className="group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <span
              className={`absolute right-0 top-0 h-16 w-16 rounded-bl-full opacity-40 blur-2xl ${t.badge}`}
            />
            <div className="relative flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl shadow transition-transform duration-200 group-hover:scale-110 ${t.icon}`}
              >
                <Icon size={16} />
              </span>
            </div>
            <p className="relative mt-3 text-2xl font-extrabold tracking-tight text-foreground">
              <AnimatedNumber value={c.value} duration={1} />
            </p>
          </Card>
        );
      })}
    </div>
  );
}
