import { Cake, CalendarCheck, Handshake, type LucideIcon, Sun, UserCheck } from "lucide-react";

import { cn } from "@hrm/lib/utils";

import type { DashboardEvent } from "../types/dashboard.types";

const eventIcons: Record<DashboardEvent["type"], LucideIcon> = {
  interview: CalendarCheck,
  birthday: Cake,
  anniversary: Handshake,
  holiday: Sun,
  approval: UserCheck,
};

interface UpcomingEventsProps {
  events: DashboardEvent[];
  loading?: boolean;
  emptyMessage?: string;
}

export function UpcomingEvents({
  events,
  loading = false,
  emptyMessage = "No upcoming events",
}: UpcomingEventsProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
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

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
        <span className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-primary-soft ring-1 ring-primary/10">
          <CalendarCheck className="h-5 w-5 text-primary" />
        </span>
        <h3 className="text-sm font-semibold text-foreground">No upcoming events</h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {events.map((event) => (
        <EventRow key={event.id} event={event} />
      ))}
    </div>
  );
}

function EventRow({ event }: { event: DashboardEvent }) {
  const Icon = eventIcons[event.type];

  return (
    <div className="flex items-start gap-3 pb-4">
      <span
        className={cn(
          "relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full ring-2 ring-card",
          iconBg(event.type),
        )}
      >
        <Icon size={14} className="text-white" />
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <p className="text-sm font-medium text-card-foreground">{event.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{event.date}</p>
        {event.description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{event.description}</p>
        ) : null}
      </div>
    </div>
  );
}

function iconBg(type: DashboardEvent["type"]): string {
  switch (type) {
    case "interview":
      return "bg-primary";
    case "birthday":
      return "bg-danger";
    case "anniversary":
      return "bg-[hsl(var(--primary))]";
    case "holiday":
      return "bg-warning";
    case "approval":
      return "bg-success";
  }
}
