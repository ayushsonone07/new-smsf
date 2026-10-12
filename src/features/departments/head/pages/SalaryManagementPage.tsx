import { useState, useEffect, useCallback, useMemo } from 'react'
import { getSession } from '../../../../app/auth/session'
import type { FeaturePermission } from '../../../permissions/types/permission.types'
import { isUserGoogle } from '../utils/routeUtils'
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

// ── Helpers ───────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0')

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)

const toApiDate = (date?: Date) => {
  if (!date) return undefined
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  feature: FeaturePermission
}

export function SalaryManagementPage({ feature: _feature }: Props) {
  const session = getSession()
  const user = session?.user
  const isAdmin = user?.role === 'ADMIN'
  const isHead = user?.role === 'HEAD' || isAdmin
  const defaultDepartment = isUserGoogle(user?.departmentType)
    ? 'GOOGLE_DEPARTMENT'
    : user?.departmentType || 'ONBOARDING_DEPARTMENT'
  const [selectedDept, setSelectedDept] = useState(defaultDepartment)
  const departmentType = isAdmin ? selectedDept : defaultDepartment

  // Data
  const [deptHead, setDeptHead] = useState<UserSalaryResponse | null>(null)
  const [teamSalaries, setTeamSalaries] = useState<UserSalaryResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()

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

  // Fetch data
  const loadData = useCallback(async () => {
    if (!departmentType) return
    setLoading(true)
    setError(null)
    try {
      const params = {
        departmentType,
        startDate: toApiDate(startDate),
        endDate: toApiDate(endDate),
      }
      const [head, team] = await Promise.all([
        fetchSalaryHead(params).catch(() => null),
        fetchDepartmentSalaries(params),
      ])
      setDeptHead(head)
      setTeamSalaries(team)
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [departmentType, startDate, endDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredSalaries = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return teamSalaries
    return teamSalaries.filter(
      (s) =>
        (s.username ?? '').toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q),
    )
  }, [teamSalaries, debouncedSearch])

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
    <div className="space-y-5 p-4 mt-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Salary Management</h2>
        <p className="text-sm text-slate-500">
          {isHead
            ? 'View and manage salary information for your department'
            : 'Your salary details'}
        </p>
      </div>

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

      {/* Filters */}
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          {isAdmin && (
            <div className="min-w-[200px]">
              <label className="text-xs font-medium text-slate-600">Department</label>
              <select
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value)
                  setPage(0)
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {DEPARTMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-slate-600">Search by name or email</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search users..."
                className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>

          <div className="min-w-[140px]">
            <label className="text-xs font-medium text-slate-600">From Date</label>
            <input
              type="date"
              value={startDate ? toApiDate(startDate) : ''}
              onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : undefined)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div className="min-w-[140px]">
            <label className="text-xs font-medium text-slate-600">To Date</label>
            <input
              type="date"
              value={endDate ? toApiDate(endDate) : ''}
              onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : undefined)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <button
            onClick={() => {
              setSearchTerm('')
              setStartDate(undefined)
              setEndDate(undefined)
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
          >
            ↺ Reset
          </button>
        </div>
      </div>

      {/* Department Head Card */}
      {deptHead && !debouncedSearch && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-5 shadow-sm">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-10 w-10 rounded-full bg-indigo-200 flex items-center justify-center text-lg">
                  👤
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{deptHead.username}</p>
                  <p className="text-xs text-slate-500">{deptHead.email}</p>
                </div>
                <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white">
                  Department Head
                </span>
              </div>
            </div>
            <div className="flex gap-6 flex-wrap text-sm">
              <SalaryField label="Current Salary" value={formatCurrency(deptHead.currentSalary)} />
              <SalaryField label="Target" value={String(deptHead.target)} />
              <SalaryField label="Achieved" value={String(deptHead.achievedCount)} />
              <SalaryField label="Incentive" value={formatCurrency(deptHead.incentiveAmount)} />
              <SalaryField
                label="Status"
                value={deptHead.isAbsent ? '🔴 Absent' : '🟢 Present'}
              />
            </div>
          </div>
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
        <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/70 text-slate-600">
                  <th className="px-4 py-3 text-left font-semibold">User</th>
                  <th className="px-4 py-3 text-left font-semibold">Current Salary</th>
                  <th className="px-4 py-3 text-left font-semibold">Target</th>
                  <th className="px-4 py-3 text-left font-semibold">Achieved</th>
                  <th className="px-4 py-3 text-left font-semibold">Incentive</th>
                  <th className="px-4 py-3 text-left font-semibold">Target Met</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSalaries.map((salary) => (
                  <tr key={salary.userId} className="border-b hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{salary.username}</div>
                      <div className="text-xs text-slate-400">{salary.email}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {formatCurrency(salary.currentSalary)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{salary.target}</td>
                    <td className="px-4 py-3 text-slate-600">{salary.achievedCount}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatCurrency(salary.incentiveAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          salary.targetAchieved
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {salary.targetAchieved ? '✅ Yes' : '⏳ No'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          salary.isAbsent
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {salary.isAbsent ? '🔴 Absent' : '🟢 Present'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openDetailModal(salary)}
                          className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 text-xs"
                          title="View details"
                        >
                          👁
                        </button>
                        <button
                          onClick={() => handleMarkStatus(salary)}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          {salary.isAbsent ? 'Mark Present' : 'Mark Absent'}
                        </button>
                        <button
                          onClick={() => openEditModal(salary, 'target')}
                          className="rounded-md border border-blue-200 bg-blue-50 p-1.5 text-blue-600 hover:bg-blue-100"
                          title="Edit target"
                        >
                          ✏️
                        </button>
                        {isHead && (
                          <button
                            onClick={() => openEditModal(salary, 'full')}
                            className="rounded-md border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100"
                            title="Full edit"
                          >
                            🔒
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredSalaries.length > pageSize && (
            <div className="border-t px-4 py-3 flex items-center justify-between text-sm text-slate-600">
              <span>
                Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filteredSalaries.length)} of{' '}
                {filteredSalaries.length}
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0) }}
                  className="rounded border border-slate-200 px-2 py-1 text-xs"
                >
                  {[10, 20, 50].map((s) => <option key={s} value={s}>{s} / page</option>)}
                </select>
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40 hover:bg-slate-50"
                >
                  ←
                </button>
                <span className="text-xs text-slate-500">
                  Page {page + 1} of {Math.ceil(filteredSalaries.length / pageSize)}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * pageSize >= filteredSalaries.length}
                  className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40 hover:bg-slate-50"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </div>
      ) : departmentType && !loading ? (
        <div className="rounded-xl border border-slate-100 bg-white p-12 text-center shadow-sm">
          <div className="text-5xl mb-4">🏦</div>
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

const SalaryField = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs text-slate-500">{label}</p>
    <p className="font-medium text-slate-800">{value}</p>
  </div>
)

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

