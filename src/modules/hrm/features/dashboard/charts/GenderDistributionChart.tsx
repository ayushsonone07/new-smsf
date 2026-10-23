import { Users } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { GenderDistribution } from "../types/dashboard.types";

interface GenderDistributionChartProps {
  data: GenderDistribution[];
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number }[];
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  if (!entry) return null;
  const totalVal = payload.reduce((sum, p) => sum + p.value, 0);
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow">
      <span className="font-medium text-card-foreground">{entry.name}</span>
      <span className="ml-2 text-muted-foreground">
        {entry.value} ({totalVal > 0 ? ((entry.value / totalVal) * 100).toFixed(1) : "0"}%)
      </span>
    </div>
  );
}

export function GenderDistributionChart({ data }: GenderDistributionChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-6 text-center h-[240px]">
        <span className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-primary-soft ring-1 ring-primary/10">
          <Users className="h-5 w-5 text-primary" />
        </span>
        <h3 className="text-sm font-semibold text-foreground">No distribution data</h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">Gender distribution will appear here.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
