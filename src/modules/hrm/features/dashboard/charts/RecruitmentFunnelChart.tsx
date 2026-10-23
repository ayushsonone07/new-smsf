import { Users } from "lucide-react";

import type { RecruitmentFunnel } from "../types/dashboard.types";

interface RecruitmentFunnelChartProps {
  data: RecruitmentFunnel[];
}

const STAGE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--danger))",
];

function stageLabel(value: string): string {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function RecruitmentFunnelChart({ data }: RecruitmentFunnelChartProps) {
  const populated = data.filter((item) => item.count > 0);

  if (populated.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
        <span className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-primary-soft ring-1 ring-primary/10">
          <Users className="h-5 w-5 text-primary" />
        </span>
        <h3 className="text-sm font-semibold text-foreground">No recruitment data</h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">Recruitment funnel will appear here.</p>
      </div>
    );
  }

  const total = populated.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Pipeline volume
          </p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">
            {total.toLocaleString()}
          </p>
        </div>
        <p className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
          {populated.length} active stages
        </p>
      </div>

      <div
        className="flex h-3 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label="Candidate distribution across recruitment stages"
      >
        {populated.map((item, index) => (
          <span
            key={item.stage}
            title={`${stageLabel(item.stage)}: ${item.count}`}
            style={{
              width: `${Math.max((item.count / total) * 100, 1.5)}%`,
              backgroundColor: STAGE_COLORS[index % STAGE_COLORS.length],
            }}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {populated.map((item, index) => {
          const percent = (item.count / total) * 100;
          return (
            <div
              key={item.stage}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface-muted/50 px-3 py-2.5"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: STAGE_COLORS[index % STAGE_COLORS.length] }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-foreground">{stageLabel(item.stage)}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{percent.toFixed(1)}% of pipeline</p>
              </div>
              <span className="text-base font-extrabold tabular-nums text-foreground">
                {item.count.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
