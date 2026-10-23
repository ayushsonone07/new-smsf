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

import type { EmployeeGrowthPoint } from "../types";

interface Props {
  data: EmployeeGrowthPoint[] | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function GrowthChart({ data, isLoading, error }: Props) {
  useTheme();
  const cc = resolveChartColors();

  if (isLoading) return <ChartSkeleton height="280px" />;
  if (error) {
    return (
      <IntegrationState
        title="Employee growth"
        description="Headcount trends will appear here as workforce records are updated."
      />
    );
  }
  if (!data || data.length === 0) {
    return <IntegrationState title="No data" description="No employee growth data available." />;
  }

  return (
    <Card padding="md" className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <h3 className="mb-4 text-sm font-semibold text-card-foreground">Employee Growth</h3>
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
          <Bar
            dataKey="newHires"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
            name="New Hires"
          />
          <Bar
            dataKey="attrition"
            fill="hsl(var(--danger))"
            radius={[4, 4, 0, 0]}
            name="Attrition"
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
