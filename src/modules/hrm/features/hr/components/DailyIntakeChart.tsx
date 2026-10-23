import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { resolveChartColors } from "@shared/lib/chart-colors";
import { parseDailyDate } from "@shared/lib";

import type { DailyIntakePoint } from "../types";

interface DailyIntakeChartProps {
  data: DailyIntakePoint[];
}

function formatTick(s: string): string {
  const d = parseDailyDate(s);
  if (!d) return s;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** recharts hands us `unknown` for the tooltip label — guard, then reuse formatTick. */
function formatTooltipLabel(label: unknown): string {
  return typeof label === "string" ? formatTick(label) : String(label);
}

/** Bar chart for daily candidate intake over the selected range. */
export function DailyIntakeChart({ data }: DailyIntakeChartProps) {
  const cc = resolveChartColors();
  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-400">No intake data for this range.</p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={cc.grid} />
        <XAxis
          dataKey="date"
          tickFormatter={formatTick}
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
          labelFormatter={formatTooltipLabel}
          cursor={{ fill: cc.cursor }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${cc.tooltipBorder}` }}
        />
        <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
