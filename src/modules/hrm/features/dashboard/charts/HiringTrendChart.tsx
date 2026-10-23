import { UserPlus } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { resolveChartColors } from "@shared/lib/chart-colors";

import { useTheme } from "@hrm/components/theme-provider";

import type { HiringTrendPoint } from "../types/dashboard.types";

interface HiringTrendChartProps {
  data: HiringTrendPoint[];
}

export function HiringTrendChart({ data }: HiringTrendChartProps) {
  useTheme();
  const cc = resolveChartColors();

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-6 text-center h-[240px]">
        <span className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-primary-soft ring-1 ring-primary/10">
          <UserPlus className="h-5 w-5 text-primary" />
        </span>
        <h3 className="text-sm font-semibold text-foreground">No hiring data</h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">Hiring trends will appear here.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={cc.grid} />
        <XAxis
          dataKey="month"
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
        <Tooltip
          cursor={{ fill: cc.cursor }}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: `1px solid ${cc.tooltipBorder}`,
            backgroundColor: cc.tooltipBg,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} verticalAlign="bottom" />
        <Bar dataKey="hired" fill="hsl(var(--success))" radius={[3, 3, 0, 0]} name="Hired" />
        <Bar dataKey="offers" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="Offers" />
      </BarChart>
    </ResponsiveContainer>
  );
}
