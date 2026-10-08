export type WorkItemStatus =
  | 'COMPLETED'
  | 'IN_PROGRESS'
  | 'PENDING'

/** Who is responsible for a delay. */
export type DelaySide = 'CLIENT' | 'OURS' | 'TECH'

export type Attendance = 'PRESENT' | 'ABSENT'

export interface StaffReportPerson {
  name: string
  email: string
  /** e.g. "Today", "07 Oct 2026" */
  dateLabel?: string
  attendance?: Attendance
  avatarText?: string
  avatarSrc?: string
}

export interface WorkReportItem {
  id: string
  customerName: string
  contactName?: string
  city?: string
  status: WorkItemStatus
  /** 0 = on time */
  delayDays: number
  delaySide?: DelaySide
  /** Headline reason (shown in red when delayed). */
  reason?: string
  /** Latest remark / note. */
  remark?: string
}

export interface StaffReportSummary {
  target: number
  completed: number
  achievedPercent: number
  delayed: number
  present: number
  absent: number
  clientSide: number
  ourSide: number
  techSide: number
}

/** Filter options for the modal's tab strip. */
export type WorkReportFilter =
  | 'ALL'
  | 'DELAYED'
  | WorkItemStatus
