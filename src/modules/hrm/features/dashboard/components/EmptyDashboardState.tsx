import { LayoutDashboard } from "lucide-react";

import type { LucideIcon } from "lucide-react";

interface EmptyDashboardStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyDashboardState({
  icon: Icon = LayoutDashboard,
  title = "No data available",
  description = "There is nothing to display right now.",
  action,
}: EmptyDashboardStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card px-6 py-12 text-center">
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-lg bg-primary-soft ring-1 ring-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </span>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}