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

export function StatusBadge({ label, tone = "slate", className, dot = true }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition-colors duration-150",
        toneClasses[tone],
        className,
      )}
    >
      {dot ? (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full shadow-xs",
            dotColors[tone],
          )}
        />
      ) : null}
      <span className="leading-none">{label}</span>
    </span>
  );
}
