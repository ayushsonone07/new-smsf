import { useState, useEffect, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Filter,
  IndianRupee,
  LockKeyhole,
  Pencil,
  RefreshCw,
  Search,
  Target,
  UserRound,
  UserRoundCheck,
  X,
} from 'lucide-react'
import { getSession } from '../../../../app/auth/session'
import type { FeaturePermission } from '../../../permissions/types/permission.types'
import { isUserGoogle } from '../utils/routeUtils'
import { ApiError } from '../../../../api/client'
import { DateRangePicker } from '../../../../components/head/customers-list/CustomersListFilters'
import {
  fetchSalaryHead,
  fetchDepartmentSalaries,
  updateUserSalary,
  markUserStatus,
  type UserSalaryResponse,
  type UserSalaryUpdateRequest,
} from '../../../../api/salary.api'

const DEPARTMENT_OPTIONS = [
  { value: 'ONBOARDING_DEPARTMENT', label: 'Onboarding Department' },
  { value: 'GOOGLE_DEPARTMENT', label: 'Google Department' },
  { value: 'WEBSITE_DEPARTMENT', label: 'Website Department' },
  { value: 'SEO_DEPARTMENT', label: 'SEO Department' },
  { value: 'SOCIAL_MEDIA_META_DEPARTMENT', label: 'Social Media / Meta' },
  { value: 'GRAPHIC_DESIGN_DEPARTMENT', label: 'Graphic Design' },
  { value: 'FINANCE_DEPARTMENT', label: 'Finance Department' },
  { value: 'CUSTOMER_CARE_DEPARTMENT', label: 'Customer Care' },
]

const EMPTY_SALARIES: UserSalaryResponse[] = []

// ── Helpers ───────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0')

const formatCurrency = (amount: number | null | undefined) =>
  amount == null
    ? '—'
    : new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(amount)

const parseApiDate = (value?: string | number[] | null) => {
  if (!value) return null
  const date = Array.isArray(value)
    ? value.length >= 3
      ? new Date(
          value[0],
          value[1] - 1,
          value[2],
          value[3] ?? 0,
          value[4] ?? 0,
          value[5] ?? 0,
          Math.floor((value[6] ?? 0) / 1_000_000),
        )
      : new Date(Number.NaN)
    : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const getDateKey = (value?: string | number[] | null) => {
  const date = parseApiDate(value)
  if (!date) return null
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const formatDate = (value?: string | number[] | null) => {
  const date = parseApiDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

const toApiDate = (date?: Date) => {
  if (!date) return undefined
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const departmentLabel = (departmentType: string) =>
  DEPARTMENT_OPTIONS.find((department) => department.value === departmentType)?.label ??
  departmentType.replace(/_DEPARTMENT$/i, '').replace(/_/g, ' ')

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  feature?: FeaturePermission
}

export function SalaryManagementPage({ feature: _feature }: Props = {}) {
  void _feature
  const session = getSession()
  const user = session?.user
  const isAdmin = user?.role === 'ADMIN'
  const isHead = user?.role === 'HEAD' || isAdmin
  const userDepartment = isUserGoogle(user?.departmentType)
    ? 'GOOGLE_DEPARTMENT'
    : user?.departmentType?.trim() || null
  const [selectedDept, setSelectedDept] = useState(
    userDepartment ?? 'ONBOARDING_DEPARTMENT',
  )
  const departmentType = isAdmin ? selectedDept : userDepartment

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent'>('all')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Pagination (client-side for search results)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  // Modals
  const [editOpen, setEditOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserSalaryResponse | null>(null)
  const [editMode, setEditMode] = useState<'target' | 'full'>('target')
  const [editForm, setEditForm] = useState<Partial<UserSalaryUpdateRequest>>({})
  const [editLoading, setEditLoading] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(0)
    }, 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  const salaryQuery = useQuery({
    queryKey: ['salary-management', departmentType, startDate, endDate],
    enabled: Boolean(departmentType),
    queryFn: async () => {
      if (!departmentType) {
        throw new Error('Your account is not linked to a department.')
      }
      const params = {
        departmentType,
        startDate: toApiDate(startDate),
        endDate: toApiDate(endDate),
      }
      const [head, team] = await Promise.all([
        fetchSalaryHead(params).catch((e: unknown) => {
          if (e instanceof ApiError && e.status === 404) return null
          throw e
        }),
        fetchDepartmentSalaries(params),
      ])
      return { head, team }
    },
  })
  const {
    data: salaryData,
    isPending: salaryPending,
    isError: salaryHasError,
    error: salaryError,
    refetch: refetchSalaries,
  } = salaryQuery
  const deptHead = salaryData?.head ?? null
  const teamSalaries = salaryData?.team ?? EMPTY_SALARIES
  const loading = Boolean(departmentType) && salaryPending
  const error = !departmentType
    ? 'Your account is not linked to a department.'
    : salaryHasError
      ? salaryError instanceof Error
        ? salaryError.message
        : 'Unable to load department salary data.'
      : null
  const loadData = useCallback(async () => {
    await refetchSalaries()
  }, [refetchSalaries])

  const filteredSalaries = useMemo(() => {
    const allDepartmentSalaries = [
      ...(deptHead ? [deptHead] : []),
      ...teamSalaries,
    ]
    const q = debouncedSearch.trim().toLowerCase()
    return allDepartmentSalaries.filter((s) => {
      const joinedDate = getDateKey(s.createdAt)
      return (
        (!q ||
          (s.username ?? '').toLowerCase().includes(q) ||
          (s.email ?? '').toLowerCase().includes(q)) &&
        (statusFilter === 'all' ||
          (statusFilter === 'absent' ? s.isAbsent : !s.isAbsent)) &&
        (!createdFrom || Boolean(joinedDate && joinedDate >= createdFrom)) &&
        (!createdTo || Boolean(joinedDate && joinedDate <= createdTo))
      )
    })
  }, [
    deptHead,
    teamSalaries,
    debouncedSearch,
    statusFilter,
    createdFrom,
    createdTo,
  ])

  // Paginated salaries
  const paginatedSalaries = filteredSalaries.slice(page * pageSize, (page + 1) * pageSize)

  // ── Handlers ────────────────────────────────────────────────────────────────

  const openEditModal = (salary: UserSalaryResponse, mode: 'target' | 'full') => {
    setSelectedUser(salary)
    setEditMode(mode)
    setEditForm({
      userId: salary.userId,
      target: salary.target,
      targetAchieved: salary.targetAchieved,
      overTarget: salary.overTarget,
      incentiveAmount: salary.incentiveAmount,
      newSalary: salary.currentSalary,
    })
    setEditOpen(true)
  }

  const openDetailModal = (salary: UserSalaryResponse) => {
    setSelectedUser(salary)
    setDetailOpen(true)
  }

  const handleMarkStatus = async (salary: UserSalaryResponse) => {
    try {
      await markUserStatus(salary.userId, salary.isAbsent)
      showToast(`Marked as ${salary.isAbsent ? 'Present' : 'Absent'}`)
      loadData()
    } catch (e: unknown) {
      showToast((e as Error).message, 'err')
    }
  }

  const handleSaveEdit = async () => {
    if (!selectedUser || !editForm.userId) return
    setEditLoading(true)
    try {
      const updatedBy = user?.email || ''
      const request: UserSalaryUpdateRequest = { userId: editForm.userId }

      if (editMode === 'target') {
        request.target = editForm.target
        request.targetAchieved = editForm.targetAchieved
        request.overTarget = editForm.overTarget
        request.incentiveAmount = editForm.incentiveAmount
      } else {
        // Full edit
        request.newSalary = editForm.newSalary
        request.target = editForm.target
        request.targetAchieved = editForm.targetAchieved
        request.overTarget = editForm.overTarget
        request.incentiveAmount = editForm.incentiveAmount
      }

      await updateUserSalary(updatedBy, request)
      showToast('Salary updated successfully')
      setEditOpen(false)
      setSelectedUser(null)
      loadData()
    } catch (e: unknown) {
      showToast((e as Error).message, 'err')
    } finally {
      setEditLoading(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto mt-3 w-full max-w-[1600px] space-y-5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users by name or email..."
            aria-label="Search users by name or email"
            className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
        </label>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <select
              aria-label="Select department"
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value)
                setPage(0)
              }}
              className="h-12 min-w-44 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              {DEPARTMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            className={`inline-flex h-12 items-center gap-2 rounded-xl border px-4 text-sm font-semibold shadow-sm transition ${
              filtersOpen
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50'
            }`}
          >
            <Filter size={17} />
            Filter
          </button>
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading || salaryQuery.isFetching || !departmentType}
            aria-label="Refresh salary data"
            title="Refresh"
            className="grid h-12 w-12 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading || salaryQuery.isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {filtersOpen && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
            Status:
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as typeof statusFilter)
                setPage(0)
              }}
              className="h-11 min-w-48 rounded-xl border border-slate-300 bg-white px-4 font-normal text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
            </select>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-slate-700">Created Date:</span>
            <DateRangePicker
              label="Created Date"
              from={createdFrom}
              to={createdTo}
              onChange={(from, to) => {
                setCreatedFrom(from)
                setCreatedTo(to)
                setPage(0)
              }}
              onReset={() => {
                setCreatedFrom('')
                setCreatedTo('')
                setPage(0)
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-slate-700">Completion Date:</span>
            <DateRangePicker
              label="Completion Date"
              from={startDate ? toApiDate(startDate) ?? '' : ''}
              to={endDate ? toApiDate(endDate) ?? '' : ''}
              onChange={(from, to) => {
                setStartDate(from ? new Date(`${from}T00:00:00`) : undefined)
                setEndDate(to ? new Date(`${to}T00:00:00`) : undefined)
                setPage(0)
              }}
              onReset={() => {
                setStartDate(undefined)
                setEndDate(undefined)
                setPage(0)
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setStatusFilter('all')
              setCreatedFrom('')
              setCreatedTo('')
              setStartDate(undefined)
              setEndDate(undefined)
              setPage(0)
            }}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
          >
            <X size={16} />
            Reset Filter
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            toast.type === 'ok'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {toast.type === 'ok' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Team Salaries Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-6 text-center text-rose-600">
          ⚠ {error}
        </div>
      ) : filteredSalaries.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-600 text-white">
                <BriefcaseBusiness size={19} />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Department Salary Summary</h2>
                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  {departmentLabel(departmentType ?? '')} · {filteredSalaries.length} {filteredSalaries.length === 1 ? 'member' : 'members'}
                </p>
              </div>
            </div>
          </header>

          <div
            className={`max-h-[58vh] overflow-auto transition-opacity${
              salaryQuery.isFetching && !loading ? ' opacity-60 pointer-events-none' : ''
            }`}
            aria-busy={salaryQuery.isFetching}
          >
            <table className="w-full min-w-[1120px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600 shadow-[0_1px_0_#e2e8f0]">
                <tr>
                  <SalaryHeading icon={<UserRound size={14} />} label="User" />
                  <SalaryHeading icon={<BriefcaseBusiness size={14} />} label="Role" />
                  <SalaryHeading icon={<UserRoundCheck size={14} />} label="Attendance" />
                  <SalaryHeading icon={<IndianRupee size={14} />} label="Current Salary" />
                  <SalaryHeading icon={<Clock3 size={14} />} label="Incentives" />
                  <SalaryHeading icon={<Target size={14} />} label="Target" />
                  <SalaryHeading icon={<BadgeCheck size={14} />} label="Achieved" />
                  <SalaryHeading icon={<CalendarDays size={14} />} label="Joined" />
                  <th className="whitespace-nowrap px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedSalaries.map((salary) => {
                  const isDepartmentHead = deptHead?.userId === salary.userId
                  return (
                    <tr key={salary.userId} className="transition-colors hover:bg-blue-50/40">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800">{salary.username}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{salary.email}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                          isDepartmentHead
                            ? 'border-blue-200 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-slate-100 text-slate-600'
                        }`}>
                          {isDepartmentHead ? 'HEAD' : 'USER'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                          salary.isAbsent
                            ? 'border-rose-200 bg-rose-50 text-rose-700'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${salary.isAbsent ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                          {salary.isAbsent ? 'Absent' : 'Present'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-800">
                        {formatCurrency(salary.currentSalary)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 font-semibold text-emerald-600">
                        {formatCurrency(salary.incentiveAmount)}
                      </td>
                      <td className="px-4 py-4 text-slate-700">{salary.target ?? '—'}</td>
                      <td className="px-4 py-4">
                        <span className="inline-flex min-w-12 justify-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                          {salary.achievedCount ?? 0}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                        {formatDate(salary.createdAt)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <SalaryAction label="View salary details" onClick={() => openDetailModal(salary)} tone="slate">
                            <Eye size={17} />
                          </SalaryAction>
                          {!isDepartmentHead && (
                            <SalaryAction
                              label={salary.isAbsent ? 'Mark present' : 'Mark absent'}
                              onClick={() => void handleMarkStatus(salary)}
                              tone={salary.isAbsent ? 'emerald' : 'slate'}
                            >
                              <UserRoundCheck size={17} />
                            </SalaryAction>
                          )}
                          <SalaryAction label="Edit target and incentive" onClick={() => openEditModal(salary, 'target')} tone="blue">
                            <Pencil size={17} />
                          </SalaryAction>
                          {isHead && (
                            <SalaryAction label="Edit salary" onClick={() => openEditModal(salary, 'full')} tone="rose">
                              <LockKeyhole size={16} />
                            </SalaryAction>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredSalaries.length > pageSize && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-3 text-sm text-slate-600">
              <label className="flex items-center gap-2">
                Rows per page
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0) }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {[10, 20, 50].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  aria-label="Previous page"
                  className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="grid h-10 min-w-10 place-items-center rounded-xl bg-blue-600 px-3 font-semibold text-white">
                  {page + 1}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * pageSize >= filteredSalaries.length}
                  aria-label="Next page"
                  className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <span className="text-slate-500">
                Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, filteredSalaries.length)} of {filteredSalaries.length} results
              </span>
            </div>
          )}
        </section>
      ) : departmentType && !loading ? (
        <div className="rounded-xl border border-slate-100 bg-white p-12 text-center shadow-sm">
          <div className="mb-4 flex justify-center text-blue-500"><BriefcaseBusiness size={38} /></div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">No salary data found</h3>
          <p className="text-slate-500 text-sm">
            {debouncedSearch
              ? 'No users match your search.'
              : 'No salary records available for the selected date range.'}
          </p>
        </div>
      ) : null}

      {/* ── Edit Modal ── */}
      {editOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  {editMode === 'target' ? 'Edit Target' : '🔒 Full Edit (Confidential)'}
                </h3>
                <p className="text-sm text-slate-500">{selectedUser.username}</p>
              </div>
              <button onClick={() => setEditOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>

            <div className="space-y-3">
              <EditField
                label="Target"
                value={String(editForm.target ?? '')}
                onChange={(v) => setEditForm({ ...editForm, target: Number(v) })}
              />
              <EditField
                label="Over Target"
                value={String(editForm.overTarget ?? '')}
                onChange={(v) => setEditForm({ ...editForm, overTarget: Number(v) })}
              />
              <EditField
                label="Incentive Amount (₹)"
                value={String(editForm.incentiveAmount ?? '')}
                onChange={(v) => setEditForm({ ...editForm, incentiveAmount: Number(v) })}
              />

              {editMode === 'full' && (
                <EditField
                  label="New Salary (₹)"
                  value={String(editForm.newSalary ?? '')}
                  onChange={(v) => setEditForm({ ...editForm, newSalary: Number(v) })}
                />
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, targetAchieved: !editForm.targetAchieved })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editForm.targetAchieved ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      editForm.targetAchieved ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-slate-700">Target Achieved</span>
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setEditOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editLoading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {detailOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Salary Details</h3>
              <button onClick={() => setDetailOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>

            <div className="space-y-3">
              <DetailRow label="Username" value={selectedUser.username} />
              <DetailRow label="Email" value={selectedUser.email} />
              <DetailRow label="Role" value={deptHead?.userId === selectedUser.userId ? 'HEAD' : 'USER'} />
              <DetailRow label="Current Salary" value={formatCurrency(selectedUser.currentSalary)} />
              <DetailRow label="Last Month Salary" value={formatCurrency(selectedUser.lastMonthSalary)} />
              <DetailRow label="Target" value={String(selectedUser.target)} />
              <DetailRow label="Achieved Count" value={String(selectedUser.achievedCount)} />
              <DetailRow label="Over Target" value={String(selectedUser.overTarget)} />
              <DetailRow label="Incentive Amount" value={formatCurrency(selectedUser.incentiveAmount)} />
              <DetailRow label="Target Achieved" value={selectedUser.targetAchieved ? 'Yes ✅' : 'No ❌'} />
              <DetailRow label="Status" value={selectedUser.isAbsent ? '🔴 Absent' : '🟢 Present'} />
              {selectedUser.lastUpdatedAt && (
                <DetailRow label="Last Updated" value={new Date(selectedUser.lastUpdatedAt).toLocaleString()} />
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setDetailOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SalaryHeading({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <th className="whitespace-nowrap border-r border-slate-200/70 px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500 last:border-r-0">
      <span className="inline-flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-100 text-blue-600">
          {icon}
        </span>
        {label}
      </span>
    </th>
  )
}

function SalaryAction({
  children,
  label,
  onClick,
  tone,
}: {
  children: ReactNode
  label: string
  onClick: () => void
  tone: 'slate' | 'blue' | 'emerald' | 'rose'
}) {
  const toneClass = {
    slate: 'text-slate-500 hover:bg-slate-100',
    blue: 'text-blue-600 hover:bg-blue-50',
    emerald: 'text-emerald-600 hover:bg-emerald-50',
    rose: 'text-rose-600 hover:bg-rose-50',
  }[tone]

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid h-9 w-9 place-items-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${toneClass}`}
    >
      {children}
    </button>
  )
}

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between border-b border-slate-50 pb-2 text-sm">
    <span className="text-slate-500">{label}</span>
    <span className="font-medium text-slate-800">{value}</span>
  </div>
)

const EditField = ({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) => (
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
    />
  </div>
)
