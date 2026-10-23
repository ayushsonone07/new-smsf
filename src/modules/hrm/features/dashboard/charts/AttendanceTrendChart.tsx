import { useEffect, useState } from "react";

import { CalendarDays } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { resolveChartColors } from "@shared/lib/chart-colors";

import { useTheme } from "@hrm/components/theme-provider";

import type { AttendanceTrendPoint } from "../types/dashboard.types";

interface AttendanceTrendChartProps {
  data: AttendanceTrendPoint[];
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-semibold text-card-foreground">{label}</p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-semibold text-card-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AttendanceTrendChart({ data }: AttendanceTrendChartProps) {
  useTheme();
  const cc = resolveChartColors();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-6 text-center h-[260px]">
        <span className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-primary-soft ring-1 ring-primary/10">
          <CalendarDays className="h-5 w-5 text-primary" />
        </span>
        <h3 className="text-sm font-semibold text-foreground">No attendance data</h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">Attendance trends will appear here.</p>
      </div>
    );
  }

  const series = [
    { key: "present" as const, color: "hsl(var(--success))", name: "Present" },
    { key: "leave" as const, color: "hsl(var(--primary))", name: "Leave" },
    { key: "late" as const, color: "hsl(var(--warning))", name: "Late" },
    { key: "absent" as const, color: "hsl(var(--danger))", name: "Absent" },
  ];

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={cc.grid} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: cc.axis }}
          axisLine={false}
          tickLine={false}
          minTickGap={20}
        />
        <YAxis
          tick={{ fontSize: 11, fill: cc.axis }}
          axisLine={false}
          tickLine={false}
          width={36}
          allowDecimals={false}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: cc.grid, strokeWidth: 1 }} />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} verticalAlign="bottom" />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stroke={s.color}
            strokeWidth={2}
            name={s.name}
            dot={false}
            activeDot={{ r: 3.5, strokeWidth: 0 }}
            animationBegin={mounted ? 0 : 0}
            animationDuration={500}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}