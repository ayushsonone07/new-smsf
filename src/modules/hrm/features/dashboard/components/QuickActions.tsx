import { useState } from "react";

import { Link } from "react-router-dom";

import { cn } from "@hrm/lib/utils";

import type { LucideIcon } from "lucide-react";

interface QuickActionItem {
  label: string;
  icon: LucideIcon;
  to?: string;
  onClick?: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

interface QuickActionsProps {
  actions: QuickActionItem[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
      {actions.map((action) => (
        <QuickActionButton key={action.label} action={action} />
      ))}
    </div>
  );
}

function QuickActionButton({ action }: { action: QuickActionItem }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const Icon = action.icon;

  const baseClasses = cn(
    "mbg-icon-button relative flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-left",
    action.disabled
      ? "cursor-not-allowed opacity-50"
      : "cursor-pointer hover:border-primary/40 hover:bg-primary-soft/40",
  );

  const content = (
    <>
      <span
        className={cn(
          "grid h-7 w-7 shrink-0 place-items-center rounded-md",
          action.disabled ? "bg-muted text-muted-foreground" : "bg-primary-soft text-primary",
        )}
      >
        <Icon size={14} />
      </span>
      <span className="truncate text-xs font-medium text-card-foreground">
        {action.label}
      </span>
    </>
  );

  if (action.disabled) {
    return (
      <div
        className={baseClasses}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        role="button"
        tabIndex={-1}
        aria-disabled
      >
        {content}
        {showTooltip && action.disabledReason ? (
          <div className="absolute -top-1 left-1/2 z-50 w-48 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-card px-3 py-2 text-center text-xs text-muted-foreground shadow-lg">
            {action.disabledReason}
          </div>
        ) : null}
      </div>
    );
  }

  if (action.to) {
    return (
      <Link to={action.to} className={baseClasses}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={action.onClick} className={baseClasses}>
      {content}
    </button>
  );
}
