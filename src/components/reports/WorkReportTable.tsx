import { DataTable } from '../ui/DataTable'
import type { DataTableColumn } from '../ui/DataTable'
import { Pill } from '../ui/Pill'
import { SIDE_META, STATUS_META } from './workReportMeta'
import {
  DelayCell,
  EntityCell,
  RemarkCell,
} from '../common/TableCells'
import type { WorkReportItem } from '../../features/reports/types/staff-report.types'

interface WorkReportTableProps {
  items: WorkReportItem[]
  emptyMessage?: string
  /** Override column titles if needed. */
  labels?: Partial<{
    customer: string
    status: string
    delay: string
    remark: string
  }>
}

/**
 * Customer / status / delay / remark table.
 * Reusable on its own (e.g. inside a page) — the
 * modal just wraps it.
 */
export function WorkReportTable({
  items,
  emptyMessage = 'Nothing to show for this filter.',
  labels,
}: WorkReportTableProps) {
  const columns: DataTableColumn<WorkReportItem>[] = [
    {
      key: 'customer',
      title: labels?.customer ?? 'Customer',
      width: '30%',
      render: (item) => (
        <EntityCell
          primary={item.customerName}
          secondary={[item.contactName, item.city]}
        />
      ),
    },
    {
      key: 'status',
      title: labels?.status ?? 'Status',
      width: '14%',
      render: (item) => {
        const meta = STATUS_META[item.status]

        return <Pill tone={meta.tone}>{meta.label}</Pill>
      },
    },
    {
      key: 'delay',
      title: labels?.delay ?? 'Delay · Side',
      width: '24%',
      render: (item) => (
        <DelayCell
          days={item.delayDays}
          onTimeLabel={
            item.status === 'COMPLETED'
              ? 'On time'
              : 'On track'
          }
          tag={
            item.delayDays > 0 && item.delaySide
              ? SIDE_META[item.delaySide]
              : undefined
          }
        />
      ),
    },
    {
      key: 'remark',
      title: labels?.remark ?? 'Reason / Remark',
      render: (item) => (
        <RemarkCell
          title={item.reason}
          note={item.remark}
          alert={item.delayDays > 0}
          hoverText={[item.reason, item.remark]
            .filter(Boolean)
            .join(' — ')}
        />
      ),
    },
  ]

  return (
    <DataTable
      className="work-report-table"
      columns={columns}
      rows={items}
      rowKey={(item) => item.id}
      emptyState={emptyMessage}
    />
  )
}
