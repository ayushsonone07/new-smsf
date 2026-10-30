import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  CreditCard,
  Plus,
  Search,
  Edit,
  Trash2,
  Play,
  Pause,
  Layers,
  Building,
  Check,
  X,
  AlertCircle,
  Eye,
  Link as LinkIcon,
  Sparkles,
  CheckCircle2,
  Filter,
} from 'lucide-react'
import { getSession } from '../../../app/auth/session'
import { RefreshButton } from '../../../components/ui/RefreshButton'
import { TablePagination } from '../../../components/ui/TablePagination'
import {
  fetchPlans,
  managePlan,
  getServicesForPlan,
  addServicesToPlan,
  type PlanTypeEntity,
  type PlanTypeRequest,
} from '../../../api/plan.api'
import { fetchDepartmentServices, type DepartmentServiceEntity } from '../../../api/manage-services.api'

// Pre-defined known departments for quick selection
const KNOWN_DEPARTMENTS = [
  'GOOGLE_DEPARTMENT',
  'WEBSITE_DEPARTMENT',
  'AUTOMATION_DEPARTMENT',
  'AUTOWEBSION_DEPARTMENT',
  'SUPPORT_DEPARTMENT',
  'SEO_DEPARTMENT',
  'SALES_DEPARTMENT',
  'BILLING_DEPARTMENT',
  'ONBOARDING_DEPARTMENT',
  'SMO_DEPARTMENT',
  'CREATIVE_DEPARTMENT',
  'ADVERTISEMENT_DEPARTMENT',
]

interface PlanFormData {
  name: string
  departmentTypes: string[]
  featureList: string[]
  amount: string
  additionalAmount: string
  durationMonths: string
}

const emptyPlanForm = (): PlanFormData => ({
  name: '',
  departmentTypes: [],
  featureList: [],
  amount: '',
  additionalAmount: '',
  durationMonths: '',
})

export function PlanManagementPage() {
  const session = getSession()
  const user = session?.user
  const username = user?.email || user?.username || ''

  // Plans data state
  const [plans, setPlans] = useState<PlanTypeEntity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')

  // Pagination
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [totalElements, setTotalElements] = useState(0)

  // Expand department types in rows
  const [expandedPlanIds, setExpandedPlanIds] = useState<Set<string>>(new Set())

  // Dialogs
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isStatusToggleOpen, setIsStatusToggleOpen] = useState(false)
  const [statusToggleTarget, setStatusToggleTarget] = useState<PlanTypeEntity | null>(null)

  // Active plan for edit / delete
  const [selectedPlan, setSelectedPlan] = useState<PlanTypeEntity | null>(null)
  const [formData, setFormData] = useState<PlanFormData>(emptyPlanForm())
  const [featureInput, setFeatureInput] = useState('')
  const [deptInput, setDeptInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Subservices view / manage
  const [isSubservicesOpen, setIsSubservicesOpen] = useState(false)
  const [isAddSubservicesOpen, setIsAddSubservicesOpen] = useState(false)
  const [selectedPlanForServices, setSelectedPlanForServices] = useState<PlanTypeEntity | null>(null)
  const [associatedServices, setAssociatedServices] = useState<any[]>([])
  const [availableServices, setAvailableServices] = useState<DepartmentServiceEntity[]>([])
  const [selectedServiceIds, setSelectedServiceIds] = useState<(string | number)[]>([])
  const [servicesLoading, setServicesLoading] = useState(false)

  // Toast message
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'warning' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(0)
    }, 400)
    return () => clearTimeout(t)
  }, [searchTerm])

  // Load plans
  const loadPlans = useCallback(async () => {
    if (!username) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetchPlans({
        username,
        searchParam: debouncedSearch || undefined,
        page,
        size: pageSize,
      })
      setPlans(res.data)
      setTotalElements(res.totalElements)
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch plans')
    } finally {
      setLoading(false)
    }
  }, [username, debouncedSearch, page, pageSize])

  useEffect(() => {
    loadPlans()
  }, [loadPlans])

  // Filtered plans (client-side filters for active/inactive & department when returned)
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      if (statusFilter === 'active' && p.enabled === false) return false
      if (statusFilter === 'inactive' && p.enabled !== false) return false
      if (departmentFilter !== 'all') {
        const matchesDept = (p.departmentTypes || []).some(
          (d) => d.toLowerCase() === departmentFilter.toLowerCase(),
        )
        if (!matchesDept) return false
      }
      return true
    })
  }, [plans, statusFilter, departmentFilter])

  // Stats calculation
  const totalPlansCount = plans.length
  const activePlansCount = plans.filter((p) => p.enabled !== false).length
  const inactivePlansCount = plans.filter((p) => p.enabled === false).length
  const allDepartmentsPresent = useMemo(() => {
    const set = new Set<string>()
    plans.forEach((p) => p.departmentTypes?.forEach((d) => set.add(d)))
    return Array.from(set).sort()
  }, [plans])

  // Department color palette
  const getDeptColor = (index: number) => {
    const colors = [
      'bg-blue-50 text-blue-700 border-blue-200',
      'bg-emerald-50 text-emerald-700 border-emerald-200',
      'bg-purple-50 text-purple-700 border-purple-200',
      'bg-amber-50 text-amber-700 border-amber-200',
      'bg-rose-50 text-rose-700 border-rose-200',
      'bg-indigo-50 text-indigo-700 border-indigo-200',
      'bg-cyan-50 text-cyan-700 border-cyan-200',
    ]
    return colors[index % colors.length]
  }

  // Toggle plan expansion for departments
  const togglePlanExpansion = (planId: string) => {
    setExpandedPlanIds((prev) => {
      const next = new Set(prev)
      if (next.has(planId)) next.delete(planId)
      else next.add(planId)
      return next
    })
  }

  // Validation
  const validateDuration = (val: string): boolean => {
    if (!val.trim()) return true
    const num = Number(val)
    if (Number.isInteger(num) && num >= 1 && num <= 60) return true
    showToast('Duration must be a whole number between 1 and 60 months.', 'error')
    return false
  }

  // Handle Add Plan
  const handleOpenAdd = () => {
    setFormData(emptyPlanForm())
    setFeatureInput('')
    setDeptInput('')
    setIsAddOpen(true)
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      showToast('Please enter a plan name.', 'warning')
      return
    }
    if (formData.departmentTypes.length === 0) {
      showToast('Please select at least one department type.', 'warning')
      return
    }
    if (!validateDuration(formData.durationMonths)) return

    setIsSubmitting(true)
    try {
      const request: PlanTypeRequest = {
        planName: formData.name.trim(),
        departmentTypes: formData.departmentTypes,
        featureList: formData.featureList,
        amount: formData.amount === '' ? null : Number(formData.amount),
        additionalAmount: formData.additionalAmount === '' ? null : Number(formData.additionalAmount),
        durationMonths: formData.durationMonths === '' ? null : Number(formData.durationMonths),
      }

      await managePlan({
        username,
        action: 'add',
        plan: request,
      })

      showToast(`Plan "${formData.name.trim()}" created successfully!`, 'success')
      setIsAddOpen(false)
      loadPlans()
    } catch (err: any) {
      showToast(err?.message || 'Failed to create plan.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Edit Plan
  const handleOpenEdit = (plan: PlanTypeEntity) => {
    setSelectedPlan(plan)
    setFormData({
      name: plan.planName,
      departmentTypes: plan.departmentTypes || [],
      featureList: plan.featureList || [],
      amount: plan.amount != null ? String(plan.amount) : '',
      additionalAmount: plan.additionalAmount != null ? String(plan.additionalAmount) : '',
      durationMonths: plan.durationMonths != null ? String(plan.durationMonths) : '',
    })
    setFeatureInput('')
    setDeptInput('')
    setIsEditOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlan) return
    if (!formData.name.trim()) {
      showToast('Please enter a plan name.', 'warning')
      return
    }
    if (formData.departmentTypes.length === 0) {
      showToast('Please select at least one department type.', 'warning')
      return
    }
    if (!validateDuration(formData.durationMonths)) return

    setIsSubmitting(true)
    try {
      const request: PlanTypeRequest = {
        planName: formData.name.trim(),
        departmentTypes: formData.departmentTypes,
        featureList: formData.featureList,
        amount: formData.amount === '' ? null : Number(formData.amount),
        additionalAmount: formData.additionalAmount === '' ? null : Number(formData.additionalAmount),
        durationMonths: formData.durationMonths === '' ? null : Number(formData.durationMonths),
      }

      await managePlan({
        username,
        action: 'edit',
        planTypeId: selectedPlan.planTypeId,
        plan: request,
      })

      showToast(`Plan "${formData.name.trim()}" updated successfully!`, 'success')
      setIsEditOpen(false)
      setSelectedPlan(null)
      loadPlans()
    } catch (err: any) {
      showToast(err?.message || 'Failed to update plan.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Activate / Deactivate
  const handleOpenStatusToggle = (plan: PlanTypeEntity) => {
    setStatusToggleTarget(plan)
    setIsStatusToggleOpen(true)
  }

  const handleConfirmStatusToggle = async () => {
    if (!statusToggleTarget) return
    const isActivating = statusToggleTarget.enabled === false
    const action = isActivating ? 'activate' : 'deactivate'

    setIsSubmitting(true)
    try {
      await managePlan({
        username,
        action,
        planTypeId: statusToggleTarget.planTypeId,
      })

      showToast(
        `Plan "${statusToggleTarget.planName}" ${isActivating ? 'activated' : 'deactivated'} successfully!`,
        'success',
      )
      setIsStatusToggleOpen(false)
      setStatusToggleTarget(null)
      loadPlans()
    } catch (err: any) {
      showToast(err?.message || `Failed to ${action} plan.`, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Delete Plan
  const handleOpenDelete = (plan: PlanTypeEntity) => {
    setSelectedPlan(plan)
    setIsDeleteOpen(true)
  }

  const handleDeleteSubmit = async () => {
    if (!selectedPlan) return
    setIsSubmitting(true)
    try {
      await managePlan({
        username,
        action: 'delete',
        planTypeId: selectedPlan.planTypeId,
      })

      showToast(`Plan "${selectedPlan.planName}" deleted successfully!`, 'success')
      setIsDeleteOpen(false)
      setSelectedPlan(null)
      loadPlans()
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete plan.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Subservices modal
  const handleOpenSubservices = async (plan: PlanTypeEntity) => {
    setSelectedPlanForServices(plan)
    setIsSubservicesOpen(true)
    setServicesLoading(true)
    try {
      const res = await getServicesForPlan(plan.planTypeId, 0, 100)
      setAssociatedServices(res.data || [])
    } catch (err: any) {
      showToast(err?.message || 'Failed to load services for plan.', 'error')
      setAssociatedServices([])
    } finally {
      setServicesLoading(false)
    }
  }

  // Add services to plan
  const handleOpenAddSubservices = async () => {
    if (!selectedPlanForServices) return
    setIsSubservicesOpen(false)
    setIsAddSubservicesOpen(true)
    setSelectedServiceIds([])
    setServicesLoading(true)
    try {
      // Fetch all department services
      const res = await fetchDepartmentServices({
        username,
        page: 0,
        size: 100,
      })
      setAvailableServices(res.data || [])
    } catch (err: any) {
      showToast(err?.message || 'Failed to load available services.', 'error')
      setAvailableServices([])
    } finally {
      setServicesLoading(false)
    }
  }

  const handleToggleServiceSelection = (id: string | number) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const handleSaveSubservices = async () => {
    if (!selectedPlanForServices || selectedServiceIds.length === 0) {
      showToast('Please select at least one service.', 'warning')
      return
    }

    setIsSubmitting(true)
    try {
      await addServicesToPlan(selectedPlanForServices.planTypeId, selectedServiceIds)
      showToast('Services added to plan successfully!', 'success')
      setIsAddSubservicesOpen(false)
      setSelectedServiceIds([])
      // Re-open associated services dialog with refreshed list
      handleOpenSubservices(selectedPlanForServices)
    } catch (err: any) {
      showToast(err?.message || 'Failed to add services to plan.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Feature badge add/remove helpers for modals
  const handleAddFeature = () => {
    const trimmed = featureInput.trim()
    if (trimmed && !formData.featureList.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        featureList: [...prev.featureList, trimmed],
      }))
      setFeatureInput('')
    }
  }

  const handleRemoveFeature = (feat: string) => {
    setFormData((prev) => ({
      ...prev,
      featureList: prev.featureList.filter((f) => f !== feat),
    }))
  }

  // Department badge add/remove helpers for modals
  const handleAddDept = (dept: string) => {
    if (dept && !formData.departmentTypes.includes(dept)) {
      setFormData((prev) => ({
        ...prev,
        departmentTypes: [...prev.departmentTypes, dept],
      }))
      setDeptInput('')
    }
  }

  const handleRemoveDept = (dept: string) => {
    setFormData((prev) => ({
      ...prev,
      departmentTypes: prev.departmentTypes.filter((d) => d !== dept),
    }))
  }

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 md:p-6 lg:p-8">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg border text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : toast.type === 'error'
                ? 'bg-red-50 text-red-800 border-red-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <CreditCard className="h-5 w-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Plan Management</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Configure subscription tiers, department access, pricing, and services across your platform.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <RefreshButton onRefresh={loadPlans} isRefreshing={loading} label="plans" />
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 transition-colors focus:ring-2 focus:ring-purple-400"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Plan</span>
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Plans</span>
            <span className="rounded-lg bg-purple-50 p-1.5 text-purple-600">
              <Layers className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{totalElements || totalPlansCount}</div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Plans</span>
            <span className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600">
              <Check className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">{activePlansCount}</div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Deactivated</span>
            <span className="rounded-lg bg-amber-50 p-1.5 text-amber-600">
              <Pause className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">{inactivePlansCount}</div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Departments Covered</span>
            <span className="rounded-lg bg-blue-50 p-1.5 text-blue-600">
              <Building className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-600">{allDepartmentsPresent.length}</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search plans by name or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-8 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:outline-hidden"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Status filter */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50/60 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                statusFilter === 'active' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('inactive')}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                statusFilter === 'inactive' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Inactive
            </button>
          </div>

          {/* Department filter dropdown */}
          <div className="relative">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-purple-500 focus:outline-hidden"
            >
              <option value="all">All Departments</option>
              {allDepartmentsPresent.map((dept) => (
                <option key={dept} value={dept}>
                  {dept.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Plans Table Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 text-center w-12">#</th>
                <th className="px-4 py-3">Plan Details</th>
                <th className="px-4 py-3">Department Access</th>
                <th className="px-4 py-3">Key Features</th>
                <th className="px-4 py-3 text-center">Subservices</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                    <p className="mt-2 text-xs">Loading plans...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center">
                    <div className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-xs text-red-600 border border-red-200">
                      <AlertCircle className="h-4 w-4" />
                      <span>{error}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="font-medium text-slate-600">No plans found</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {searchTerm ? 'Try adjusting your search or filters.' : 'Click "Add New Plan" to create your first plan.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan, index) => {
                  const isExpanded = expandedPlanIds.has(plan.planTypeId)
                  const isEnabled = plan.enabled !== false
                  const depts = plan.departmentTypes || []
                  const features = plan.featureList || []
                  const displayedDepts = isExpanded ? depts : depts.slice(0, 2)

                  return (
                    <tr key={plan.planTypeId || index} className="hover:bg-slate-50/60 transition-colors">
                      {/* # Number */}
                      <td className="px-4 py-3.5 text-center font-semibold text-slate-400 w-12">
                        {page * pageSize + index + 1}
                      </td>

                      {/* Plan Info */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{plan.planName}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                          {plan.amount != null ? (
                            <span className="font-bold text-slate-800">
                              ₹{Number(plan.amount).toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="italic text-slate-400">No base price</span>
                          )}

                          {plan.additionalAmount != null && Number(plan.additionalAmount) > 0 && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">
                              +₹{Number(plan.additionalAmount).toLocaleString('en-IN')} addl.
                            </span>
                          )}

                          {plan.durationMonths != null && (
                            <span className="rounded bg-purple-50 px-1.5 py-0.5 font-medium text-purple-700 border border-purple-200">
                              {plan.durationMonths} {Number(plan.durationMonths) === 1 ? 'month' : 'months'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Departments */}
                      <td className="px-4 py-3.5 max-w-[280px]">
                        <div className="flex flex-wrap items-center gap-1">
                          {depts.length === 0 ? (
                            <span className="italic text-slate-400 text-[11px]">No departments</span>
                          ) : (
                            <>
                              {displayedDepts.map((d, dIdx) => (
                                <span
                                  key={dIdx}
                                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold border ${getDeptColor(
                                    dIdx,
                                  )}`}
                                >
                                  {d.replace(/_/g, ' ')}
                                </span>
                              ))}

                              {depts.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => togglePlanExpansion(plan.planTypeId)}
                                  className="text-[10px] font-semibold text-purple-600 hover:text-purple-800 hover:underline ml-1"
                                >
                                  {isExpanded ? 'Show less' : `+${depts.length - 2} more`}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>

                      {/* Features */}
                      <td className="px-4 py-3.5 max-w-[240px]">
                        <div className="flex flex-wrap items-center gap-1">
                          {features.length === 0 ? (
                            <span className="italic text-slate-400 text-[11px]">None</span>
                          ) : (
                            <>
                              {features.slice(0, 2).map((feat, fIdx) => (
                                <span
                                  key={fIdx}
                                  className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200"
                                >
                                  <Sparkles className="h-2.5 w-2.5" />
                                  <span>{feat}</span>
                                </span>
                              ))}
                              {features.length > 2 && (
                                <span className="text-[10px] text-slate-400">
                                  +{features.length - 2} more
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>

                      {/* Subservices View Button */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenSubservices(plan)}
                          className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-medium text-purple-700 hover:bg-purple-100 hover:border-purple-300 transition-colors"
                          title="View associated services"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Services</span>
                        </button>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                            isEnabled
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isEnabled ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          />
                          <span>{isEnabled ? 'Active' : 'Deactivated'}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(plan)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                            title="Edit Plan"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>

                          {/* Activate / Deactivate button */}
                          <button
                            type="button"
                            onClick={() => handleOpenStatusToggle(plan)}
                            className={`rounded-lg p-1.5 transition-colors ${
                              isEnabled
                                ? 'text-amber-500 hover:bg-amber-50 hover:text-amber-700'
                                : 'text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                            title={isEnabled ? 'Deactivate Plan' : 'Activate Plan'}
                          >
                            {isEnabled ? (
                              <Pause className="h-3.5 w-3.5" />
                            ) : (
                              <Play className="h-3.5 w-3.5" />
                            )}
                          </button>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(plan)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Delete Plan"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-slate-100 px-4 py-3">
          <TablePagination
            page={page}
            pageSize={pageSize}
            totalResults={totalElements || plans.length}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize)
              setPage(0)
            }}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ADD PLAN MODAL                                                            */}
      {/* ========================================================================= */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                  <Plus className="h-4 w-4" />
                </span>
                <h2 className="text-base font-bold text-slate-900">Add New Plan</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              {/* Plan Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Plan Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard Plan, Enterprise Growth"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-purple-500 focus:outline-hidden"
                />
              </div>

              {/* Pricing & Duration row */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 98000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-purple-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Additional (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Optional"
                    value={formData.additionalAmount}
                    onChange={(e) => setFormData({ ...formData, additionalAmount: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-purple-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Duration (months)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    placeholder="1–60"
                    value={formData.durationMonths}
                    onChange={(e) => setFormData({ ...formData, durationMonths: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-purple-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Department Types */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Department Types <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 flex gap-2">
                  <select
                    value={deptInput}
                    onChange={(e) => setDeptInput(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 focus:border-purple-500 focus:outline-hidden"
                  >
                    <option value="">-- Select department to add --</option>
                    {KNOWN_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept} disabled={formData.departmentTypes.includes(dept)}>
                        {dept.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleAddDept(deptInput)}
                    disabled={!deptInput || formData.departmentTypes.includes(deptInput)}
                    className="rounded-xl bg-purple-100 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-200 disabled:opacity-50 transition-colors"
                  >
                    Add
                  </button>
                </div>

                {/* Selected department badges */}
                {formData.departmentTypes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {formData.departmentTypes.map((dept) => (
                      <span
                        key={dept}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 border border-blue-200"
                      >
                        <span>{dept.replace(/_/g, ' ')}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDept(dept)}
                          className="ml-1 text-blue-400 hover:text-red-600 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Feature List */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">Feature List</label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 24/7 Dedicated Support, Free Domain"
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddFeature()
                      }
                    }}
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-purple-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    disabled={!featureInput.trim() || formData.featureList.includes(featureInput.trim())}
                    className="rounded-xl bg-purple-100 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-200 disabled:opacity-50 transition-colors"
                  >
                    Add
                  </button>
                </div>

                {/* Feature badges */}
                {formData.featureList.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {formData.featureList.map((feat) => (
                      <span
                        key={feat}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>{feat}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(feat)}
                          className="ml-1 text-emerald-400 hover:text-red-600 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Saving...' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT PLAN MODAL                                                           */}
      {/* ========================================================================= */}
      {isEditOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <Edit className="h-4 w-4" />
                </span>
                <h2 className="text-base font-bold text-slate-900">Edit Plan</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              {/* Plan Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Plan Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard Plan"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-purple-500 focus:outline-hidden"
                />
              </div>

              {/* Pricing & Duration row */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 98000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-purple-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Additional (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Optional"
                    value={formData.additionalAmount}
                    onChange={(e) => setFormData({ ...formData, additionalAmount: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-purple-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Duration (months)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    placeholder="1–60"
                    value={formData.durationMonths}
                    onChange={(e) => setFormData({ ...formData, durationMonths: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-purple-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Department Types */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Department Types <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 flex gap-2">
                  <select
                    value={deptInput}
                    onChange={(e) => setDeptInput(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 focus:border-purple-500 focus:outline-hidden"
                  >
                    <option value="">-- Select department to add --</option>
                    {KNOWN_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept} disabled={formData.departmentTypes.includes(dept)}>
                        {dept.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleAddDept(deptInput)}
                    disabled={!deptInput || formData.departmentTypes.includes(deptInput)}
                    className="rounded-xl bg-purple-100 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-200 disabled:opacity-50 transition-colors"
                  >
                    Add
                  </button>
                </div>

                {/* Selected department badges */}
                {formData.departmentTypes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {formData.departmentTypes.map((dept) => (
                      <span
                        key={dept}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 border border-blue-200"
                      >
                        <span>{dept.replace(/_/g, ' ')}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDept(dept)}
                          className="ml-1 text-blue-400 hover:text-red-600 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Feature List */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">Feature List</label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter feature"
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddFeature()
                      }
                    }}
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-purple-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    disabled={!featureInput.trim() || formData.featureList.includes(featureInput.trim())}
                    className="rounded-xl bg-purple-100 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-200 disabled:opacity-50 transition-colors"
                  >
                    Add
                  </button>
                </div>

                {/* Feature badges */}
                {formData.featureList.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {formData.featureList.map((feat) => (
                      <span
                        key={feat}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>{feat}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(feat)}
                          className="ml-1 text-emerald-400 hover:text-red-600 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Updating...' : 'Update Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ACTIVATE / DEACTIVATE CONFIRMATION MODAL                                  */}
      {/* ========================================================================= */}
      {isStatusToggleOpen && statusToggleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  statusToggleTarget.enabled === false
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-amber-100 text-amber-600'
                }`}
              >
                {statusToggleTarget.enabled === false ? (
                  <Play className="h-5 w-5" />
                ) : (
                  <Pause className="h-5 w-5" />
                )}
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {statusToggleTarget.enabled === false ? 'Activate Plan' : 'Deactivate Plan'}
                </h3>
                <p className="text-xs text-slate-500">Change plan operational state</p>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-600 leading-relaxed">
              Are you sure you want to {statusToggleTarget.enabled === false ? 'activate' : 'deactivate'}{' '}
              <strong>"{statusToggleTarget.planName}"</strong>?{' '}
              {statusToggleTarget.enabled === false
                ? 'This plan will become selectable in onboarding and registration forms.'
                : 'This plan will be paused and hidden from new customer signups.'}
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsStatusToggleOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusToggle}
                disabled={isSubmitting}
                className={`rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors ${
                  statusToggleTarget.enabled === false
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {isSubmitting
                  ? 'Processing...'
                  : statusToggleTarget.enabled === false
                    ? 'Activate'
                    : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE PLAN CONFIRMATION MODAL                                            */}
      {/* ========================================================================= */}
      {isDeleteOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <Trash2 className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Confirm Plan Deletion</h3>
                <p className="text-xs text-slate-500">This action cannot be undone</p>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete <strong>"{selectedPlan.planName}"</strong>? Any
              dependent services mapping to this plan may be affected.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={isSubmitting}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-red-700 transition-colors"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW ASSOCIATED SUBSERVICES MODAL                                         */}
      {/* ========================================================================= */}
      {isSubservicesOpen && selectedPlanForServices && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Associated Services</h3>
                <p className="text-xs text-slate-500">
                  Services included in <strong>"{selectedPlanForServices.planName}"</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSubservicesOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex-1 overflow-y-auto pr-1">
              {servicesLoading ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                  <p className="mt-2 text-xs">Loading services...</p>
                </div>
              ) : associatedServices.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <LinkIcon className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 font-medium text-slate-600">No services mapped yet</p>
                  <p className="text-xs text-slate-400">Add services to associate them with this plan.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {associatedServices.map((service, idx) => (
                    <div
                      key={service.departmentServiceId || idx}
                      className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3 bg-slate-50/40"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                          <LinkIcon className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-slate-900">
                            {service.departmentServiceName}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {service.departmentType?.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-200">
                        Mapped
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setIsSubservicesOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleOpenAddSubservices}
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-purple-700"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Services to Plan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD SERVICES TO PLAN MODAL                                                */}
      {/* ========================================================================= */}
      {isAddSubservicesOpen && selectedPlanForServices && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Select Services to Add</h3>
                <p className="text-xs text-slate-500">
                  Select services to link with <strong>"{selectedPlanForServices.planName}"</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSubservicesOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex-1 overflow-y-auto pr-1">
              {servicesLoading ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                  <p className="mt-2 text-xs">Loading available services...</p>
                </div>
              ) : availableServices.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <p className="font-medium text-slate-600">No services available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableServices.map((service) => {
                    const isSelected = selectedServiceIds.includes(service.departmentServiceId)
                    return (
                      <div
                        key={service.departmentServiceId}
                        onClick={() => handleToggleServiceSelection(service.departmentServiceId)}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-colors ${
                          isSelected
                            ? 'border-purple-300 bg-purple-50/60'
                            : 'border-slate-200/80 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // handled by parent div
                            className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                          />
                          <div>
                            <p className="text-xs font-semibold text-slate-900">
                              {service.departmentServiceName}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {service.departmentType.replace(/_/g, ' ')}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {service.isServiceActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => {
                  setIsAddSubservicesOpen(false)
                  setIsSubservicesOpen(true)
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSaveSubservices}
                disabled={isSubmitting || selectedServiceIds.length === 0}
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : `Add Selected (${selectedServiceIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PlanManagementPage
