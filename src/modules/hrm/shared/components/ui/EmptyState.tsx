import type { ReactNode } from "react";

import { Inbox } from "lucide-react";

import { cn } from "@hrm/lib/utils";

import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/75 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft ring-primary/20">
        <Icon className="h-7 w-7 text-primary" />
      </span>
      <h3 className="text-base font-semibold text-card-foreground">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-danger/30 bg-danger-soft px-5 py-4 text-sm text-danger">
      {message}
    </div>
  );
}
