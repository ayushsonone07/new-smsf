import { UserCheck, UsersRound, CalendarDays, Clock, Handshake, Bell } from "lucide-react";

import { cn } from "@hrm/lib/utils";

import type { DashboardActivity } from "../types/dashboard.types";
import type { LucideIcon } from "lucide-react";

const activityIcons: Record<DashboardActivity["type"], LucideIcon> = {
  candidate: UserCheck,
  employee: UsersRound,
  leave: CalendarDays,
  attendance: Clock,
  onboarding: Handshake,
  general: Bell,
};

interface RecentActivityProps {
  activities: DashboardActivity[];
  loading?: boolean;
  emptyMessage?: string;
}

export function RecentActivity({
  activities,
  loading = false,
  emptyMessage = "No recent activity",
}: RecentActivityProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
        <span className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-primary-soft ring-1 ring-primary/10">
          <Bell className="h-5 w-5 text-primary" />
        </span>
        <h3 className="text-sm font-semibold text-foreground">No recent activity</h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity, index) => (
        <ActivityRow
          key={activity.id}
          activity={activity}
          isLast={index === activities.length - 1}
        />
      ))}
    </div>
  );
}

function ActivityRow({ activity, isLast }: { activity: DashboardActivity; isLast: boolean }) {
  const Icon = activityIcons[activity.type];
  const timeAgo = getRelativeTime(activity.timestamp);

  return (
    <div className="relative flex items-start gap-3 pb-4">
      {!isLast ? <div className="absolute left-[17px] top-9 bottom-0 w-px bg-border" /> : null}
      <span
        className={cn(
          "relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full ring-2 ring-card",
          iconBg(activity.type),
        )}
      >
        <Icon size={14} className="text-white" />
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <p className="text-sm text-card-foreground">{activity.description}</p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          {activity.user?.name ? <span>{activity.user.name}</span> : null}
          <span>{timeAgo}</span>
        </div>
      </div>
    </div>
  );
}

function iconBg(type: DashboardActivity["type"]): string {
  switch (type) {
    case "candidate":
      return "bg-primary";
    case "employee":
      return "bg-success";
    case "leave":
      return "bg-warning";
    case "attendance":
      return "bg-info";
    case "onboarding":
      return "bg-primary";
    case "general":
      return "bg-muted-foreground";
  }
}

function getRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
