import { useState, useEffect, useCallback } from 'react'
import { getSession } from '../../../../app/auth/session'
import { RefreshButton } from '../../../../components/ui/RefreshButton'
import type { FeaturePermission } from '../../../permissions/types/permission.types'
import {
  fetchDepartmentServices,
  addDepartmentService,
  editDepartmentService,
  deleteDepartmentService,
  getPlansForService,
  type DepartmentServiceEntity,
  type ServicePlan,
  type ServiceManageRequest,
} from '../../../../api/manage-services.api'

import { isUserGoogle } from '../utils/routeUtils'

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  feature: FeaturePermission
}

const emptyForm = (): ServiceManageRequest => ({
  departmentServiceName: '',
  remarks: '',
  isServiceActive: true,
})

export function ManageServicesPage({ feature: _feature }: Props) {
  const session = getSession()
  const user = session?.user
  const username = user?.email || user?.username || ''
  const departmentType = isUserGoogle(user?.departmentType)
    ? 'GOOGLE_DEPARTMENT'
    : user?.departmentType || 'ONBOARDING_DEPARTMENT'

  // List state
  const [services, setServices] = useState<DepartmentServiceEntity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize] = useState(10)
  const [totalElements, setTotalElements] = useState(0)
  const [totalPage, setTotalPage] = useState(0)

  // Dialogs
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [plansOpen, setPlansOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<DepartmentServiceEntity | null>(null)
  const [formData, setFormData] = useState<ServiceManageRequest>(emptyForm())

  // Plans
  const [plans, setPlans] = useState<ServicePlan[]>([])
  const [plansLoading, setPlansLoading] = useState(false)

  // Toast feedback
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
    }, 500)
    return () => clearTimeout(t)
  }, [searchTerm])

  // Fetch services
  const loadServices = useCallback(async () => {
    if (!username) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetchDepartmentServices({
        username,
        searchParam: debouncedSearch || undefined,
        page,
        size: pageSize,
      })
      setServices(res?.data ?? [])
      setTotalElements(res?.totalElements ?? 0)
      setTotalPage(res?.totalPage ?? 0)
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [username, debouncedSearch, page, pageSize])

  useEffect(() => {
    loadServices()
  }, [loadServices])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!formData.departmentServiceName.trim()) {
      showToast('Service name is required', 'err')
      return
    }
    try {
      await addDepartmentService(username, departmentType, formData)
      showToast('Service added successfully')
      setAddOpen(false)
      setFormData(emptyForm())
      loadServices()
    } catch (e: unknown) {
      showToast((e as Error).message, 'err')
    }
  }

  const handleEdit = async () => {
    if (!selectedService || !formData.departmentServiceName.trim()) {
      showToast('Service name is required', 'err')
      return
    }
    try {
      await editDepartmentService(
        username,
        selectedService.departmentServiceId,
        selectedService.departmentType,
        formData,
      )
      showToast('Service updated successfully')
      setEditOpen(false)
      setSelectedService(null)
      setFormData(emptyForm())
      loadServices()
    } catch (e: unknown) {
      showToast((e as Error).message, 'err')
    }
  }

  const handleDelete = async () => {
    if (!selectedService) return
    try {
      await deleteDepartmentService(
        username,
        selectedService.departmentServiceId,
        selectedService.departmentType,
      )
      showToast('Service deleted successfully')
      setDeleteOpen(false)
      setSelectedService(null)
      loadServices()
    } catch (e: unknown) {
      showToast((e as Error).message, 'err')
    }
  }

  // Loads the plans of one service into the Plans dialog (also used by its refresh button).
  const loadPlans = async (serviceId: DepartmentServiceEntity['departmentServiceId']) => {
    setPlansLoading(true)
    try {
      const p = await getPlansForService(serviceId)
      setPlans(p)
    } catch {
      setPlans([])
    } finally {
      setPlansLoading(false)
    }
  }

  const handleViewPlans = async (service: DepartmentServiceEntity) => {
    setSelectedService(service)
    setPlansOpen(true)
    setPlans([])
    await loadPlans(service.departmentServiceId)
  }

  const openEdit = (service: DepartmentServiceEntity) => {
    setSelectedService(service)
    setFormData({
      departmentServiceName: service.departmentServiceName,
      remarks: service.remarks || '',
      isServiceActive: service.isServiceActive,
    })
    setEditOpen(true)
  }

  const openDelete = (service: DepartmentServiceEntity) => {
    setSelectedService(service)
    setDeleteOpen(true)
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 p-4 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Manage Services</h2>
          <p className="text-sm text-slate-500">Create, edit, and manage your service offerings</p>
        </div>
        <button
          onClick={() => {
            setFormData(emptyForm())
            setAddOpen(true)
          }}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + Add New Service
        </button>
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

      {/* Search */}
      <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search services..."
            className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <RefreshButton onRefresh={loadServices} isRefreshing={loading} label="services" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50/70 text-slate-600">
                <th className="px-4 py-3 text-left font-semibold">#</th>
                <th className="px-4 py-3 text-left font-semibold">Service Name</th>
                <th className="px-4 py-3 text-left font-semibold">Department</th>
                <th className="px-4 py-3 text-left font-semibold">Remarks</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Created</th>
                <th className="px-4 py-3 text-center font-semibold">Plans</th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td colSpan={8} className="px-4 py-3">
                      <div className="h-6 w-full animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-rose-600">
                    ⚠ {error}
                  </td>
                </tr>
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">📋</span>
                      <p className="font-medium text-slate-700">No services found</p>
                      <p className="text-sm">
                        {searchTerm
                          ? 'Try adjusting your search'
                          : 'Get started by adding your first service'}
                      </p>
                      {!searchTerm && (
                        <button
                          onClick={() => { setFormData(emptyForm()); setAddOpen(true) }}
                          className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          + Add Your First Service
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                services.map((svc, idx) => (
                  <tr key={svc.departmentServiceId} className="border-b hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 text-slate-500 text-xs">{page * pageSize + idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-medium text-slate-800">
                        <span className="text-blue-600">💼</span>
                        {svc.departmentServiceName}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs font-medium text-green-700">
                        {svc.departmentType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{svc.remarks || 'No remarks'}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          svc.isServiceActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {svc.isServiceActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(svc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleViewPlans(svc)}
                        className="rounded-md border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors"
                      >
                        💳 View Plans
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1.5">
                        <button
                          onClick={() => openEdit(svc)}
                          className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => openDelete(svc)}
                          className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalElements > 0 && (
          <div className="border-t px-4 py-3 flex items-center justify-between text-sm text-slate-600">
            <span>
              Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalElements)} of {totalElements}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40 hover:bg-slate-50"
              >
                ←
              </button>
              <span className="text-xs text-slate-500">Page {page + 1} of {totalPage || 1}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPage - 1}
                className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40 hover:bg-slate-50"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add Dialog ── */}
      {addOpen && (
        <ServiceFormModal
          title="Add New Service"
          desc="Create a new service offering for your customers."
          formData={formData}
          setFormData={setFormData}
          onCancel={() => setAddOpen(false)}
          onConfirm={handleAdd}
          confirmLabel="Add Service"
        />
      )}

      {/* ── Edit Dialog ── */}
      {editOpen && (
        <ServiceFormModal
          title="Edit Service"
          desc="Update the service details."
          formData={formData}
          setFormData={setFormData}
          onCancel={() => setEditOpen(false)}
          onConfirm={handleEdit}
          confirmLabel="Update Service"
        />
      )}

      {/* ── Delete Dialog ── */}
      {deleteOpen && selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Delete Service</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to delete &quot;{selectedService.departmentServiceName}&quot;? This
              action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Plans Dialog ── */}
      {plansOpen && selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Associated Plans</h3>
                <p className="text-sm text-slate-500">
                  Plans for &quot;{selectedService.departmentServiceName}&quot;
                </p>
              </div>
              <div className="flex items-center gap-2">
                <RefreshButton
                  onRefresh={() => loadPlans(selectedService.departmentServiceId)}
                  isRefreshing={plansLoading}
                  label="plans"
                />
                <button
                  onClick={() => setPlansOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-xl"
                >
                  ✕
                </button>
              </div>
            </div>

            {plansLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : plans.length === 0 ? (
              <p className="py-8 text-center text-slate-500">No plans associated with this service yet.</p>
            ) : (
              <div className="space-y-2">
                {plans.map((plan, i) => (
                  <div
                    key={plan.planTypeId ?? i}
                    className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                        💳
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">{plan.planName}</div>
                        <div className="text-xs text-slate-500">
                          {(plan.departmentTypes?.length ?? 0) > 0
                            ? `${plan.departmentTypes!.length} department${plan.departmentTypes!.length !== 1 ? 's' : ''}`
                            : 'No departments'}
                        </div>
                      </div>
                    </div>
                    <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                      Associated
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setPlansOpen(false)}
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

// ── Service Form Modal ────────────────────────────────────────────────────────

interface FormModalProps {
  title: string
  desc: string
  formData: ServiceManageRequest
  setFormData: (f: ServiceManageRequest) => void
  onCancel: () => void
  onConfirm: () => void
  confirmLabel: string
}

function ServiceFormModal({
  title,
  desc,
  formData,
  setFormData,
  onCancel,
  onConfirm,
  confirmLabel,
}: FormModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-1">{title}</h3>
        <p className="text-sm text-slate-500 mb-5">{desc}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Service Name <span className="text-red-500">*</span>
            </label>
            <input
              value={formData.departmentServiceName}
              onChange={(e) => setFormData({ ...formData, departmentServiceName: e.target.value })}
              placeholder="Enter service name"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
            <input
              value={formData.remarks || ''}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Enter remarks (optional)"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isServiceActive: !formData.isServiceActive })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.isServiceActive ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  formData.isServiceActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-slate-700">Active</span>
          </div>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

