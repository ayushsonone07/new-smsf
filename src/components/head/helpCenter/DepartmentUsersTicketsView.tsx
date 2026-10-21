import { useState, useEffect } from 'react'
import {
  Users,
  Mail,
  ChevronRight,
  RefreshCw,
  ArrowLeft,
  AlertCircle,
  Loader2,
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

interface DepartmentUsersTicketsViewProps {
  departmentType?: string
}

export function DepartmentUsersTicketsView({
  departmentType,
}: DepartmentUsersTicketsViewProps) {
  const [members, setMembers] = useState<AssignableUser[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(true)
  const [membersError, setMembersError] = useState<string | null>(null)

  // Selected member drill-down state
  const [selectedMember, setSelectedMember] = useState<AssignableUser | null>(null)
  const [memberTickets, setMemberTickets] = useState<EmployeeTicketWithCreator[]>([])
  const [isLoadingMemberTickets, setIsLoadingMemberTickets] = useState(false)
  const [memberTicketsError, setMemberTicketsError] = useState<string | null>(null)
  const [refreshMemberTicketsKey, setRefreshMemberTicketsKey] = useState(0)

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
        {/* Drill-down Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setSelectedMember(null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Department Members</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Member:</span>
            <span className="text-xs font-bold text-slate-900">
              {selectedMember.username || selectedMember.email}
            </span>
            <span className="text-xs text-slate-400">({selectedMember.email})</span>
          </div>
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
          />
        )}
      </div>
    )
  }

  // Department members list view
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Table Header Card */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/60 to-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Department Members</h2>
            <p className="text-xs text-slate-500">
              All department users and sub-users in your team
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadMembers}
            disabled={isLoadingMembers}
            className="h-8 px-3 inline-flex items-center gap-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 shadow-2xs transition-colors disabled:opacity-60"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-slate-500 ${isLoadingMembers ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
            {members.length} members
          </span>
        </div>
      </div>

      {/* Member Table Content */}
      {isLoadingMembers ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <Loader2 className="h-6 w-6 text-indigo-600 animate-spin mb-2" />
          <span className="text-xs font-medium">Loading team members…</span>
        </div>
      ) : membersError ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-2">
            <AlertCircle className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-slate-900">Couldn't load team members</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">{membersError}</p>
          <button
            type="button"
            onClick={loadMembers}
            className="mt-3 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg"
          >
            Retry
          </button>
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-2">
            <Users className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-slate-900">No team members found</p>
          <p className="text-xs text-slate-500 mt-1">
            Your department doesn't have any users or sub-users yet.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-12 text-slate-400">#</th>
                <th className="py-3 px-4">Username / Name</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((u, idx) => {
                const username = u.username || u.email || '—'
                const disabled = !u.email

                return (
                  <tr
                    key={u.id ?? u.email ?? idx}
                    onClick={() => {
                      if (disabled) return
                      setSelectedMember(u)
                    }}
                    className={`transition-colors ${
                      disabled
                        ? 'opacity-60'
                        : 'hover:bg-indigo-50/50 cursor-pointer group'
                    }`}
                  >
                    <td className="py-3.5 px-4 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-200 transition-colors">
                          {username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold text-slate-900">
                          {u.username || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                        <Mail className="h-3 w-3 text-slate-400" />
                        {u.email || '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {!disabled && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:text-indigo-700">
                          <span>View Tickets</span>
                          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

