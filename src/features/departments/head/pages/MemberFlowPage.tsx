import { useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { getSession } from '../../../../app/auth/session'
import {
  getDepartmentMembersPerformance,
  type MemberPerformanceItem,
} from '../../../../api/member-performance.api'
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

export function MemberFlowPage(_props?: { feature?: FeaturePermission }) {
  const session = getSession()
  const currentDepartment =
    session?.user.departmentType || 'GOOGLE_DEPARTMENT'

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 10

  // 1. Members performance API: /api/auth/department/members/performance?page=0&size=10&departmentType=GOOGLE_DEPARTMENT
  const membersQuery = useQuery({
    queryKey: ['members-performance', { page, size: pageSize, departmentType: currentDepartment, search }],
    queryFn: () =>
      getDepartmentMembersPerformance({
        page,
        size: pageSize,
        departmentType: currentDepartment,
        searchTerm: search || undefined,
      }),
    staleTime: 30_000,
  })

  const members = membersQuery.data?.data ?? []
  const totalElements = membersQuery.data?.totalElements ?? members.length

  function handleRefresh() {
    void membersQuery.refetch()
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
            onChange={(val) => {
              setSearch(val)
              setPage(0)
            }}
            placeholder="Search member by name or email..."
          />
        </div>

        <div className="meeting-actions">
          <button
            type="button"
            className="meeting-action-btn"
            onClick={handleRefresh}
            title="Refresh members performance"
          >
            ↻ Refresh
          </button>
        </div>
      </motion.div>

      {/* ── Content ── */}
      {membersQuery.isPending && !membersQuery.data ? (
        <LoadingState message="Loading member performance..." />
      ) : membersQuery.isError ? (
        <ErrorState
          title="Unable to load member performance"
          message={membersQuery.error.message}
          onRetry={handleRefresh}
        />
      ) : (
        <motion.div variants={sectionVariants}>
          <SectionCard
            title="Member Performance & Workload"
            meta={
              <Pill tone="info" size="sm">
                {totalElements} members
              </Pill>
            }
            hint={`Department: ${currentDepartment}`}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Member</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>Total Assigned</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>Completed</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>In Progress</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>Pending</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>Attendance</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>Performance %</th>
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                        No member performance records found.
                      </td>
                    </tr>
                  ) : (
                    members.map((member: MemberPerformanceItem, idx) => (
                      <tr
                        key={member.userId ?? idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.15s',
                        }}
                      >
                        <td style={{ padding: '12px 12px' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>
                            {member.userName || member.name || member.email}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{member.email}</div>
                        </td>
                        <td style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 600 }}>
                          {member.totalCustomers ?? 0}
                        </td>
                        <td style={{ padding: '12px 12px', textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>
                          {member.completedCustomers ?? 0}
                        </td>
                        <td style={{ padding: '12px 12px', textAlign: 'center', color: '#2563eb' }}>
                          {member.inProgressCustomers ?? 0}
                        </td>
                        <td style={{ padding: '12px 12px', textAlign: 'center', color: '#d97706' }}>
                          {member.pendingCustomers ?? 0}
                        </td>
                        <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                          <span style={{ color: '#16a34a', fontWeight: 600 }}>
                            {member.presentDays ?? 0} Present
                          </span>
                          {' / '}
                          <span style={{ color: '#dc2626' }}>
                            {member.absentDays ?? 0} Absent
                          </span>
                        </td>
                        <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                          <Pill
                            tone={
                              (member.performancePercentage ?? member.achievedPercentage ?? 0) >= 80
                                ? 'success'
                                : (member.performancePercentage ?? member.achievedPercentage ?? 0) >= 50
                                  ? 'warning'
                                  : 'neutral'
                            }
                            size="sm"
                          >
                            {Math.round(member.performancePercentage ?? member.achievedPercentage ?? member.conversionRate ?? 0)}%
                          </Pill>
                        </td>
                      </tr>
                    ))
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
      )}
    </motion.div>
  )
}

