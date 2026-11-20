import type { ReactNode } from "react";

import { cn } from "@hrm/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <div className="mb-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
              {eyebrow}
            </p>
          </div>
        ) : null}
        <h1 className="truncate text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-xs font-normal text-muted-foreground sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>
      ) : null}
    </header>
  );
}