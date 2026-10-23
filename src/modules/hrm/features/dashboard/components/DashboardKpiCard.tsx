import { motion } from "framer-motion";
import { AnimatedNumber } from "@shared/components/ui";

import { cn } from "@hrm/lib/utils";

import type { LucideIcon } from "lucide-react";

type KpiColor = "primary" | "success" | "warning" | "danger" | "info";

interface DashboardKpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  metadata?: string;
  statusLabel?: string;
  updatedLabel?: string;
  /** Uses values already supplied by the dashboard endpoint; never invents a series. */
  sparkline?: number[];
  color: KpiColor;
  loading?: boolean;
}

const colorMap: Record<KpiColor, { icon: string; border: string; gradient: string }> = {
  primary: { 
    icon: "bg-primary-soft text-primary shadow shadow-primary/20", 
    border: "border-l-primary",
    gradient: "from-primary/5 via-card to-card"
  },
  success: { 
    icon: "bg-success-soft text-success shadow shadow-success/20", 
    border: "border-l-success",
    gradient: "from-success/5 via-card to-card"
  },
  warning: { 
    icon: "bg-warning-soft text-warning shadow shadow-warning/20", 
    border: "border-l-warning",
    gradient: "from-warning/5 via-card to-card"
  },
  danger: { 
    icon: "bg-danger-soft text-danger shadow shadow-danger/20", 
    border: "border-l-danger",
    gradient: "from-danger/5 via-card to-card"
  },
  info: { 
    icon: "bg-info-soft text-info shadow shadow-info/20", 
    border: "border-l-info",
    gradient: "from-info/5 via-card to-card"
  },
};

export function DashboardKpiCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  metadata,
  statusLabel = "Current",
  updatedLabel = "Latest sync",
  sparkline,
  color,
  loading = false,
}: DashboardKpiCardProps) {
  const t = colorMap[color];

  if (loading) {
    return (
      <div className="mbg-card flex min-h-[148px] flex-col gap-2 p-3.5 animate-pulse bg-muted/20" />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "mbg-card group relative overflow-hidden flex min-h-[148px] flex-col justify-between gap-2.5 p-4 border-l-4 shadow-md transition-shadow hover:shadow-lg bg-gradient-to-br",
        t.border,
        t.gradient
      )}
    >
      <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 translate-y--8 rounded-full bg-current opacity-[0.03] pointer-events-none" />
      <div className="flex items-center justify-between gap-2 relative z-10">
        <div className="min-w-0">
          <span className="block truncate text-xs font-semibold tracking-wide text-muted-foreground">{label}</span>
          <span className="mbg-status-pill mt-1 inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-foreground/80 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> {statusLabel}
          </span>
        </div>
        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3 shadow-inner", t.icon)}>
          <Icon size={17} />
        </span>
      </div>
      <div className="flex items-end justify-between gap-3 relative z-10">
        <div className="min-w-0">
          <p className="text-3xl font-extrabold tracking-tight text-card-foreground">
            <AnimatedNumber value={value} duration={1.2} />
          </p>
          {trend !== undefined ? (
            <div className="mt-1 flex items-center gap-1.5">
              <TrendArrow value={trend} />
              <span className={cn("text-xs font-bold px-1.5 py-0.2 rounded", trend >= 0 ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>
                {trend >= 0 ? "+" : ""}{trend}%
              </span>
              {trendLabel ? <span className="truncate text-[11px] text-muted-foreground">{trendLabel}</span> : null}
            </div>
          ) : null}
        </div>
        {sparkline && sparkline.length > 1 ? <MiniSparkline values={sparkline} color={color} /> : null}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border/70 pt-2.5 text-[11px] font-medium text-muted-foreground relative z-10">
        <span className="truncate">{metadata ?? "Current reporting period"}</span>
        <span className="shrink-0 text-[10px] text-muted-foreground/80">{updatedLabel}</span>
      </div>
    </motion.div>
  );
}

function MiniSparkline({ values, color }: { values: number[]; color: KpiColor }) {
  const width = 72;
  const height = 26;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => `${(index / (values.length - 1)) * width},${height - 3 - ((value - min) / range) * (height - 7)}`)
    .join(" ");
  const stroke = color === "danger" ? "hsl(var(--danger))" : color === "warning" ? "hsl(var(--warning))" : color === "success" ? "hsl(var(--success))" : color === "info" ? "hsl(var(--info))" : "hsl(var(--primary))";
  return (
    <svg aria-label="Trend sparkline" className="h-7 w-[72px] shrink-0 opacity-90 transition-opacity duration-150 group-hover:opacity-100" viewBox={`0 0 ${width} ${height}`} fill="none" role="img">
      <polyline points={points} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrendArrow({ value }: { value: number }) {
  const color = value >= 0 ? "text-success" : "text-danger";
  return (
    <svg
      className={cn("h-3 w-3 shrink-0", color)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {value >= 0 ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
    </svg>
  );
}
