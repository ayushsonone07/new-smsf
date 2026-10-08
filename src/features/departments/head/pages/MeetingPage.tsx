import { useMemo, useState, useRef, useEffect, type ChangeEvent } from 'react'
import { MeetingSearchBar } from '../../../../components/head/15-days-meeting/MeetingSearchBar'
import { MeetingFilters, type MeetingStatus } from '../../../../components/head/15-days-meeting/MeetingFilters'
import { MeetingList, type Meeting, type MeetingCustomer, type MeetingDepartment } from '../../../../components/head/15-days-meeting/MeetingList'
import { IconButton } from '../../../../components/head/shared/IconButton'
import { Icon } from '../../../../components/head/shared/Icon'
import { Button } from '../../../../components/ui/Button'
import './MeetingPage.css'

// ============================================================
// TEMPORARY MEETING UI DATA
// ============================================================

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

/**
 * Head panel — 15 Days Meeting Tracker.
 * Inline filter state, search, status tabs, and meeting list.
 */
export function MeetingPage() {
  const [meetings, setMeetings] = useState<Meeting[]>(initialMeetings)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<MeetingStatus>('all')
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const filterDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setFilterDropdownOpen(false)
      }
    }

    if (filterDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [filterDropdownOpen])

  const doneCount = useMemo(() => meetings.filter(m => m.isDone).length, [meetings])
  const notDoneCount = useMemo(() => meetings.filter(m => !m.isDone).length, [meetings])

  function handleMarkDone(meetingId: string) {
    setMeetings(current =>
      current.map(m => m.id === meetingId ? { ...m, isDone: true } : m)
    )
  }

  function handleRefresh() {
    setSearch('')
    setStatusFilter('all')
    setFilterDropdownOpen(false)
  }

  function handleFilterStatusChange(status: MeetingStatus) {
    setStatusFilter(status)
  }

  function handleFilterReset() {
    setStatusFilter('all')
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
      <div className="meeting-page__controls">
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

        <div className="meeting-page__controls-right" ref={filterDropdownRef}>
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
              <div className="filter-dropdown__panel" role="dialog" aria-label="Meeting filters">
                <div className="filter-dropdown__panel-header">
                  <h3>Filters</h3>
                  <button type="button" className="filter-dropdown__panel-close" onClick={() => setFilterDropdownOpen(false)}>
                    <Icon name="x" size={18} strokeWidth={2} />
                  </button>
                </div>
                <div className="filter-dropdown__panel-body">
                  <div className="filter-dropdown__field">
                    <label>Meeting Status</label>
                    <select
                      className="filter-dropdown__select"
                      value={statusFilter}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => handleFilterStatusChange(e.target.value as MeetingStatus)}
                    >
                      <option value="all">All</option>
                      <option value="done">Meeting Done</option>
                      <option value="not-done">Meeting Not Done</option>
                    </select>
                  </div>
                  <div className="filter-dropdown__field">
                    <label>Department / Service</label>
                    <select className="filter-dropdown__select">
                      <option value="">All Departments</option>
                      <option value="onboarding">Onboarding</option>
                      <option value="website-creation">Website Creation</option>
                      <option value="google-service">Google Service</option>
                      <option value="seo-service">SEO Service</option>
                      <option value="automation">Automation</option>
                    </select>
                  </div>
                  <div className="filter-dropdown__field">
                    <label>Date Range</label>
                    <div className="filter-dropdown__date-row">
                      <input
                        type="date"
                        className="filter-dropdown__date"
                        placeholder="From"
                      />
                      <span className="filter-dropdown__date-separator">to</span>
                      <input
                        type="date"
                        className="filter-dropdown__date"
                        placeholder="To"
                      />
                    </div>
                  </div>
                </div>
                <div className="filter-dropdown__panel-footer">
                  <Button variant="secondary" className="filter-dropdown__reset-btn" onClick={handleFilterReset}>
                    Reset
                  </Button>
                </div>
              </div>
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
      </div>

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