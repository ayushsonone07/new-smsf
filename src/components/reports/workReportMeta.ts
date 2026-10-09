import type { PillTone } from '../ui/Pill'
import type {
  DelaySide,
  WorkItemStatus,
} from '../../features/reports/types/staff-report.types'

export const STATUS_META: Record<
  WorkItemStatus,
  { label: string; tone: PillTone }
> = {
  COMPLETED: { label: 'Completed', tone: 'success' },
  IN_PROGRESS: { label: 'In progress', tone: 'info' },
  PENDING: { label: 'Pending', tone: 'warning' },
}

export const SIDE_META: Record<
  DelaySide,
  { label: string; tone: PillTone }
> = {
  CLIENT: { label: 'Client side', tone: 'warning' },
  OURS: { label: 'Our side', tone: 'info' },
  TECH: { label: 'Tech / other dept', tone: 'danger' },
}
