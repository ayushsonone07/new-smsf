import { useState, useMemo } from 'react'
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
}

/**
 * Team Target & Performance full table component.
 * Supports search filtering and row clicking to open member details modal.
 */
export function TeamTargetPerformance({
  members,
  onSelectMember,
  onRefresh,
}: TeamTargetPerformanceProps) {
  const [search, setSearch] = useState('')

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

      <div className="hdb-team-table-wrap">
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
            {filteredMembers.map((member) => (
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
