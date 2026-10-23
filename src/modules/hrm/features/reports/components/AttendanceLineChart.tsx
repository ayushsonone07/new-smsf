import {
  LineChart,
  Line,
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

import type { AttendanceTrendPoint } from "../types";

interface Props {
  data: AttendanceTrendPoint[] | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function AttendanceLineChart({ data, isLoading, error }: Props) {
  useTheme();
  const cc = resolveChartColors();

  if (isLoading) return <ChartSkeleton height="280px" />;
  if (error) {
    return (
      <IntegrationState
        title="Attendance trend"
        description="Attendance patterns will appear here as daily records are completed."
      />
    );
  }
  if (!data || data.length === 0) {
    return <IntegrationState title="No data" description="No attendance data available." />;
  }

  return (
    <Card padding="md" className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <h3 className="mb-4 text-sm font-semibold text-card-foreground">Attendance Trend</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: cc.axis }} />
          <YAxis tick={{ fontSize: 12, fill: cc.axis }} unit="%" />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: `1px solid ${cc.tooltipBorder}`,
              backgroundColor: cc.tooltipBg,
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="averageAttendance"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 4 }}
            name="Avg Attendance %"
          />
          <Line
            type="monotone"
            dataKey="onTime"
            stroke="hsl(var(--success))"
            strokeWidth={2}
            dot={{ r: 4 }}
            name="On Time %"
          />
          <Line
            type="monotone"
            dataKey="late"
            stroke="hsl(var(--warning))"
            strokeWidth={2}
            dot={{ r: 4 }}
            name="Late %"
          />
          <Line
            type="monotone"
            dataKey="absent"
            stroke="hsl(var(--danger))"
            strokeWidth={2}
            dot={{ r: 4 }}
            name="Absent %"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
