import { useState, useMemo } from 'react'
import { motion, type Variants } from 'framer-motion'
import { getSession } from '../../../../app/auth/session'
import { useDepartmentUsersAnalytics } from '../../hooks/useTaskHistory'
import { useAssigningUsers } from '../../hooks/useAssigningUsers'
import { SectionCard } from '../../../../components/head/shared/SectionCard'
import { Pill } from '../../../../components/ui/Pill'
import { LoadingState } from '../../../../components/ui/LoadingState'
import { ErrorState } from '../../../../components/ui/ErrorState'
import type { FeaturePermission } from '../../../permissions/types/permission.types'
import type { DepartmentUserAnalyticItem } from '../../../../api/history.api'
import './MeetingPage.css'

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

export function AnalyticsPage(_props?: { feature?: FeaturePermission }) {
  const session = getSession()
  const currentDepartment =
    session?.user.departmentType || 'GOOGLE_DEPARTMENT'

  const [selectedUser, setSelectedUser] = useState<string>('')
  const [page, setPage] = useState(0)
  const pageSize = 10

  const todayIso = useMemo(() => {
    const d = new Date()
    return d.toISOString().slice(0, 10)
  }, [])

  const [dateFrom, setDateFrom] = useState(todayIso)
  const [dateTo, setDateTo] = useState(todayIso)

  const startDate = `${dateFrom}T00:00:00`
  const endDate = `${dateTo}T23:59:59`

  // 1. Assigning users API: /api/meetings/users/assigning-list?departmentType=GOOGLE_DEPARTMENT
  const assigningUsersQuery = useAssigningUsers(currentDepartment)

  // 2. Analytics API: /api/analytics/departmentUsers?startDate=...&endDate=...&page=0&size=10
  const analyticsQuery = useDepartmentUsersAnalytics({
    userId: selectedUser || undefined,
    startDate,
    endDate,
    page,
    size: pageSize,
  })

  const members: DepartmentUserAnalyticItem[] =
    analyticsQuery.data?.teamMembers ?? analyticsQuery.data?.data ?? []
  const totalMembers =
    analyticsQuery.data?.totalMembers ??
    analyticsQuery.data?.totalElements ??
    members.length

  function handleRefresh() {
    void assigningUsersQuery.refetch()
    void analyticsQuery.refetch()
  }

  return (
    <motion.div
      className="meeting-page"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* ── Toolbar: User Filter, Date Range, Refresh ── */}
      <motion.div className="meeting-toolbar" variants={sectionVariants}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ minWidth: 200 }}>
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
              {(assigningUsersQuery.data ?? []).map((user) => (
                <option key={user.email} value={user.email}>
                  {user.username ? `${user.username} (${user.email})` : user.email}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setPage(0)
              }}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
              }}
            />
            <span style={{ fontSize: 13, color: '#64748b' }}>To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setPage(0)
              }}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
              }}
            />
          </div>
        </div>

        <div className="meeting-actions">
          <button
            type="button"
            className="meeting-action-btn"
            onClick={handleRefresh}
            title="Refresh analytics"
          >
            ↻ Refresh
          </button>
        </div>
      </motion.div>

      {/* ── Content ── */}
      {analyticsQuery.isPending && !analyticsQuery.data ? (
        <LoadingState message="Loading department analytics..." />
      ) : analyticsQuery.isError ? (
        <ErrorState
          title="Unable to load analytics"
          message={analyticsQuery.error.message}
          onRetry={handleRefresh}
        />
      ) : (
        <motion.div variants={sectionVariants}>
          <SectionCard
            title="Department Users Analytics"
            meta={
              <Pill tone="info" size="sm">
                {totalMembers} team members
              </Pill>
            }
            hint={`Department: ${currentDepartment}`}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Member</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Role</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>Total</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>Completed</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>In Progress</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>Pending</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>Delayed</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>Achieved %</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                        No user analytics found for the selected period
                      </td>
                    </tr>
                  ) : (
                    members.map((m: DepartmentUserAnalyticItem, idx: number) => (
                      <tr
                        key={m.userId ?? idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.15s',
                        }}
                      >
                        <td style={{ padding: '12px 12px' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{m.name || m.email}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{m.email}</div>
                        </td>
                        <td style={{ padding: '12px 12px', color: '#64748b' }}>
                          {m.role || 'MEMBER'}
                        </td>
                        <td style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 600 }}>
                          {m.allTimeCustomers ?? m.assigned ?? 0}
                        </td>
                        <td style={{ padding: '12px 12px', textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>
                          {m.completed ?? 0}
                        </td>
                        <td style={{ padding: '12px 12px', textAlign: 'center', color: '#2563eb' }}>
                          {m.assigned ?? 0}
                        </td>
                        <td style={{ padding: '12px 12px', textAlign: 'center', color: '#d97706' }}>
                          {m.pendingCustomers ?? 0}
                        </td>
                        <td style={{ padding: '12px 12px', textAlign: 'center', color: '#dc2626' }}>
                          {m.delayed ?? 0}
                        </td>
                        <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                          <Pill
                            tone={(m.achievedPercentage ?? 0) >= 80 ? 'success' : (m.achievedPercentage ?? 0) >= 50 ? 'warning' : 'neutral'}
                            size="sm"
                          >
                            {m.achievedPercentage ?? 0}%
                          </Pill>
                        </td>
                        <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                          <span style={{ color: '#16a34a', fontWeight: 600 }}>{m.presentDays ?? 0}P</span>
                          {' / '}
                          <span style={{ color: '#dc2626' }}>{m.absentDays ?? 0}A</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalMembers > pageSize && (
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
                  disabled={(page + 1) * pageSize >= totalMembers}
                  onClick={() => setPage((p) => p + 1)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: (page + 1) * pageSize >= totalMembers ? '#f1f5f9' : '#fff',
                    color: (page + 1) * pageSize >= totalMembers ? '#94a3b8' : '#334155',
                    cursor: (page + 1) * pageSize >= totalMembers ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </SectionCard>
        </motion.div>
      )}
    </motion.div>
  )
}

