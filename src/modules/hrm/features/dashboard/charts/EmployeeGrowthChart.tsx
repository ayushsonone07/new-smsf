import { TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { resolveChartColors } from "@shared/lib/chart-colors";

import type { EmployeeGrowthPoint } from "../types/dashboard.types";

interface EmployeeGrowthChartProps {
  data: EmployeeGrowthPoint[];
}

export function EmployeeGrowthChart({ data }: EmployeeGrowthChartProps) {
  const cc = resolveChartColors();

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-6 text-center h-[240px]">
        <span className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-primary-soft ring-1 ring-primary/10">
          <TrendingUp className="h-5 w-5 text-primary" />
        </span>
        <h3 className="text-sm font-semibold text-foreground">No growth data</h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">Employee growth data will appear here.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
        <Area
          type="monotone"
          dataKey="total"
          stroke="hsl(var(--foreground))"
          fill="hsl(var(--foreground))"
          fillOpacity={0.1}
          strokeWidth={2}
          name="Total Employees"
        />
        <Area
          type="monotone"
          dataKey="newJoiners"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary))"
          fillOpacity={0.14}
          strokeWidth={2}
          name="New Joiners"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
