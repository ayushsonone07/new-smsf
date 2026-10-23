import { useMemo } from "react";

import { Briefcase, Heart, type LucideIcon } from "lucide-react";

import { AnimatedNumber, Card, CardSkeleton, ErrorDisplay } from "@shared/components/ui";

import type { LeaveBalance, LeaveTypeValue } from "../types";

const LEAVE_TYPE_META: Record<
  LeaveTypeValue,
  { label: string; icon: LucideIcon; color: string }
> = {
  CASUAL: {
    label: "Casual Leave",
    icon: Briefcase,
    color: "text-primary bg-primary-soft",
  },
  SICK: {
    label: "Sick Leave",
    icon: Heart,
    color: "text-danger bg-danger-soft",
  },
  PAID: {
    label: "Paid Leave",
    icon: Briefcase,
    color: "text-success bg-success-soft",
  },
  UNPAID: {
    label: "Unpaid Leave",
    icon: Briefcase,
    color: "text-muted-foreground bg-muted",
  },
};

interface LeaveBalanceCardsProps {
  balances: LeaveBalance[] | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function LeaveBalanceCards({ balances, isLoading, error }: LeaveBalanceCardsProps) {
  const sorted = useMemo(() => {
    const source = balances ?? [];
    const order: LeaveTypeValue[] = [
      "CASUAL",
      "SICK",
      "PAID",
      "UNPAID",
    ];
    return [...source].sort((a, b) => order.indexOf(a.leaveType) - order.indexOf(b.leaveType));
  }, [balances]);

  if (isLoading) return <CardSkeleton count={3} />;
  if (error) return <ErrorDisplay message="Leave balances could not be loaded. Please try again." />;
  if (sorted.length === 0) {
    return <Card padding="md"><p className="text-sm text-muted-foreground">No leave entitlements are configured for your profile.</p></Card>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sorted.map((balance) => {
        const meta = LEAVE_TYPE_META[balance.leaveType];
        const Icon = meta?.icon ?? Briefcase;
        const usagePct = balance.total > 0 ? Math.round((balance.used / balance.total) * 100) : 0;
        return (
          <Card key={balance.leaveType} padding="md">
            <div className="flex items-start gap-3">
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                  meta?.color ?? "text-muted-foreground bg-muted"
                }`}
              >
                <Icon size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-card-foreground">
                  {meta?.label ?? balance.label}
                </p>
                <p className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
                  <AnimatedNumber value={balance.remaining} />
                  <span className="ml-1 text-sm font-medium text-muted-foreground">
                    / <AnimatedNumber value={balance.total} />
                  </span>
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(usagePct, 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  <AnimatedNumber value={balance.used} /> used
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
