import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Modal } from '../ui/Modal'
import { Pill } from '../ui/Pill'
import { FilterTabs } from '../ui/FilterTabs'
import type { FilterTab } from '../ui/FilterTabs'
import { StatTileRow, StatValue } from '../ui/StatTile'
import type { StatTileProps } from '../ui/StatTile'
import { ProfileHeader } from '../common/ProfileHeader'
import { WorkReportTable } from './WorkReportTable'
import type {
  StaffReportPerson,
  StaffReportSummary,
  WorkReportFilter,
  WorkReportItem,
} from '../../features/reports/types/staff-report.types'

interface StaffReportModalProps {
  open: boolean
  onClose: () => void
  person: StaffReportPerson
  items: WorkReportItem[]
  /** Daily target. Used to compute "Achieved %". */
  target: number
  /**
   * Override any computed summary number — e.g. when
   * the backend already returns totals.
   */
  summary?: Partial<StaffReportSummary>
  /** Replace the whole stats row with custom tiles. */
  stats?: StatTileProps[]
  /** Text shown right of the tabs. */
  hint?: ReactNode
  initialFilter?: WorkReportFilter
}

/**
 * Per-staff daily work report.
 *
 * Fully data-driven: pass a person + list of work
 * items and it derives stats, tab counts and the
 * filtered table. Nothing is hard-coded for a
 * specific employee or department.
 */
export function StaffReportModal({
  open,
  onClose,
  person,
  items,
  target,
  summary: summaryOverride,
  stats: statsOverride,
  hint = 'Hover a remark to read it in full',
  initialFilter = 'ALL',
}: StaffReportModalProps) {
  const [filter, setFilter] =
    useState<WorkReportFilter>(initialFilter)

  const summary = useMemo<StaffReportSummary>(() => {
    const completed = items.filter(
      (item) => item.status === 'COMPLETED',
    ).length

    const delayedItems = items.filter(
      (item) => item.delayDays > 0,
    )

    const computed: StaffReportSummary = {
      target,
      completed,
      achievedPercent:
        target > 0
          ? Math.round((completed / target) * 100)
          : 0,
      delayed: delayedItems.length,
      present: person.attendance === 'ABSENT' ? 0 : 1,
      absent: person.attendance === 'ABSENT' ? 1 : 0,
      clientSide: delayedItems.filter(
        (item) => item.delaySide === 'CLIENT',
      ).length,
      ourSide: delayedItems.filter(
        (item) => item.delaySide === 'OURS',
      ).length,
      techSide: delayedItems.filter(
        (item) => item.delaySide === 'TECH',
      ).length,
    }

    return { ...computed, ...summaryOverride }
  }, [items, target, person.attendance, summaryOverride])

  const stats: StatTileProps[] = statsOverride ?? [
    { label: 'Target', value: summary.target },
    {
      label: 'Completed',
      value: summary.completed,
      tone: 'success',
    },
    {
      label: 'Achieved',
      value: `${summary.achievedPercent}%`,
      tone: 'primary',
    },
    {
      label: 'Delayed',
      value: summary.delayed,
      tone: 'danger',
    },
    {
      label: 'Present / Absent',
      value: (
        <>
          <StatValue tone="teal">
            {summary.present}
          </StatValue>
          {' / '}
          <StatValue tone="teal">
            {summary.absent}
          </StatValue>
        </>
      ),
    },
    {
      label: 'Client / Ours / Tech',
      value: (
        <>
          <StatValue tone="warning">
            {summary.clientSide}
          </StatValue>
          {' / '}
          <StatValue tone="warning">
            {summary.ourSide}
          </StatValue>
          {' / '}
          <StatValue tone="warning">
            {summary.techSide}
          </StatValue>
        </>
      ),
    },
  ]

  const counts = useMemo(
    () => ({
      ALL: items.length,
      DELAYED: items.filter((item) => item.delayDays > 0)
        .length,
      IN_PROGRESS: items.filter(
        (item) => item.status === 'IN_PROGRESS',
      ).length,
      PENDING: items.filter(
        (item) => item.status === 'PENDING',
      ).length,
      COMPLETED: items.filter(
        (item) => item.status === 'COMPLETED',
      ).length,
    }),
    [items],
  )

  const tabs: FilterTab<WorkReportFilter>[] = [
    { value: 'ALL', label: 'All', count: counts.ALL },
    {
      value: 'DELAYED',
      label: 'Delayed',
      count: counts.DELAYED,
    },
    {
      value: 'IN_PROGRESS',
      label: 'In progress',
      count: counts.IN_PROGRESS,
    },
    {
      value: 'PENDING',
      label: 'Pending',
      count: counts.PENDING,
    },
    {
      value: 'COMPLETED',
      label: 'Completed',
      count: counts.COMPLETED,
    },
  ]

  const visibleItems = useMemo(() => {
    if (filter === 'ALL') {
      return items
    }

    if (filter === 'DELAYED') {
      return items.filter((item) => item.delayDays > 0)
    }

    return items.filter((item) => item.status === filter)
  }, [items, filter])

  const subtitle = [person.email, person.dateLabel]
    .filter(Boolean)
    .join(' · ')

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      flush
      className="modal staff-report-modal"
    >
      <ProfileHeader
        title={person.name}
        subtitle={subtitle}
        avatarText={person.avatarText}
        avatarSrc={person.avatarSrc}
        onClose={onClose}
        actions={
          person.attendance ? (
            <Pill
              tone={
                person.attendance === 'PRESENT'
                  ? 'success'
                  : 'danger'
              }
            >
              {person.attendance === 'PRESENT'
                ? 'Present'
                : 'Absent'}
            </Pill>
          ) : null
        }
      />

      <div className="staff-report-modal__body">
        <StatTileRow items={stats} />

        <FilterTabs
          tabs={tabs}
          value={filter}
          onChange={setFilter}
          trailing={hint}
          ariaLabel="Filter work items"
        />
      </div>

      <WorkReportTable items={visibleItems} />
    </Modal>
  )
}
