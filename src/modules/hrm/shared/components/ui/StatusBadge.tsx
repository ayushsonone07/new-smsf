import { cn } from "@hrm/lib/utils";

type BadgeTone =
  | "slate"
  | "blue"
  | "emerald"
  | "amber"
  | "red"
  | "sky"
  | "rose"
  | "violet"
  | "cyan"
  | "orange"
  | "pink"
  | "indigo"
  | "fuchsia"
  | "lime";

interface StatusBadgeProps {
  label: string;
  tone?: BadgeTone;
  className?: string;
  dot?: boolean;
}

const toneClasses: Record<BadgeTone, string> = {
  slate: "bg-muted text-muted-foreground ring-border",
  blue: "bg-primary-soft text-primary ring-primary/30",
  emerald: "bg-success-soft text-success ring-success/30",
  amber: "bg-warning-soft text-warning ring-warning/30",
  red: "bg-danger-soft text-danger ring-danger/30",
  sky: "bg-info-soft text-info ring-info/30",
  rose: "bg-danger-soft text-danger ring-danger/30",
  violet: "bg-info-soft text-info ring-info/30",
  cyan: "bg-info-soft text-info ring-info/30",
  orange: "bg-warning-soft text-warning ring-warning/30",
  pink: "bg-danger-soft text-danger ring-danger/30",
  indigo: "bg-primary-soft text-primary ring-primary/30",
  fuchsia: "bg-info-soft text-info ring-info/30",
  lime: "bg-success-soft text-success ring-success/30",
};

const dotColors: Record<BadgeTone, string> = {
  slate: "bg-muted-foreground",
  blue: "bg-primary",
  emerald: "bg-success",
  amber: "bg-warning",
  red: "bg-danger",
  sky: "bg-info",
  rose: "bg-danger",
  violet: "bg-info",
  cyan: "bg-info",
  orange: "bg-warning",
  pink: "bg-danger",
  indigo: "bg-primary",
  fuchsia: "bg-info",
  lime: "bg-success",
};

export function StatusBadge({ label, tone = "slate", className, dot = false }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        toneClasses[tone],
        className,
      )}
    >
      {dot ? <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", dotColors[tone])} /> : null}
      {label}
    </span>
  );
}
