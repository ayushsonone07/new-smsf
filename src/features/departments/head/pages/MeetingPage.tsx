import { useMemo, useState, useRef, useEffect, type ChangeEvent } from 'react'
import { motion, type Variants } from 'framer-motion'
import { MeetingSearchBar } from '../../../../components/head/15-days-meeting/MeetingSearchBar'
import { MeetingFilters, type MeetingStatus } from '../../../../components/head/15-days-meeting/MeetingFilters'
import { MeetingList, type Meeting, type MeetingCustomer, type MeetingDepartment } from '../../../../components/head/15-days-meeting/MeetingList'
import { IconButton } from '../../../../components/head/shared/IconButton'
import { Icon } from '../../../../components/head/shared/Icon'
import { Button } from '../../../../components/ui/Button'
import { useAssigningUsers } from '../../hooks/useAssigningUsers'
import {
  useFollowUpRecentMeetings,
  useFollowUpDueMeetings,
  useFollowUpMeetingCounts,
} from '../../hooks/useFollowUpMeetings'
import { markMeetingDone, type CustomerFollowUpItem } from '../../../../api/meetings.api'
import { getSession } from '../../../../app/auth/session'
import './MeetingPage.css'

const controlsVariants: Variants = {
  hidden: { opacity: 0, y: -6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.24 } },
}

const panelVariants: Variants = {
  hidden: { opacity: 0, y: -5, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.14 } },
}

const mockCustomers: MeetingCustomer[] = [
  {
    name: 'Rohit Sharma',
    company: 'Shree Ganesh Hardware',
    phone: '9876501234',
    email: 'rohit@ganeshhardware.com',
  },
  {
    name: 'Priya Patel',
    company: 'Blue Bell School',
    phone: '9812345670',
    email: 'priya@bluebellschool.edu',
  },
  {
    name: 'Arjun Menon',
    company: 'Spice Route Kitchen',
    phone: '9899001122',
    email: 'arjun@spiceroute.in',
  },
  {
    name: 'Ritika Sen',
    company: 'Glow Salon',
    phone: '9123409876',
    email: 'ritika@glowsalon.com',
  },
  {
    name: 'Sandeep Yadav',
    company: 'AutoFix Garage',
    phone: '9001122334',
    email: 'sandeep@autofix.com',
  },
]

const mockDepartments: MeetingDepartment[] = [
  { id: 'dept-1', name: 'Onboarding', status: 'completed' },
  { id: 'dept-2', name: 'Website Creation', status: 'in-progress' },
  { id: 'dept-3', name: 'Google Service', status: 'completed' },
  { id: 'dept-4', name: 'SEO Service', status: 'pending' },
  { id: 'dept-5', name: 'Automation', status: 'pending' },
]

const initialMeetings: Meeting[] = [
  {
    id: 'mtg-1',
    createdAt: new Date('2026-09-18T16:28:00'),
    customer: mockCustomers[0],
    departments: [mockDepartments[0], mockDepartments[1], mockDepartments[2], mockDepartments[3]],
    meetingDate: new Date('2026-09-20T10:00:00'),
    isDone: true,
  },
  {
    id: 'mtg-2',
    createdAt: new Date('2026-09-17T14:15:00'),
    customer: mockCustomers[1],
    departments: [mockDepartments[0], mockDepartments[2], mockDepartments[4]],
    meetingDate: new Date('2026-09-19T11:30:00'),
    isDone: false,
  },
  {
    id: 'mtg-3',
    createdAt: new Date('2026-09-17T09:42:00'),
    customer: mockCustomers[2],
    departments: [mockDepartments[0], mockDepartments[3]],
    meetingDate: new Date('2026-09-21T14:00:00'),
    isDone: false,
  },
  {
    id: 'mtg-4',
    createdAt: new Date('2026-09-16T11:05:00'),
    customer: mockCustomers[3],
    departments: [mockDepartments[0], mockDepartments[1], mockDepartments[2]],
    meetingDate: new Date('2026-09-18T09:00:00'),
    isDone: true,
  },
  {
    id: 'mtg-5',
    createdAt: new Date('2026-09-15T16:47:00'),
    customer: mockCustomers[4],
    departments: [mockDepartments[0], mockDepartments[4]],
    meetingDate: new Date('2026-09-22T10:30:00'),
    isDone: false,
  },
]

function toMeeting(item: CustomerFollowUpItem, isDone: boolean): Meeting {
  return {
    id: String(item.customerId),
    createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
    customer: {
      name: item.ownerName || 'Customer',
      company: item.businessName || 'Business',
      phone: item.phoneNumber || '',
      email: item.email || '',
    },
    departments: (item.departments ?? []).map((d, idx) => ({
      id: d.departmentType || `dept-${idx}`,
      name: d.serviceType || d.departmentType || 'Onboarding',
      status:
        d.status?.toLowerCase() === 'completed'
          ? 'completed'
          : d.status?.toLowerCase() === 'in_progress'
            ? 'in-progress'
            : 'pending',
    })),
    meetingDate: item.lastMeetingAt
      ? new Date(item.lastMeetingAt)
      : item.createdAt
        ? new Date(item.createdAt)
        : new Date(),
    isDone,
  }
}

/**
 * Head panel — 15 Days Meeting Tracker.
 * Connected to:
 * - GET /api/meetings/users/assigning-list?departmentType=ONBOARDING_DEPARTMENT
 * - GET /api/customer/follow-up/meeting/recent?page=0&size=10&days=15 (and size=1 for counts)
 * - GET /api/customer/follow-up/meeting/due?page=0&size=10 (and size=1 for counts)
 */
export function MeetingPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<MeetingStatus>('all')
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const filterDropdownRef = useRef<HTMLDivElement>(null)

  const session = getSession()
  const isUser = session?.user?.role === 'USER'
  const userEmail = session?.user?.email || session?.user?.username || ''

  // 1. Assigning users list API (only for head/admin, disabled for department user)
  const assigningUsersQuery = useAssigningUsers('ONBOARDING_DEPARTMENT', {
    enabled: !isUser,
  })

  // Common query params
  const baseParams = useMemo(
    () => ({
      departmentType: 'ONBOARDING_DEPARTMENT',
      searchParam: search || undefined,
      filteredUser: isUser ? userEmail : (selectedUser || undefined),
      createdAtFrom: dateFrom || undefined,
      createdAtTo: dateTo || undefined,
    }),
    [isUser, userEmail, search, selectedUser, dateFrom, dateTo],
  )

  // 2. Counts API (/recent?size=1&days=15 and /due?size=1)
  const counts = useFollowUpMeetingCounts(baseParams)

  // 3. Lists API
  const recentQuery = useFollowUpRecentMeetings({
    ...baseParams,
    page: 0,
    size: 20,
    days: 15,
  })

  const dueQuery = useFollowUpDueMeetings({
    ...baseParams,
    page: 0,
    size: 20,
  })

  // Assemble meetings list
  const liveMeetings = useMemo<Meeting[]>(() => {
    const recentItems = (recentQuery.data?.data ?? []).map((item) =>
      toMeeting(item, true),
    )
    const dueItems = (dueQuery.data?.data ?? []).map((item) =>
      toMeeting(item, false),
    )

    if (statusFilter === 'done') {
      return recentItems
    }
    if (statusFilter === 'not-done') {
      return dueItems
    }
    return [...dueItems, ...recentItems]
  }, [recentQuery.data?.data, dueQuery.data?.data, statusFilter])

  const meetings =
    liveMeetings.length > 0 ? liveMeetings : initialMeetings

  const doneCount =
    counts.doneCount > 0
      ? counts.doneCount
      : meetings.filter((m) => m.isDone).length
  const notDoneCount =
    counts.notDoneCount > 0
      ? counts.notDoneCount
      : meetings.filter((m) => !m.isDone).length

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node)
      ) {
        setFilterDropdownOpen(false)
      }
    }

    if (filterDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () =>
      document.removeEventListener('mousedown', handleClickOutside)
  }, [filterDropdownOpen])

  async function handleMarkDone(meetingId: string) {
    try {
      await markMeetingDone(meetingId)
    } catch (err) {
      console.warn('Mark done API call:', err)
    }
    counts.refetch()
    recentQuery.refetch()
    dueQuery.refetch()
  }

  function handleRefresh() {
    setSearch('')
    setStatusFilter('all')
    setSelectedUser('')
    setDateFrom('')
    setDateTo('')
    setFilterDropdownOpen(false)
    counts.refetch()
    recentQuery.refetch()
    dueQuery.refetch()
    assigningUsersQuery.refetch()
  }

  function handleFilterStatusChange(status: MeetingStatus) {
    setStatusFilter(status)
  }

  function handleFilterReset() {
    setStatusFilter('all')
    setSelectedUser('')
    setDateFrom('')
    setDateTo('')
    setFilterDropdownOpen(false)
  }

  function handlePhoneClick(meeting: Meeting) {
    console.log('Call:', meeting.customer.phone)
  }

  function handleMessageClick(meeting: Meeting) {
    console.log('Message:', meeting.customer.email)
  }

  function handleHistoryClick(meeting: Meeting) {
    console.log('History for:', meeting.id)
  }

  return (
    <>
      <motion.div
        className="meeting-page__controls"
        initial="hidden"
        animate="visible"
        variants={controlsVariants}
      >
        <div className="meeting-page__controls-left">
          <MeetingFilters
            status={statusFilter}
            onStatusChange={setStatusFilter}
            doneCount={doneCount}
            notDoneCount={notDoneCount}
          />
        </div>

        <div className="meeting-page__controls-center">
          <MeetingSearchBar
            value={search}
            onChange={setSearch}
            className="meeting-page__search"
          />
        </div>

        <div
          className="meeting-page__controls-right"
          ref={filterDropdownRef}
        >
          <div className="filter-dropdown">
            <button
              type="button"
              className="filter-dropdown__trigger"
              onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
              aria-expanded={filterDropdownOpen}
              aria-haspopup="dialog"
            >
              <Icon name="flow" size={16} strokeWidth={2} />
              <span>Filters</span>
            </button>

            {filterDropdownOpen && (
              <motion.div
                className="filter-dropdown__panel"
                role="dialog"
                aria-label="Meeting filters"
                initial="hidden"
                animate="visible"
                variants={panelVariants}
              >
                <div className="filter-dropdown__panel-header">
                  <h3>Filters</h3>
                  <button
                    type="button"
                    className="filter-dropdown__panel-close"
                    onClick={() => setFilterDropdownOpen(false)}
                  >
                    <Icon name="x" size={18} strokeWidth={2} />
                  </button>
                </div>
                <div className="filter-dropdown__panel-body">
                  <div className="filter-dropdown__field">
                    <label>Meeting Status</label>
                    <select
                      className="filter-dropdown__select"
                      value={statusFilter}
                      onChange={(
                        e: ChangeEvent<HTMLSelectElement>,
                      ) =>
                        handleFilterStatusChange(
                          e.target.value as MeetingStatus,
                        )
                      }
                    >
                      <option value="all">All</option>
                      <option value="done">Meeting Done</option>
                      <option value="not-done">
                        Meeting Not Done
                      </option>
                    </select>
                  </div>

                  {!isUser && (
                    <div className="filter-dropdown__field">
                      <label>Assigned User</label>
                      <select
                        className="filter-dropdown__select"
                        value={selectedUser}
                        onChange={(e) =>
                          setSelectedUser(e.target.value)
                        }
                      >
                        <option value="">All Users</option>
                        {(assigningUsersQuery.data ?? []).map(
                          (user) => (
                            <option
                              key={user.email}
                              value={user.email}
                            >
                              {user.username} ({user.email})
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  )}

                  <div className="filter-dropdown__field">
                    <label>Date Range</label>
                    <div className="filter-dropdown__date-row">
                      <input
                        type="date"
                        className="filter-dropdown__date"
                        value={dateFrom}
                        onChange={(e) =>
                          setDateFrom(e.target.value)
                        }
                        placeholder="From"
                      />
                      <span className="filter-dropdown__date-separator">
                        to
                      </span>
                      <input
                        type="date"
                        className="filter-dropdown__date"
                        value={dateTo}
                        onChange={(e) =>
                          setDateTo(e.target.value)
                        }
                        placeholder="To"
                      />
                    </div>
                  </div>
                </div>
                <div className="filter-dropdown__panel-footer">
                  <Button
                    variant="secondary"
                    className="filter-dropdown__reset-btn"
                    onClick={handleFilterReset}
                  >
                    Reset
                  </Button>
                </div>
              </motion.div>
            )}
          </div>

          <IconButton
            icon="refresh"
            label="Reset all filters"
            size={36}
            iconSize={18}
            variant="outline"
            className="meeting-page__refresh-btn"
            onClick={handleRefresh}
          />
        </div>
      </motion.div>

      <MeetingList
        meetings={meetings}
        statusFilter={statusFilter}
        searchQuery={search}
        onMarkDone={handleMarkDone}
        onPhoneClick={handlePhoneClick}
        onMessageClick={handleMessageClick}
        onHistoryClick={handleHistoryClick}
      />
    </>
  )
}