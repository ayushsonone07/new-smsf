import { Building2 } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { DepartmentDistribution } from "../types/dashboard.types";

interface DepartmentDistributionChartProps {
  data: DepartmentDistribution[];
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: DepartmentDistribution }[];
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload;
  if (!entry) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow">
      <span className="font-medium text-card-foreground">{entry.name}</span>
      <span className="ml-2 text-muted-foreground">{entry.value} employees</span>
    </div>
  );
}

export function DepartmentDistributionChart({ data }: DepartmentDistributionChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-6 text-center h-[220px]">
        <span className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-primary-soft ring-1 ring-primary/10">
          <Building2 className="h-5 w-5 text-primary" />
        </span>
        <h3 className="text-sm font-semibold text-foreground">No department data</h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">Department distribution will appear here.</p>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="grid min-w-0 items-center gap-4 sm:grid-cols-[minmax(190px,0.8fr)_minmax(190px,1fr)]">
      <div
        className="relative min-w-0"
        role="img"
        aria-label={`Department distribution across ${data.length} departments`}
      >
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={57}
              outerRadius={86}
              paddingAngle={2}
              stroke="hsl(var(--card))"
              strokeWidth={2}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <span className="text-2xl font-extrabold tabular-nums text-foreground">
            {total.toLocaleString()}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Employees
          </span>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-1">
        {data.map((entry) => {
          const percentage = total > 0 ? Math.round((entry.value / total) * 100) : 0;
          return (
            <div
              key={entry.name}
              className="flex min-w-0 items-center gap-2 rounded-lg bg-surface-muted/70 px-3 py-2"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-card-foreground">
                {entry.name}
              </span>
              <span className="shrink-0 text-xs font-bold tabular-nums text-foreground">
                {entry.value}
                <span className="ml-1 font-medium text-muted-foreground">{percentage}%</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
