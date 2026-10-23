import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { IntegrationState, Card, ChartSkeleton } from "@shared/components/ui";
import { resolveChartColors } from "@shared/lib/chart-colors";

import { useTheme } from "@hrm/components/theme-provider";

import type { RecruitmentFunnelStage } from "../types";

const BAR_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--danger))",
  "hsl(var(--muted-foreground))",
];

interface Props {
  data: RecruitmentFunnelStage[] | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function RecruitmentFunnelChart({ data, isLoading, error }: Props) {
  useTheme();
  const cc = resolveChartColors();

  if (isLoading) return <ChartSkeleton height="280px" />;
  if (error) {
    return (
      <IntegrationState
        title="Recruitment funnel"
        description="Candidate movement will appear here as pipeline stages are updated."
      />
    );
  }
  if (!data || data.length === 0) {
    return <IntegrationState title="No data" description="No recruitment funnel data available." />;
  }

  return (
    <Card padding="md" className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <h3 className="mb-4 text-sm font-semibold text-card-foreground">Recruitment Funnel</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} />
          <XAxis type="number" tick={{ fontSize: 12, fill: cc.axis }} />
          <YAxis
            type="category"
            dataKey="stage"
            tick={{ fontSize: 12, fill: cc.axis }}
            width={110}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: `1px solid ${cc.tooltipBorder}`,
              backgroundColor: cc.tooltipBg,
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length] ?? "hsl(var(--primary))"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
