import { useState, useEffect, useMemo } from 'react'
import {
  Users,
  Mail,
  ChevronRight,
  RefreshCw,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Search,
  X,
} from 'lucide-react'
import type {
  AssignableUser,
  EmployeeTicketWithCreator,
} from '../../../features/departments/types/help-center.types'
import {
  fetchAssignableDepartmentUsers,
  fetchAssignedTickets,
} from '../../../api/help-center.api'
import { AssignedTicketsView } from './AssignedTicketsView'

const AVATAR_TONES = [
  'bg-[#eeebff] text-[#6355ed]',
  'bg-[#e7f0ff] text-[#3e75d5]',
  'bg-[#ffedf5] text-[#d44f92]',
  'bg-[#e8f8f0] text-[#25966d]',
  'bg-[#fff2e3] text-[#d88a33]',
]

function formatMemberRole(role?: string) {
  if (role === 'DEPARTMENT_SUB_USER') return 'Department Sub-user'
  if (role === 'DEPARTMENT_HEAD') return 'Department Head'
  return 'Department Member'
}

interface DepartmentUsersTicketsViewProps {
  departmentType?: string
}

export function DepartmentUsersTicketsView({
  departmentType,
}: DepartmentUsersTicketsViewProps) {
  const canViewHistory = true

  const [members, setMembers] = useState<AssignableUser[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(true)
  const [membersError, setMembersError] = useState<string | null>(null)

  // Selected member drill-down state
  const [selectedMember, setSelectedMember] = useState<AssignableUser | null>(null)
  const [memberTickets, setMemberTickets] = useState<EmployeeTicketWithCreator[]>([])
  const [isLoadingMemberTickets, setIsLoadingMemberTickets] = useState(false)
  const [memberTicketsError, setMemberTicketsError] = useState<string | null>(null)
  const [refreshMemberTicketsKey, setRefreshMemberTicketsKey] = useState(0)
  const [memberSearch, setMemberSearch] = useState('')

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase()
    if (!q) return members
    return members.filter(
      (u) => (u.username || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
    )
  }, [members, memberSearch])

  // Load department members
  async function loadMembers() {
    setIsLoadingMembers(true)
    setMembersError(null)
    try {
      const users = await fetchAssignableDepartmentUsers(departmentType)
      setMembers(users)
    } catch (err) {
      setMembersError(err instanceof Error ? err.message : 'Failed to load department members')
    } finally {
      setIsLoadingMembers(false)
    }
  }

  useEffect(() => {
    loadMembers()
  }, [departmentType])

  // Load tickets for selected member
  useEffect(() => {
    if (!selectedMember?.email) return
    let cancelled = false

    async function loadTickets() {
      setIsLoadingMemberTickets(true)
      setMemberTicketsError(null)
      try {
        const page = await fetchAssignedTickets(selectedMember!.email)
        if (!cancelled) {
          setMemberTickets(page.content || [])
        }
      } catch (err) {
        if (!cancelled) {
          setMemberTicketsError(
            err instanceof Error ? err.message : "Failed to load member's tickets"
          )
        }
      } finally {
        if (!cancelled) setIsLoadingMemberTickets(false)
      }
    }

    loadTickets()
    return () => {
      cancelled = true
    }
  }, [selectedMember, refreshMemberTicketsKey])

  // When viewing a selected member's tickets drilldown
  if (selectedMember) {
    return (
      <div className="space-y-4">
        {/* Drill-down header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-base font-bold text-indigo-700">
              {(selectedMember.username || selectedMember.email || '?').charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">
                {selectedMember.username || selectedMember.email}
              </p>
              <p className="text-xs text-slate-500 truncate">{selectedMember.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedMember(null)}
            className="h-10 px-3.5 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to team</span>
          </button>
        </div>

        {memberTicketsError ? (
          <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-900">{memberTicketsError}</p>
            <button
              type="button"
              onClick={() => setRefreshMemberTicketsKey((k) => k + 1)}
              className="mt-3 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg"
            >
              Retry
            </button>
          </div>
        ) : (
          <AssignedTicketsView
            tickets={memberTickets}
            email={selectedMember.email}
            departmentType={departmentType}
            isLoading={isLoadingMemberTickets}
            onRefresh={() => setRefreshMemberTicketsKey((k) => k + 1)}
            onTicketUpdated={() => setRefreshMemberTicketsKey((k) => k + 1)}
            canViewHistory={canViewHistory}
            canUpdateStatus={false}
          />
        )}
      </div>
    )
  }

  // Department members list view
  return (
    <div className="space-y-5">
      {/* Page heading */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-[13px] bg-[#f0efff] text-[#5146ef]">
            <Users className="h-[23px] w-[23px]" strokeWidth={1.8} />
          </span>
          <div>
            <h1 className="text-[21px] font-bold tracking-[-0.5px] text-[#172442] leading-tight">Department Members</h1>
            <p className="mt-1 text-xs text-[#8190a8]">Manage and view your department team members</p>
          </div>
        </div>
        <span className="flex-shrink-0 rounded-lg bg-[#e9eaff] px-3 py-2 text-xs font-semibold text-[#4c50a4]">
          {members.length} {members.length === 1 ? 'Member' : 'Members'}
        </span>
      </div>

      {/* Directory panel */}
      <section className="overflow-hidden rounded-[15px] border border-[#e9edf4] bg-white shadow-[0_3px_16px_rgba(27,42,74,0.035)]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-[18px]">
          <div>
            <div className="text-sm font-bold text-[#172442]">Team Directory</div>
            <div className="mt-1 text-[11px] text-[#8190a8]">All department users and sub-users in your team</div>
          </div>

          <div className="flex w-full items-center gap-2.5 sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca9bd]" />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search name or email..."
                className="w-full rounded-[9px] border border-[#e3e8f0] bg-white py-[11px] pl-9 pr-8 text-[13px] text-[#172442] outline-none transition placeholder:text-[#9ca9bd] focus:border-[#5146ef] focus:shadow-[0_0_0_3px_#5146ef12] sm:w-[265px]"
              />
              {memberSearch && (
                <button
                  type="button"
                  onClick={() => setMemberSearch('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9ca9bd] hover:text-[#566780]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={loadMembers}
              disabled={isLoadingMembers}
              className="flex h-[38px] flex-shrink-0 items-center gap-[7px] rounded-[9px] border border-[#e3e8f0] bg-white px-3.5 text-[13px] font-semibold text-[#344461] hover:bg-[#f7f8fd] disabled:opacity-60"
            >
              <RefreshCw className={`h-[15px] w-[15px] ${isLoadingMembers ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {isLoadingMembers && members.length === 0 ? (
          <div className="flex flex-col items-center justify-center border-t border-[#e9edf4] py-16 text-[#8491a6]">
            <Loader2 className="mb-2 h-6 w-6 animate-spin text-[#5146ef]" />
            <span className="text-xs font-medium">Loading team members…</span>
          </div>
        ) : membersError ? (
          <div className="flex flex-col items-center justify-center border-t border-[#e9edf4] px-4 py-16 text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertCircle className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-[#172442]">Couldn't load team members</p>
            <p className="mt-1 max-w-sm text-xs text-[#8491a6]">{membersError}</p>
            <button
              type="button"
              onClick={loadMembers}
              className="mt-3 rounded-lg bg-[#f0efff] px-3.5 py-2 text-xs font-bold text-[#5146ef] hover:bg-[#5146ef] hover:text-white"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className={`overflow-x-auto transition-opacity ${isLoadingMembers ? 'opacity-60' : ''}`}>
            <table className="w-full border-collapse whitespace-nowrap text-[13px]">
              <thead className="bg-[#f8faff]">
                <tr>
                  {['#', 'TEAM MEMBER', 'EMAIL ADDRESS', 'STATUS', 'ACTIONS'].map((h, i) => (
                    <th
                      key={h}
                      className={`border-y border-[#e9edf4] px-5 py-[15px] text-[11px] font-bold tracking-[0.25px] text-[#8390a8] ${
                        i === 4 ? 'text-right' : 'text-left'
                      } ${i === 0 ? 'w-[65px]' : ''}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-9 text-center text-[#8491a6]">
                      {memberSearch ? 'No members found for your search.' : "Your department doesn't have any users or sub-users yet."}
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((u, idx) => {
                    const username = u.username || u.email || '—'
                    const disabled = !u.email
                    const tone = AVATAR_TONES[idx % AVATAR_TONES.length]

                    return (
                      <tr
                        key={u.id ?? u.email ?? idx}
                        className="border-b border-[#f0f2f7] transition-colors last:border-b-0 hover:bg-[#f8faff]"
                      >
                        <td className="w-[65px] px-5 py-[13px] text-[#a1acc0]">{idx + 1}</td>
                        <td className="px-5 py-[13px]">
                          <div className="flex items-center gap-[11px]">
                            <div className={`grid h-[35px] w-[35px] flex-shrink-0 place-items-center rounded-[10px] text-[13px] font-bold ${tone}`}>
                              {username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-[#25334e]">{u.username || '—'}</div>
                              <div className="mt-[3px] text-[10px] text-[#9aa7bb]">{formatMemberRole(u.role)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-[13px]">
                          <div className="flex items-center gap-[9px] text-xs text-[#566780]">
                            <Mail className="h-[15px] w-[15px] text-[#9aa8bf]" strokeWidth={1.8} />
                            {u.email || '—'}
                          </div>
                        </td>
                        <td className="px-5 py-[13px]">
                          <span className="inline-flex items-center gap-1.5 rounded-[7px] bg-[#ebf9f1] px-2.5 py-1.5 text-[11px] font-semibold text-[#239b65]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#30b67c]" />
                            Listed
                          </span>
                        </td>
                        <td className="px-5 py-[13px] text-right">
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => setSelectedMember(u)}
                            className="inline-flex items-center gap-[7px] rounded-lg border border-transparent bg-[#f0efff] px-3 py-[9px] text-[11px] font-bold text-[#5146ef] transition hover:bg-[#5146ef] hover:text-white disabled:opacity-50 disabled:hover:bg-[#f0efff] disabled:hover:text-[#5146ef]"
                          >
                            View Tickets
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[#e9edf4] px-5 py-3.5 text-[11px] text-[#8c9ab0]">
          <span>
            Showing {filteredMembers.length} of {members.length} members
          </span>
          <div className="flex items-center gap-2">
            <span className="h-[7px] w-[7px] rounded-full bg-[#26b87b]" />
            Team Directory
          </div>
        </div>
      </section>
    </div>
  )
}
