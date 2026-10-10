import { useState, useMemo, useRef, useEffect } from 'react'
import { Icon } from '../shared/Icon'
import { Avatar } from '../shared/Avatar'

export interface TeamMemberPerformance {
  id: string
  name: string
  email: string
  allTimeCustomers: number
  attendance: 'Present' | 'Absent'
  presentDays: number
  absentDays: number
  assigned: number
  completed: number
  delayed: number
  target: number
  achievedPercent: number
}

export interface TeamTargetPerformanceProps {
  members: TeamMemberPerformance[]
  onSelectMember: (member: TeamMemberPerformance) => void
  onRefresh?: () => void
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  onLoadMore?: () => void
  totalMembers?: number
}

/**
 * Team Target & Performance full table component.
 * Supports search filtering, row clicking to open member details modal,
 * and paginated infinite scroll (loads 10 members initially, then loads 10 more on scroll).
 */
export function TeamTargetPerformance({
  members,
  onSelectMember,
  onRefresh,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  totalMembers,
}: TeamTargetPerformanceProps) {
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLTableRowElement>(null)

  const presentCount = members.filter((m) => m.attendance === 'Present').length
  const absentCount = members.filter((m) => m.attendance === 'Absent').length

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return members
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        String(m.allTimeCustomers).includes(q),
    )
  }, [members, search])

  // 1. IntersectionObserver on sentinel row at table bottom
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage || !onLoadMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore()
        }
      },
      {
        root: null,
        rootMargin: '250px',
        threshold: 0,
      },
    )

    const el = sentinelRef.current
    if (el) {
      observer.observe(el)
    }

    return () => {
      if (el) observer.unobserve(el)
      observer.disconnect()
    }
  }, [hasNextPage, isFetchingNextPage, onLoadMore])

  // 2. Container scroll listener on .hdb-team-table-wrap
  const handleContainerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollHeight - scrollTop - clientHeight < 150) {
      if (hasNextPage && !isFetchingNextPage && onLoadMore) {
        onLoadMore()
      }
    }
  }

  // 3. Window scroll listener when scrolling down the dashboard page
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage || !onLoadMore) return

    const handleWindowScroll = () => {
      if (!sentinelRef.current) return
      const rect = sentinelRef.current.getBoundingClientRect()
      if (rect.top <= window.innerHeight + 250) {
        onLoadMore()
      }
    }

    window.addEventListener('scroll', handleWindowScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleWindowScroll)
  }, [hasNextPage, isFetchingNextPage, onLoadMore])

  return (
    <div className="hdb-team-table-card">
      <div className="hdb-team-table__header">
        <div className="hdb-team-table__title-area">
          <h3 className="hdb-card__title">Team Target & Performance</h3>
          <span className="hdb-pill hdb-pill--present">{presentCount} present</span>
          <span className="hdb-pill hdb-pill--absent">{absentCount} absent</span>
        </div>

        <div className="hdb-team-table__search-area">
          <div className="hdb-team-search">
            <Icon name="search" size={14} strokeWidth={2} />
            <input
              type="search"
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search team members"
            />
          </div>

          <button
            type="button"
            className="icon-btn icon-btn--outline"
            style={{ width: 36, height: 36 }}
            title="Refresh team performance"
            aria-label="Refresh team performance"
            onClick={onRefresh}
          >
            <Icon name="refresh" size={15} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="hdb-team-table-wrap"
        onScroll={handleContainerScroll}
      >
        <table className="hdb-table">
          <thead>
            <tr>
              <th>MEMBER</th>
              <th>ATTENDANCE</th>
              <th>PRESENT / ABSENT DAYS</th>
              <th>ASSIGNED</th>
              <th>COMPLETED</th>
              <th>DELAYED</th>
              <th>TARGET</th>
              <th>ACHIEVED</th>
              <th style={{ width: 30 }} />
            </tr>
          </thead>
          <tbody>
            {filteredMembers.length === 0 && !isFetchingNextPage ? (
              <tr>
                <td
                  colSpan={9}
                  style={{
                    textAlign: 'center',
                    padding: '36px 16px',
                    color: '#64748b',
                    fontSize: 14,
                  }}
                >
                  No team members found for this period
                </td>
              </tr>
            ) : (
              filteredMembers.map((member) => (
                <tr
                  key={member.id}
                  onClick={() => onSelectMember(member)}
                  title="Click to view member details"
                >
                  {/* Member */}
                  <td>
                    <div className="hdb-member-cell">
                      <Avatar
                        name={member.name}
                        size={32}
                        tone={
                          member.name.startsWith('A')
                            ? 'brand'
                            : member.name.startsWith('M')
                              ? 'soft'
                              : 'muted'
                        }
                      />
                      <div className="hdb-member-info">
                        <strong>{member.name}</strong>
                        <span>{member.allTimeCustomers} customers all-time</span>
                      </div>
                    </div>
                  </td>

                  {/* Attendance */}
                  <td>
                    <span
                      className={`hdb-pill ${
                        member.attendance === 'Present'
                          ? 'hdb-pill--present'
                          : 'hdb-pill--absent'
                      }`}
                    >
                      {member.attendance}
                    </span>
                  </td>

                  {/* Present / Absent Days */}
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span className="hdb-pill hdb-pill--pa-p">
                        {member.presentDays} P
                      </span>
                      <span className="hdb-pill hdb-pill--pa-a">
                        {member.absentDays} A
                      </span>
                    </div>
                  </td>

                  {/* Assigned */}
                  <td>
                    <strong>{member.assigned}</strong>
                  </td>

                  {/* Completed */}
                  <td>
                    <strong>{member.completed}</strong>
                  </td>

                  {/* Delayed */}
                  <td>
                    <strong style={{ color: member.delayed > 0 ? '#dc2626' : '#64748b' }}>
                      {member.delayed}
                    </strong>
                  </td>

                  {/* Target */}
                  <td>
                    <strong>{member.target}</strong>
                  </td>

                  {/* Achieved */}
                  <td>
                    <div className="hdb-achieved-cell">
                      <div className="hdb-achieved-bar-bg">
                        <div
                          className={`hdb-achieved-bar-fill ${
                            member.achievedPercent >= 100
                              ? 'hdb-achieved-bar-fill--green'
                              : 'hdb-achieved-bar-fill--blue'
                          }`}
                          style={{
                            width: `${Math.min(member.achievedPercent, 100)}%`,
                          }}
                        />
                      </div>
                      <span className="hdb-achieved-percent">
                        {member.achievedPercent}%
                      </span>
                    </div>
                  </td>

                  {/* Arrow */}
                  <td>
                    <span className="hdb-row-arrow">›</span>
                  </td>
                </tr>
              ))
            )}

            {/* Sentinel row for IntersectionObserver */}
            {hasNextPage && (
              <tr ref={sentinelRef} className="hdb-sentinel-row" style={{ height: 1 }}>
                <td colSpan={9} style={{ padding: 0, height: 1, border: 'none', background: 'transparent' }} />
              </tr>
            )}

            {/* Loading indicator when fetching next 10 members */}
            {isFetchingNextPage && (
              <tr className="hdb-loading-more-row">
                <td
                  colSpan={9}
                  style={{
                    textAlign: 'center',
                    padding: '14px',
                    color: '#2563eb',
                    fontSize: 13,
                    fontWeight: 500,
                    background: '#f8fafc',
                  }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span className="hdb-spinner-dot" />
                    <span>Loading more members...</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer bar with member count & pagination state */}
      <div className="hdb-team-table__footer">
        <span className="hdb-team-table__count-info">
          Showing <strong>{filteredMembers.length}</strong>
          {totalMembers && totalMembers > filteredMembers.length
            ? ` of ${totalMembers}`
            : ''}{' '}
          members
        </span>

        {hasNextPage ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>
              Scroll down to load more
            </span>
            <button
              type="button"
              className="hdb-team-table__load-btn"
              onClick={onLoadMore}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? 'Loading...' : 'Load more 10'}
            </button>
          </div>
        ) : members.length > 0 ? (
          <span style={{ color: '#16a34a', fontSize: 12, fontWeight: 500 }}>
            ✓ All {members.length} members loaded
          </span>
        ) : null}
      </div>
    </div>
  )
}
