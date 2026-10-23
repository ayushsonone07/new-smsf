import { CalendarDays } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { LeaveStatusDistribution } from "../services/dashboardService";

interface LeaveStatusDonutChartProps {
  data: LeaveStatusDistribution[];
}

const STATUS_COLORS: Record<string, string> = {
  APPROVED: "hsl(var(--success))",
  PENDING: "hsl(var(--warning))",
  REJECTED: "hsl(var(--danger))",
  CANCELLED: "hsl(var(--muted-foreground))",
};

const FALLBACK_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
];

function label(value: string): string {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function LeaveStatusDonutChart({ data }: LeaveStatusDonutChartProps) {
  const populated = data.filter((item) => item.count > 0);

  if (populated.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
        <span className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-primary-soft ring-1 ring-primary/10">
          <CalendarDays className="h-5 w-5 text-primary" />
        </span>
        <h3 className="text-sm font-semibold text-foreground">No leave data</h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">Leave status will appear here.</p>
      </div>
    );
  }

  const total = populated.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="grid items-center gap-4 sm:grid-cols-[minmax(160px,0.8fr)_minmax(170px,1fr)]">
      <div className="relative mx-auto h-[190px] w-full max-w-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={populated}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={78}
              paddingAngle={3}
              cornerRadius={5}
              stroke="none"
            >
              {populated.map((item, index) => (
                <Cell
                  key={item.status}
                  fill={STATUS_COLORS[item.status] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 10,
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--card))",
                fontSize: 12,
              }}
              formatter={(value: number) => [value.toLocaleString(), "Requests"]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <span className="text-3xl font-extrabold tracking-tight text-foreground">{total}</span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Requests</span>
        </div>
      </div>

      <div className="space-y-2">
        {populated.map((item, index) => (
          <div key={item.status} className="flex items-center gap-3 rounded-xl bg-surface-muted/60 px-3 py-2.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[item.status] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length] }}
            />
            <span className="min-w-0 flex-1 truncate text-xs font-bold text-foreground">{label(item.status)}</span>
            <span className="text-sm font-extrabold tabular-nums text-foreground">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
