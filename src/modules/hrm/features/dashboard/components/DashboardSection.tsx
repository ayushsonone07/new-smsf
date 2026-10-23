import type { ReactNode } from "react";

import { cn } from "@hrm/lib/utils";

interface DashboardSectionProps {
  title: string;
  children: ReactNode;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function DashboardSection({
  title,
  children,
  description,
  action,
  className,
}: DashboardSectionProps) {
  return (
    <section className={cn("mbg-card space-y-2.5 p-3.5 sm:p-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
