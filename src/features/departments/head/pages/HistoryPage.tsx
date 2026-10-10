import { useState, useMemo } from 'react'
import { motion, type Variants } from 'framer-motion'
import { getSession } from '../../../../app/auth/session'
import { useTaskHistory, useDepartmentUsersAnalytics } from '../../hooks/useTaskHistory'
import { SearchBar } from '../../../../components/head/shared/SearchBar'
import { SectionCard } from '../../../../components/head/shared/SectionCard'
import { Pill } from '../../../../components/ui/Pill'
import { LoadingState } from '../../../../components/ui/LoadingState'
import { ErrorState } from '../../../../components/ui/ErrorState'
import type { FeaturePermission } from '../../../permissions/types/permission.types'
import './MeetingPage.css'

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

type StatusTab = 'all' | 'ACTIVE' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'

export function HistoryPage(_props?: { feature?: FeaturePermission }) {
  const session = getSession()
  const userEmail = session?.user.email || ''

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusTab>('all')
  const [page, setPage] = useState(0)
  const pageSize = 10

  // Date range for analytics (default: today)
  const todayIso = useMemo(() => {
    const d = new Date()
    return d.toISOString().slice(0, 10)
  }, [])

  const startDate = `${todayIso}T00:00:00`
  const endDate = `${todayIso}T23:59:59`

  // 1. Task History Query
  const historyQuery = useTaskHistory({
    departmentUserFilter: userEmail,
    taskState: statusFilter === 'all' ? undefined : statusFilter,
    customerName: search || undefined,
    pageNumber: page,
    pageSize,
  })

  // 2. Analytics Query
  const analyticsQuery = useDepartmentUsersAnalytics({
    userId: userEmail,
    startDate,
    endDate,
    page: 0,
    size: 10,
  })

  const historyItems = historyQuery.data?.data ?? []
  const totalElements = historyQuery.data?.totalElements ?? 0
  const totalPage = historyQuery.data?.totalPage ?? 1

  const activeCount = historyItems.filter((i) => i.status === 'ACTIVE' || i.isActive).length
  const completedCount = historyItems.filter((i) => i.status === 'COMPLETED').length
  const pendingCount = historyItems.filter((i) => i.serviceStatus === 'PENDING').length

  function handleSearchChange(val: string) {
    setSearch(val)
    setPage(0)
  }

  function handleStatusTab(tab: StatusTab) {
    setStatusFilter(tab)
    setPage(0)
  }

  function handleRefresh() {
    void historyQuery.refetch()
    void analyticsQuery.refetch()
  }

  if (historyQuery.isPending && !historyQuery.data) {
    return <LoadingState message="Loading task history..." />
  }

  if (historyQuery.isError) {
    return (
      <ErrorState
        title="Unable to load task history"
        message={historyQuery.error.message}
        onRetry={handleRefresh}
      />
    )
  }

  return (
    <motion.div
      className="meeting-page"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* ── Toolbar: Search & Refresh ── */}
      <motion.div className="meeting-toolbar" variants={sectionVariants}>
        <div className="meeting-search-wrap">
          <SearchBar
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by customer name or phone"
          />
        </div>

        <div className="meeting-actions">
          <button
            type="button"
            className="meeting-action-btn"
            onClick={handleRefresh}
            title="Refresh history"
          >
            ↻ Refresh
          </button>
        </div>
      </motion.div>

      {/* ── Status Tabs Filter ── */}
      <motion.div variants={sectionVariants} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(
            [
              { key: 'all', label: 'All Tasks' },
              { key: 'ACTIVE', label: 'Active' },
              { key: 'PENDING', label: 'Pending' },
              { key: 'IN_PROGRESS', label: 'In Progress' },
              { key: 'COMPLETED', label: 'Completed' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleStatusTab(tab.key)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 500,
                border: '1px solid',
                borderColor: statusFilter === tab.key ? '#2563eb' : '#e2e8f0',
                background: statusFilter === tab.key ? '#2563eb' : '#ffffff',
                color: statusFilter === tab.key ? '#ffffff' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Task History Table ── */}
      <motion.div variants={sectionVariants}>
        <SectionCard
          title="Task History"
          meta={
            <>
              <Pill tone="info" size="sm">
                {totalElements} total
              </Pill>
              <Pill tone="success" size="sm">
                {activeCount} active
              </Pill>
              <Pill tone="warning" size="sm">
                {pendingCount} pending
              </Pill>
              <Pill tone="neutral" size="sm">
                {completedCount} completed
              </Pill>
            </>
          }
          hint={`History for ${userEmail}`}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>#</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Customer</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Assigned To</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Service</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Phase</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Service Status</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Timeline</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Remarks</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Contact</th>
                </tr>
              </thead>
              <tbody>
                {historyItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '36px 12px', textAlign: 'center', color: '#94a3b8' }}>
                      No task history found for this period.
                    </td>
                  </tr>
                ) : (
                  historyItems.map((item, index) => {
                    const statusLower = (item.status || '').toLowerCase()
                    const isCompleted = statusLower === 'completed'
                    const isActive = item.isActive || statusLower === 'active'

                    return (
                      <tr
                        key={item.id ?? `${item.customerName}-${index}`}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <td style={{ padding: '10px 12px', color: '#94a3b8' }}>
                          {page * pageSize + index + 1}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>
                          {item.customerName || '—'}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>
                          {item.assignedTo || '—'}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              borderRadius: 4,
                              fontSize: 12,
                            }}
                          >
                            {item.serviceType || 'ONBOARDING'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#64748b' }}>
                          {item.phaseName || 'Default'}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#64748b' }}>
                          {item.serviceStatus || 'PENDING'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              padding: '3px 9px',
                              borderRadius: 12,
                              fontSize: 12,
                              fontWeight: 500,
                              background: isCompleted ? '#dcfce7' : isActive ? '#dbeafe' : '#f1f5f9',
                              color: isCompleted ? '#15803d' : isActive ? '#1e40af' : '#475569',
                            }}
                          >
                            {item.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {item.assignedAt
                            ? new Date(item.assignedAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.remarks}>
                          {item.remarks || '—'}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569', whiteSpace: 'nowrap' }}>
                          {item.contact || '—'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </motion.div>

      {/* ── Pagination ── */}
      {totalPage > 1 && (
        <motion.div variants={sectionVariants} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || historyQuery.isFetching}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: page === 0 ? '#f1f5f9' : '#ffffff',
              color: page === 0 ? '#94a3b8' : '#334155',
              cursor: page === 0 ? 'not-allowed' : 'pointer',
              fontSize: 13,
            }}
          >
            Previous
          </button>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            Page {page + 1} of {totalPage} ({totalElements} total)
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPage - 1, p + 1))}
            disabled={page >= totalPage - 1 || historyQuery.isFetching}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: page >= totalPage - 1 ? '#f1f5f9' : '#ffffff',
              color: page >= totalPage - 1 ? '#94a3b8' : '#334155',
              cursor: page >= totalPage - 1 ? 'not-allowed' : 'pointer',
              fontSize: 13,
            }}
          >
            Next
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}
