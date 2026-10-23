import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { resolveChartColors } from "@shared/lib/chart-colors";

import type { DayOfWeekPoint } from "../types";

const DAY_ORDER = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
const DAY_LABEL: Record<string, string> = {
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
  SUN: "Sun",
};

interface ByDayOfWeekChartProps {
  data: DayOfWeekPoint[];
}

/**
 * Bars Mon–Sun. Backend can return rows in any order and may omit zero days;
 * we order locally and fill missing days with 0 so the chart shape is stable.
 */
export function ByDayOfWeekChart({ data }: ByDayOfWeekChartProps) {
  const cc = resolveChartColors();
  const ordered = DAY_ORDER.map((day) => {
    const found = data.find((d) => d.day.toUpperCase() === day);
    return { day: DAY_LABEL[day] ?? day, count: found?.count ?? 0 };
  });

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={ordered} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={cc.grid} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: cc.axis }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: cc.axis }}
          axisLine={false}
          tickLine={false}
          width={28}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: cc.cursor }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${cc.tooltipBorder}` }}
        />
        <Bar dataKey="count" fill="hsl(var(--chart-4))" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
