import { useState, useMemo } from 'react'
import { motion, type Variants } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { getSession } from '../../../../app/auth/session'
import { useTaskHistory, useDepartmentUsersAnalytics } from '../../hooks/useTaskHistory'
import { useDepartmentUsersList } from '../../hooks/useDepartmentUsersList'
import { getStatusHistory, type StatusHistoryItem } from '../../../../api/status-history.api'
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
type HistoryView = 'task-history' | 'status-history'

export function HistoryPage(_props?: { feature?: FeaturePermission }) {
  const session = getSession()
  const isHead = session?.user.role !== 'USER'
  const userEmail = session?.user.email || ''

  const [activeView, setActiveView] = useState<HistoryView>('task-history')
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusTab>('all')
  const [page, setPage] = useState(0)
  const pageSize = 10

  // 1. Department Users (size=100) for Head filter: /api/auth/department/users?page=0&size=100
  const deptUsersQuery = useDepartmentUsersList({
    page: 0,
    size: 100,
  })

  // Date range for analytics (default: today)
  const todayIso = useMemo(() => {
    const d = new Date()
    return d.toISOString().slice(0, 10)
  }, [])

  const startDate = `${todayIso}T00:00:00`
  const endDate = `${todayIso}T23:59:59`

  // 2. Task History Query: /api/task-history/department?pageNumber=0&pageSize=10
  const historyQuery = useTaskHistory({
    departmentUserFilter: isHead ? (selectedUser || undefined) : userEmail,
    taskState: statusFilter === 'all' ? undefined : statusFilter,
    customerName: search || undefined,
    pageNumber: page,
    pageSize,
  })

  // 3. Status History Query: /api/status-history/get-all?page=0&size=10
  const statusHistoryQuery = useQuery({
    queryKey: ['status-history', { page, size: pageSize, search }],
    queryFn: () =>
      getStatusHistory({
        page,
        size: pageSize,
        customerName: search || undefined,
        leadName: search || undefined,
      }),
    enabled: activeView === 'status-history',
    staleTime: 30_000,
  })

  // 4. Analytics Query
  const analyticsQuery = useDepartmentUsersAnalytics({
    userId: isHead ? (selectedUser || undefined) : userEmail,
    startDate,
    endDate,
    page: 0,
    size: 10,
  })

  const historyItems = historyQuery.data?.data ?? []
  const totalElements = historyQuery.data?.totalElements ?? 0

  const statusHistoryItems = statusHistoryQuery.data?.data ?? []
  const totalStatusElements = statusHistoryQuery.data?.totalElements ?? statusHistoryItems.length

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
    void statusHistoryQuery.refetch()
    void analyticsQuery.refetch()
  }

  if (activeView === 'task-history' && historyQuery.isPending && !historyQuery.data) {
    return <LoadingState message="Loading task history..." />
  }

  if (activeView === 'task-history' && historyQuery.isError) {
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
      {/* ── View Switcher: Task History vs Status History ── */}
      <motion.div variants={sectionVariants} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => {
            setActiveView('task-history')
            setPage(0)
          }}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            border: 'none',
            background: activeView === 'task-history' ? '#2563eb' : '#e2e8f0',
            color: activeView === 'task-history' ? '#ffffff' : '#475569',
            transition: 'all 0.15s ease',
          }}
        >
          Task History
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveView('status-history')
            setPage(0)
          }}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            border: 'none',
            background: activeView === 'status-history' ? '#2563eb' : '#e2e8f0',
            color: activeView === 'status-history' ? '#ffffff' : '#475569',
            transition: 'all 0.15s ease',
          }}
        >
          Status History
        </button>
      </motion.div>

      {/* ── Toolbar: Search, User Selector & Refresh ── */}
      <motion.div className="meeting-toolbar" variants={sectionVariants}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
          <div className="meeting-search-wrap" style={{ flex: 1, minWidth: 220 }}>
            <SearchBar
              value={search}
              onChange={handleSearchChange}
              placeholder={activeView === 'task-history' ? 'Search by customer name or phone' : 'Search by customer or lead name'}
            />
          </div>

          {/* User filter for Head: GET /api/auth/department/users?page=0&size=100 */}
          {isHead && activeView === 'task-history' && (
            <div style={{ minWidth: 220 }}>
              <select
                value={selectedUser}
                onChange={(e) => {
                  setSelectedUser(e.target.value)
                  setPage(0)
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  background: '#fff',
                  color: '#1e293b',
                }}
              >
                <option value="">All Department Users</option>
                {(deptUsersQuery.data?.data ?? []).map((u) => (
                  <option key={u.email} value={u.email}>
                    {u.username ? `${u.username} (${u.email})` : u.email}
                  </option>
                ))}
              </select>
            </div>
          )}
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

      {/* ── Task History View ── */}
      {activeView === 'task-history' && (
        <>
          {/* Status Tabs Filter */}
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

          {/* Table */}
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
              hint={selectedUser ? `Filtered for ${selectedUser}` : isHead ? 'All users' : `History for ${userEmail}`}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                      <th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Customer</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Assigned To</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Service</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Phase</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Service Status</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Status</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Timeline</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Remarks</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Record</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                          No task history records found
                        </td>
                      </tr>
                    ) : (
                      historyItems.map((item, index) => {
                        const serviceStatus = (item.serviceStatus || 'ACTIVE').toUpperCase()
                        const status = (item.status || 'Pending')
                        
                        const assignedDateStr = (item.assignedAt || item.createdAt || item.startedAt)
                          ? new Date(item.assignedAt || item.createdAt || item.startedAt || '').toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : null

                        const endedDateStr = item.endedAt
                          ? new Date(item.endedAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : null

                        const isPendingStatus = status.toLowerCase() === 'pending'
                        const isCompletedStatus = status.toLowerCase() === 'completed' || status.toLowerCase() === 'done'

                        return (
                          <tr
                            key={item.id ?? index}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              transition: 'background 0.15s',
                            }}
                          >
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>
                              {item.customerName || '—'}
                            </td>
                            <td style={{ padding: '10px 12px', color: '#475569' }}>
                              {item.assignedTo || item.username || item.departmentUserFilter || '—'}
                            </td>
                            <td style={{ padding: '10px 12px', color: '#475569' }}>
                              {item.departmentServiceName || item.serviceType || 'ONBOARDING CUSTOMER'}
                            </td>
                            <td style={{ padding: '10px 12px', color: '#475569' }}>
                              {item.phaseName || 'Default'}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '4px 10px',
                                borderRadius: '9999px',
                                fontSize: '11px',
                                fontWeight: 600,
                                background: serviceStatus === 'ACTIVE' || serviceStatus === 'REASSIGNED' ? '#3b82f6' : serviceStatus === 'COMPLETED' ? '#10b981' : '#e2e8f0',
                                color: serviceStatus === 'ACTIVE' || serviceStatus === 'REASSIGNED' || serviceStatus === 'COMPLETED' ? '#ffffff' : '#475569',
                                textTransform: 'uppercase'
                              }}>
                                {serviceStatus}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '9999px',
                                fontSize: '12px',
                                fontWeight: 600,
                                border: `1px solid ${isPendingStatus ? '#fde047' : isCompletedStatus ? '#86efac' : '#cbd5e1'}`,
                                background: isPendingStatus ? '#fef9c3' : isCompletedStatus ? '#dcfce3' : '#f1f5f9',
                                color: isPendingStatus ? '#ca8a04' : isCompletedStatus ? '#16a34a' : '#475569',
                                textTransform: 'capitalize'
                              }}>
                                {isPendingStatus && (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 22h14" />
                                    <path d="M5 2h14" />
                                    <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
                                    <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
                                  </svg>
                                )}
                                {!isPendingStatus && (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                                {status}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '12px' }}>
                              {assignedDateStr && <div>Assigned {assignedDateStr}</div>}
                              {endedDateStr && <div style={{ color: '#16a34a', marginTop: 2 }}>Ended {endedDateStr}</div>}
                              {!assignedDateStr && !endedDateStr && '—'}
                            </td>
                            <td style={{ padding: '10px 12px', color: '#64748b' }}>
                              {item.remarks || 'Assigned manually'}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <a href="#" style={{ color: '#3b82f6', display: 'inline-flex', alignItems: 'center' }} onClick={(e) => e.preventDefault()}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                  <polyline points="15 3 21 3 21 9"></polyline>
                                  <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                              </a>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalElements > pageSize && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 12px 4px' }}>
                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      background: page === 0 ? '#f1f5f9' : '#fff',
                      color: page === 0 ? '#94a3b8' : '#334155',
                      cursor: page === 0 ? 'not-allowed' : 'pointer',
                      fontSize: 12,
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ padding: '6px 10px', fontSize: 13, color: '#64748b' }}>
                    Page {page + 1}
                  </span>
                  <button
                    type="button"
                    disabled={(page + 1) * pageSize >= totalElements}
                    onClick={() => setPage((p) => p + 1)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      background: (page + 1) * pageSize >= totalElements ? '#f1f5f9' : '#fff',
                      color: (page + 1) * pageSize >= totalElements ? '#94a3b8' : '#334155',
                      cursor: (page + 1) * pageSize >= totalElements ? 'not-allowed' : 'pointer',
                      fontSize: 12,
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </SectionCard>
          </motion.div>
        </>
      )}

      {/* ── Status History View: /api/status-history/get-all?page=0&size=10 ── */}
      {activeView === 'status-history' && (
        <motion.div variants={sectionVariants}>
          <SectionCard
            title="Status Change History"
            meta={
              <Pill tone="info" size="sm">
                {totalStatusElements} logs
              </Pill>
            }
            hint="System status audit logs"
          >
            {statusHistoryQuery.isPending && !statusHistoryQuery.data ? (
              <LoadingState message="Loading status history..." />
            ) : statusHistoryQuery.isError ? (
              <ErrorState
                title="Unable to load status history"
                message={statusHistoryQuery.error.message}
                onRetry={handleRefresh}
              />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>#</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Customer / Lead</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Old Status</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>New Status</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Updated By</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Date & Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statusHistoryItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                          No status history logs found
                        </td>
                      </tr>
                    ) : (
                      statusHistoryItems.map((item: StatusHistoryItem, idx) => (
                        <tr
                          key={item.id ?? idx}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background 0.15s',
                          }}
                        >
                          <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{page * pageSize + idx + 1}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>
                            {item.customerName || item.leadName || `ID: ${item.customerId || item.leadId || '—'}`}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <Pill tone="neutral" size="sm">
                              {item.oldStatus || '—'}
                            </Pill>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <Pill tone="success" size="sm">
                              {item.newStatus || '—'}
                            </Pill>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#475569' }}>
                            {item.updatedBy || 'System'}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#64748b' }}>
                            {item.createdAt
                              ? new Date(item.createdAt).toLocaleString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </motion.div>
      )}
    </motion.div>
  )
}
