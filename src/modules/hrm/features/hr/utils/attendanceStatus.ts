export const CHECK_IN_STATUSES = [
  "NOT_CHECKED_IN",
  "EARLY_CHECK_IN",
  "ON_TIME_CHECK_IN",
  "LATE_CHECK_IN",
] as const;

export const CHECK_OUT_STATUSES = [
  "NOT_CHECKED_OUT",
  "EARLY_CHECK_OUT",
  "ON_TIME_CHECK_OUT",
  "LATE_CHECK_OUT",
] as const;

export type CheckInStatus = (typeof CHECK_IN_STATUSES)[number];
export type CheckOutStatus = (typeof CHECK_OUT_STATUSES)[number];

/** Chart colors used only for check-in / check-out doughnuts on the attendance dashboard */
export const ATTENDANCE_CHART_COLORS: Record<string, string> = {
  NOT_CHECKED_IN: "#e53935",
  LATE_CHECK_IN: "#fb8c00",
  EARLY_CHECK_IN: "#26a69a",
  ON_TIME_CHECK_IN: "#43a047",
  NOT_CHECKED_OUT: "#78909c",
  LATE_CHECK_OUT: "#fb8c00",
  EARLY_CHECK_OUT: "#26a69a",
  ON_TIME_CHECK_OUT: "#43a047",
};

export const ATTENDANCE_STATUS_COLORS = ATTENDANCE_CHART_COLORS;

export function formatAttendanceStatus(status: string): string {
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function resolveCheckInStatus(record: { checkIn: string | null; checkInStatus: string | null }): string {
  return record.checkInStatus ?? (record.checkIn ? "ON_TIME_CHECK_IN" : "NOT_CHECKED_IN");
}

export function resolveCheckOutStatus(record: { checkOut: string | null; checkOutStatus: string | null }): string {
  return record.checkOutStatus ?? (record.checkOut ? "ON_TIME_CHECK_OUT" : "NOT_CHECKED_OUT");
}

export function checkInStatusClass(status: string): string {
  if (status.includes("LATE")) return "bg-warning-soft text-warning";
  if (status === "NOT_CHECKED_IN") return "bg-danger-soft text-danger";
  if (status === "EARLY_CHECK_IN") return "bg-info-soft text-info";
  return "bg-success-soft text-success";
}

export function checkOutStatusClass(status: string): string {
  if (status.includes("LATE")) return "bg-warning-soft text-warning";
  if (status === "NOT_CHECKED_OUT") return "bg-muted text-muted-foreground";
  if (status === "EARLY_CHECK_OUT") return "bg-info-soft text-info";
  return "bg-success-soft text-success";
}

export function countAttendanceStatuses(
  records: { checkIn: string | null; checkInStatus: string | null; checkOut: string | null; checkOutStatus: string | null }[],
  kind: "checkIn" | "checkOut",
): { status: string; count: number; pct: number; color: string }[] {
  const total = records.length;
  const counts = new Map<string, number>();

  for (const record of records) {
    const status = kind === "checkIn" ? resolveCheckInStatus(record) : resolveCheckOutStatus(record);
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([status, count]) => ({
      status,
      count,
      pct: total ? Math.round((count / total) * 100) : 0,
      color: ATTENDANCE_STATUS_COLORS[status] ?? "#64748b",
    }))
    .sort((a, b) => b.count - a.count);
}
