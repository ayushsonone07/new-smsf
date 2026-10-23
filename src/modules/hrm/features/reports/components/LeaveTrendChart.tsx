import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { IntegrationState, Card, ChartSkeleton } from "@shared/components/ui";
import { resolveChartColors } from "@shared/lib/chart-colors";

import { useTheme } from "@hrm/components/theme-provider";

import type { LeaveTrendPoint } from "../types";

interface Props {
  data: LeaveTrendPoint[] | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function LeaveTrendChart({ data, isLoading, error }: Props) {
  useTheme();
  const cc = resolveChartColors();

  if (isLoading) return <ChartSkeleton height="280px" />;
  if (error) {
    return (
      <IntegrationState
        title="Leave trend"
        description="Monthly leave patterns will appear here as requests are recorded."
      />
    );
  }
  if (!data || data.length === 0) {
    return <IntegrationState title="No data" description="No leave trend data available." />;
  }

  return (
    <Card padding="md" className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <h3 className="mb-4 text-sm font-semibold text-card-foreground">Leave Trend</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: cc.axis }} />
          <YAxis tick={{ fontSize: 12, fill: cc.axis }} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: `1px solid ${cc.tooltipBorder}`,
              backgroundColor: cc.tooltipBg,
            }}
          />
          <Legend />
          <Bar dataKey="casual" fill="hsl(var(--primary))" stackId="a" name="Casual" />
          <Bar dataKey="sick" fill="hsl(var(--danger))" stackId="a" name="Sick" />
          <Bar dataKey="earned" fill="hsl(var(--success))" stackId="a" name="Earned" />
          <Bar dataKey="unpaid" fill={cc.axis} stackId="a" name="Unpaid" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
