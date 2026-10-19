import { useMemo, useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Globe,
  Bot,
  RefreshCw,
  Phone,
  Mail,
  Building,
  Eye,
  CheckCircle,
  AlertCircle,
  Search,
  Layers,
  Filter,
  FileText,
  Clock,
  X,
  Loader2,
  ChevronsUpDown,
  MessageSquare,
} from 'lucide-react'
import { LoadingState } from '../../../../components/ui/LoadingState'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { TablePagination } from '../../../../components/ui/TablePagination'
import { CustomersListModal } from '../../../../components/head/customers-list/CustomersListModal'
import { ServiceFlowModal } from '../../../../components/head/customers-list/ServiceFlowModal'
import {
  getCustomerInternalRemarks,
  type CustomerRemark,
} from '../../../../api/customer-drawer.api'
import {
  fetchLightAutowebisionCustomers,
  assignAutowebisionUser,
  updateAutowebisionStatus,
  updateWebsiteExistsStatus,
  fetchAutowebsionSummaryCounts,
  fetchAutowebsionUsers,
  fetchMeetingsAssigningList,
  fetchAutomationCount,
  type AutowebsionCustomerLightDTO,
  type ServiceStatusCount,
} from '../../../../api/autowebsion.api'
import { getSession } from '../../../../app/auth/session'
import { useDepartmentColumnPermissions } from '../../../permissions/hooks/useDepartmentColumnPermissions'
import type { FeaturePermission } from '../../../permissions/types/permission.types'
import { useAssigningUsers } from '../../hooks/useAssigningUsers'
import { initiateAirtelClickToCall } from '../../../../api/airtel.api'
import { recordCustomerActivity } from '../../../../utils/customerActivity'
import { getCustomerFormUrl } from '../../../../utils/urlEncryption'
import {
  type OnboardingCustomer,
  type OnboardingStatus,
} from '../../../../components/head/customers-list/CustomersList'
import './AutowebisionCustomers.css'

export type AutowebsionSubTab = 'ALL' | 'WEBSITE' | 'AUTOMATION'
export type AutowebsionStatusFilter = 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'

export function AutowebisionCustomersPage({
  feature,
  defaultSubTab = 'ALL',
}: {
  feature?: FeaturePermission
  defaultSubTab?: AutowebsionSubTab
} = {}) {
  void feature

  const session = getSession()
  const userRole = (session?.user as any)?.role
  const isDepartmentUser =
    userRole === 'USER' ||
    userRole === 'DEPARTMENT_USER' ||
    Boolean(
      typeof window !== 'undefined' &&
        (window.location.pathname.includes('/user/') ||
          window.location.pathname.includes('-user') ||
          window.location.pathname.includes('/users')),
    )
  const userEmail = session?.user.email || session?.user.username || ''

  // Permissions must come from the department that owns the current route.
  // Using AUTOWEBSION_DEPARTMENT here bypassed the AUTOMATION_DEPARTMENT
  // Head/User access configured by Admin.
  const permissionDepartmentType = session?.user.departmentType || (
    typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('automation')
      ? 'AUTOMATION_DEPARTMENT'
      : typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('website')
        ? 'WEBSITE_DEPARTMENT'
        : 'AUTOWEBSION_DEPARTMENT'
  )
  const permissionRouteName = permissionDepartmentType === 'AUTOMATION_DEPARTMENT'
    ? 'automation_department/head/customer-list'
    : permissionDepartmentType === 'WEBSITE_DEPARTMENT'
      ? 'website_department/head/customer-list'
      : undefined
  const { isColumnEnabled, canEditColumn } = useDepartmentColumnPermissions(
    permissionDepartmentType,
    permissionRouteName,
  )

  const isIndexVisible = isColumnEnabled('Index') || isColumnEnabled('#')
  const isDateVisible = isColumnEnabled('Created') || isColumnEnabled('Date') || isColumnEnabled('Created Date')
  const isCustomerVisible = isColumnEnabled('Customer') || isColumnEnabled('Business') || isColumnEnabled('Company')
  const isContactVisible = isColumnEnabled('Contact') || isColumnEnabled('Phone')
  const isRequirementFormVisible = isColumnEnabled('Requirement Form') || isColumnEnabled('Form') || isColumnEnabled('Open Form')
  const isServicesVisible = isColumnEnabled('Services') || isColumnEnabled('Service') || isColumnEnabled('Service Type')
  const isStatusVisible = isColumnEnabled('Status') || isColumnEnabled('Service Status')
  const isExpirationVisible = isColumnEnabled('Expiration') || isColumnEnabled('Expiry') || isColumnEnabled('Service Expiration')
  const isClientRemarkVisible = isColumnEnabled('Client Remark') || isColumnEnabled('Client Remarks')
  const isInternalRemarkVisible = isColumnEnabled('Internal Remark') || isColumnEnabled('Remark') || isColumnEnabled('Remarks')
  const isDraftSentVisible = isColumnEnabled('Draft Sent') || isColumnEnabled('Draft') || isColumnEnabled('Mail Sent')
  const isAssigneeVisible = !isDepartmentUser && (isColumnEnabled('Assigned To') || isColumnEnabled('Assign To') || isColumnEnabled('Assignee'))
  const isActionsVisible = isColumnEnabled('Actions') || isColumnEnabled('Action')

  const canEditWebsiteExists = canEditColumn('Website Exists') || canEditColumn('Website') || canEditColumn('isWebsiteExists')
  const canEditStatus = canEditColumn('Status') || canEditColumn('Service Status')
  const canEditAssignee = canEditColumn('Assigned To') && !isDepartmentUser
  const canEditContact = canEditColumn('Contact')
  const canEditServices = canEditColumn('Services') || canEditColumn('Service Type')

  const [activeSubTab, setActiveSubTab] = useState<AutowebsionSubTab>(defaultSubTab)
  const [activeStatus, setActiveStatus] = useState<AutowebsionStatusFilter>('ALL')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showFilterDrawer, setShowFilterDrawer] = useState(false)
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)

  useEffect(() => {
    if (defaultSubTab) {
      setActiveSubTab(defaultSubTab)
      setPage(0)
    }
  }, [defaultSubTab])

  // Modals state
  const [selectedCustomer, setSelectedCustomer] = useState<OnboardingCustomer | null>(null)
  const [serviceFlowTarget, setServiceFlowTarget] = useState<{
    customer: OnboardingCustomer
    serviceType: 'WEBSITE' | 'AUTOMATION'
  } | null>(null)
  const [viewingClientRemark, setViewingClientRemark] = useState<{ name: string; remark: string } | null>(null)
  const [viewingDuplicate, setViewingDuplicate] = useState<{ name: string; customerId: number } | null>(null)
  const [updatingWebsiteExistsId, setUpdatingWebsiteExistsId] = useState<number | null>(null)
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null)
  const [callingCustomerId, setCallingCustomerId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // On-demand Internal Remarks state
  const [viewingInternalRemarks, setViewingInternalRemarks] = useState<{
    customerId: number
    customerName: string
    departmentType: 'WEBSITE_DEPARTMENT' | 'AUTOMATION_DEPARTMENT'
    remarks: CustomerRemark[] | null
    loading: boolean
    error: string | null
  } | null>(null)

  // Assign dropdown & modal state matching screenshots
  const [openAssignDropdownId, setOpenAssignDropdownId] = useState<number | null>(null)
  const [assignSearchQuery, setAssignSearchQuery] = useState('')
  const [assignModalTarget, setAssignModalTarget] = useState<{
    customer: AutowebsionCustomerLightDTO
    user: { email: string; name: string }
  } | null>(null)
  const [isAssigningUser, setIsAssigningUser] = useState(false)
  const assignDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!openAssignDropdownId) return
    function handleClickOutside(event: MouseEvent) {
      if (
        assignDropdownRef.current &&
        !assignDropdownRef.current.contains(event.target as Node)
      ) {
        setOpenAssignDropdownId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openAssignDropdownId])

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 400)
    return () => clearTimeout(handler)
  }, [search])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  const departmentTypeParam =
    activeSubTab === 'WEBSITE'
      ? 'WEBSITE_DEPARTMENT'
      : activeSubTab === 'AUTOMATION'
        ? 'AUTOMATION_DEPARTMENT'
        : undefined

  // For department users, automatically scope customer requests to their own assigned email
  const effectiveAssignee = isDepartmentUser
    ? userEmail
    : (selectedAssignee !== 'all' ? selectedAssignee : undefined)

  // 1. Fetch lightweight customers list for Autowebsion: GET /api/autowebision/customers/light?page=0&size=10
  const customersQuery = useQuery({
    queryKey: [
      'autowebisionCustomers',
      page,
      size,
      debouncedSearch,
      activeStatus,
      activeSubTab,
      effectiveAssignee,
      dateFrom,
      dateTo,
    ],
    queryFn: () =>
      fetchLightAutowebisionCustomers({
        page,
        size,
        search: debouncedSearch || undefined,
        status: activeStatus === 'ALL' ? undefined : activeStatus,
        departmentType: departmentTypeParam,
        assignedUserEmail: effectiveAssignee,
        startDate: dateFrom || undefined,
        endDate: dateTo || undefined,
      }),
  })

  // 2. Fetch live combined statistics:
  // For Department Head: department-wide statistics
  // For Department User: user-scoped counts via /api/auth/automation-count/{email}
  const countsQuery = useQuery({
    queryKey: ['autowebisionSummaryCounts', isDepartmentUser ? userEmail : 'all'],
    queryFn: async () => {
      if (isDepartmentUser && userEmail) {
        const userCounts = await fetchAutomationCount(userEmail)
        const web = userCounts.find((c: ServiceStatusCount) => c.serviceCategory?.toUpperCase() === 'WEBSITE') || { total: 0, pending: 0, inProgress: 0, completed: 0 }
        const auto = userCounts.find((c: ServiceStatusCount) => c.serviceCategory?.toUpperCase() === 'AUTOMATION') || { total: 0, pending: 0, inProgress: 0, completed: 0 }
        return {
          all: {
            total: web.total + auto.total,
            pending: web.pending + auto.pending,
            inProgress: web.inProgress + auto.inProgress,
            completed: web.completed + auto.completed,
          },
          website: web,
          automation: auto,
        }
      }
      return fetchAutowebsionSummaryCounts()
    },
    staleTime: 20_000,
  })

  // 3. Exact Assignable Users: GET /api/autowebision/users?page=0&size=100
  const autowebUsersQuery = useQuery({
    queryKey: ['autowebisionUsers100'],
    queryFn: () => fetchAutowebsionUsers(0, 100),
    staleTime: 60_000,
  })

  // 4. Exact Assignable List: GET /api/meetings/users/assigning-list?departmentType=AUTOWEBSION_DEPARTMENT
  const meetingsAssignQuery = useQuery({
    queryKey: ['meetingsAssigningListAutowebsion'],
    queryFn: () => fetchMeetingsAssigningList('AUTOWEBSION_DEPARTMENT'),
    staleTime: 60_000,
  })

  const assigningUsersQuery = useAssigningUsers('AUTOWEBSION_DEPARTMENT')

  const assignees = useMemo(() => {
    const list: Array<{ id: string; name: string }> = []
    const seen = new Set<string>()

    const raw1 = autowebUsersQuery.data?.data || []
    for (const u of raw1) {
      const email = u.email || u.username
      if (email && !seen.has(email)) {
        seen.add(email)
        list.push({
          id: email,
          name: u.username ? `${u.username} (${email})` : email,
        })
      }
    }

    const raw2 = Array.isArray(meetingsAssignQuery.data)
      ? meetingsAssignQuery.data
      : (meetingsAssignQuery.data?.data || [])
    for (const u of raw2) {
      const email = u.email || u.username
      if (email && !seen.has(email)) {
        seen.add(email)
        list.push({
          id: email,
          name: u.username ? `${u.username} (${email})` : email,
        })
      }
    }

    if (list.length === 0 && assigningUsersQuery.data?.length) {
      for (const u of assigningUsersQuery.data) {
        if (u.email && !seen.has(u.email)) {
          seen.add(u.email)
          list.push({
            id: u.email,
            name: u.username ? `${u.username} (${u.email})` : u.email,
          })
        }
      }
    }

    return list
  }, [autowebUsersQuery.data, meetingsAssignQuery.data, assigningUsersQuery.data])

  const filteredAssignees = useMemo(() => {
    if (!assignSearchQuery.trim()) return assignees
    const q = assignSearchQuery.toLowerCase()
    return assignees.filter(
      (a) => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q),
    )
  }, [assignees, assignSearchQuery])

  // Compute status counts for active sub tab
  const statusCounts = useMemo(() => {
    const counts = countsQuery.data
    if (!counts) {
      return {
        total: customersQuery.data?.totalElements ?? 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
      }
    }

    if (activeSubTab === 'WEBSITE') {
      return counts.website
    }
    if (activeSubTab === 'AUTOMATION') {
      return counts.automation
    }
    return counts.all
  }, [countsQuery.data, activeSubTab, customersQuery.data?.totalElements])

  // Helper to compute website status according to user specification:
  // "is me Website ke do status aate hai to seniro maintain karna jab dono complete ho tabi complete show karna vana pending ya in progress ok"
  function getWebsiteServiceStatus(c: AutowebsionCustomerLightDTO): string {
    const services = Array.isArray(c.services) ? c.services : []
    const websiteServices = services.filter((s: any) => {
      const st = String(s?.serviceType || '').toUpperCase()
      return st.includes('WEB')
    })

    if (websiteServices.length > 0) {
      const statuses = websiteServices.map((s: any) =>
        String(s?.status || 'PENDING').toUpperCase().replace(/-/g, '_'),
      )
      const allCompleted = statuses.every((st) => st.includes('COMPLETE'))
      if (allCompleted) return 'COMPLETED'

      const anyStarted = statuses.some((st) => st.includes('PROGRESS') || st.includes('COMPLETE'))
      if (anyStarted) return 'IN_PROGRESS'

      return 'PENDING'
    }

    const fallback = String(c.mainStatus || 'PENDING').toUpperCase().replace(/-/g, '_')
    return fallback.includes('COMPLETE')
      ? 'COMPLETED'
      : fallback.includes('PROGRESS')
        ? 'IN_PROGRESS'
        : 'PENDING'
  }

  // Helper to compute automation status
  function getAutomationServiceStatus(c: AutowebsionCustomerLightDTO): string {
    const services = Array.isArray(c.services) ? c.services : []
    const autoServices = services.filter((s: any) => {
      const st = String(s?.serviceType || '').toUpperCase()
      return st.includes('AUTO')
    })

    if (autoServices.length > 0) {
      const statuses = autoServices.map((s: any) =>
        String(s?.status || 'PENDING').toUpperCase().replace(/-/g, '_'),
      )
      const allCompleted = statuses.every((st) => st.includes('COMPLETE'))
      if (allCompleted) return 'COMPLETED'

      const anyStarted = statuses.some((st) => st.includes('PROGRESS') || st.includes('COMPLETE'))
      if (anyStarted) return 'IN_PROGRESS'

      return 'PENDING'
    }

    const fallback = String(c.mainStatus || 'PENDING').toUpperCase().replace(/-/g, '_')
    return fallback.includes('COMPLETE')
      ? 'COMPLETED'
      : fallback.includes('PROGRESS')
        ? 'IN_PROGRESS'
        : 'PENDING'
  }

  // Convert raw DTO to OnboardingCustomer for detail modal & subservice flow modal
  function toOnboardingCustomer(
    c: AutowebsionCustomerLightDTO,
    index: number,
    serviceTypeOverride?: 'WEBSITE' | 'AUTOMATION',
  ): OnboardingCustomer {
    const id = String(c.customerId ?? `c-${index}`)
    const resolvedStatus =
      serviceTypeOverride === 'AUTOMATION' || activeSubTab === 'AUTOMATION'
        ? getAutomationServiceStatus(c)
        : serviceTypeOverride === 'WEBSITE' || activeSubTab === 'WEBSITE'
          ? getWebsiteServiceStatus(c)
          : String(c.mainStatus || 'PENDING').toUpperCase()

    const s = resolvedStatus.toLowerCase()
    const status: OnboardingStatus = s.includes('complete')
      ? 'completed'
      : s.includes('progress') || s === 'active'
        ? 'in-progress'
        : 'pending'

    const assigned =
      activeSubTab === 'WEBSITE' || serviceTypeOverride === 'WEBSITE'
        ? c.websiteAssignedUserEmail || c.assignedUserEmail
        : activeSubTab === 'AUTOMATION' || serviceTypeOverride === 'AUTOMATION'
          ? c.automationAssignedUserEmail || c.assignedUserEmail
          : c.assignedUserEmail || c.websiteAssignedUserEmail || c.automationAssignedUserEmail

    return {
      id,
      rowIndex: page * size + index + 1,
      businessName: c.businessName || c.ownerName || 'Customer',
      contactName: c.ownerName || c.businessName || 'Customer',
      contactDate: c.createdAt
        ? new Date(c.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : '—',
      email: c.email || '',
      phone: c.phoneNumber || '',
      callStatus: 'connected',
      status,
      assigneeId: assigned || null,
      remark: c.internalRemark || c.clientRemark || '',
      formUrl: getCustomerFormUrl(c.phoneNumber || '', Boolean(c.hasDuplicateCustomer)),
      serviceType: c.serviceTypes && c.serviceTypes.length > 0 ? c.serviceTypes.join(', ') : 'AUTOWEBSION SERVICE',
      services: c.services || [],
      subServiceInfo: c.subServiceInfo || [],
      rawCustomer: c,
    }
  }

  // Handle toggling "Website Exists"
  async function handleToggleWebsiteExists(customer: AutowebsionCustomerLightDTO) {
    if (!canEditWebsiteExists) return
    const newStatus = !customer.isWebsiteExists
    setUpdatingWebsiteExistsId(customer.customerId)
    try {
      await updateWebsiteExistsStatus(customer.customerId, newStatus)
      setToast({
        type: 'success',
        message: `Website status updated to ${newStatus ? 'Exists' : 'Not Exists'}.`,
      })
      await customersQuery.refetch()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update website status'
      setToast({ type: 'error', message: msg })
    } finally {
      setUpdatingWebsiteExistsId(null)
    }
  }

  // Handle assigning user to department (Automation, Website, or Both)
  async function handleExecuteAssignment(
    customerId: number,
    assigneeEmail: string,
    targetDepartment?: string,
  ) {
    if (!canEditAssignee) return
    if (!assigneeEmail) return
    setIsAssigningUser(true)
    try {
      await assignAutowebisionUser({
        customerIds: [customerId],
        assignedUserEmail: assigneeEmail,
        departmentType: targetDepartment,
      })
      const deptLabel =
        targetDepartment === 'AUTOMATION_DEPARTMENT'
          ? 'Automation'
          : targetDepartment === 'WEBSITE_DEPARTMENT'
            ? 'Website'
            : 'both Website & Automation'
      setToast({
        type: 'success',
        message: `Customer assigned to ${deptLabel} successfully.`,
      })
      setAssignModalTarget(null)
      await customersQuery.refetch()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to assign user'
      setToast({ type: 'error', message: msg })
    } finally {
      setIsAssigningUser(false)
    }
  }

  // Handle on-demand fetching of internal remarks for Website or Automation
  async function handleOpenInternalRemarks(
    customer: AutowebsionCustomerLightDTO,
    departmentType: 'WEBSITE_DEPARTMENT' | 'AUTOMATION_DEPARTMENT',
  ) {
    setViewingInternalRemarks({
      customerId: customer.customerId,
      customerName: customer.businessName || customer.ownerName || 'Customer',
      departmentType,
      remarks: null,
      loading: true,
      error: null,
    })
    try {
      const remarks = await getCustomerInternalRemarks(customer.customerId, departmentType)
      setViewingInternalRemarks((prev) =>
        prev && prev.customerId === customer.customerId
          ? { ...prev, remarks, loading: false }
          : prev,
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch internal remarks'
      setViewingInternalRemarks((prev) =>
        prev && prev.customerId === customer.customerId
          ? { ...prev, error: msg, loading: false }
          : prev,
      )
    }
  }

  // Handle status update
  async function handleStatusChange(
    customer: AutowebsionCustomerLightDTO,
    newStatus: string,
    targetServiceType?: 'WEBSITE' | 'AUTOMATION',
  ) {
    if (!canEditStatus) return
    setUpdatingStatusId(customer.customerId)
    try {
      const targetDept =
        targetServiceType === 'AUTOMATION'
          ? 'AUTOMATION_DEPARTMENT'
          : targetServiceType === 'WEBSITE'
            ? 'WEBSITE_DEPARTMENT'
            : departmentTypeParam

      await updateAutowebisionStatus({
        customerId: customer.customerId,
        updatedStatus: newStatus,
        departmentType: targetDept,
        serviceType: targetServiceType,
      })
      setToast({
        type: 'success',
        message: `${targetServiceType ? `${targetServiceType} status` : 'Status'} updated to ${newStatus}.`,
      })
      await customersQuery.refetch()
      await countsQuery.refetch()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update status'
      setToast({ type: 'error', message: msg })
    } finally {
      setUpdatingStatusId(null)
    }
  }

  // Handle Airtel Click to Call
  async function handleCallCustomer(phone: string, customerName: string, customerId: number) {
    if (!canEditContact) return
    if (!phone) {
      setToast({ type: 'error', message: 'Customer has no phone number on record.' })
      return
    }
    setCallingCustomerId(String(customerId))
    try {
      await initiateAirtelClickToCall(phone)
      recordCustomerActivity({
        customerId: String(customerId),
        contact: phone,
        departmentType: 'AUTOWEBSION_DEPARTMENT',
        kind: 'call-initiated',
        detail: `Called ${phone} (${customerName || 'Customer'})`,
      })
      setToast({ type: 'success', message: `Call initiated to ${phone}` })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to initiate Airtel call'
      setToast({ type: 'error', message: msg })
    } finally {
      setCallingCustomerId(null)
    }
  }

  const rawRows = customersQuery.data?.data || []
  const totalElements = customersQuery.data?.totalElements ?? 0

  return (
    <div className="autoweb-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`autoweb-toast autoweb-toast-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header matching Screenshot 2 */}
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-bold text-slate-900">Autowebsion Customers</h1>
        <p className="text-xs text-slate-500">View all Website &amp; Automation customers in one place</p>
      </div>

      {/* Top Toolbar matching Screenshot 2 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white p-3 border border-slate-200 rounded-xl">
        {/* Search bar */}
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            className="w-full pl-10 pr-4 h-9 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            placeholder="Search by name, email, or business..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm"
              onClick={() => setSearch('')}
            >
              ×
            </button>
          )}
        </div>

        {/* Center Pill Switcher Tabs */}
        <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200/80">
          <button
            type="button"
            className={`h-8 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
              activeSubTab === 'ALL'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
            }`}
            onClick={() => {
              setActiveSubTab('ALL')
              setPage(0)
            }}
          >
            <Layers size={14} />
            <span>Autowebsion</span>
          </button>

          <button
            type="button"
            className={`h-8 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
              activeSubTab === 'WEBSITE'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
            }`}
            onClick={() => {
              setActiveSubTab('WEBSITE')
              setPage(0)
            }}
          >
            <Globe size={14} />
            <span>Website</span>
          </button>

          <button
            type="button"
            className={`h-8 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
              activeSubTab === 'AUTOMATION'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
            }`}
            onClick={() => {
              setActiveSubTab('AUTOMATION')
              setPage(0)
            }}
          >
            <Bot size={14} />
            <span>Automation</span>
          </button>
        </div>

        {/* Right buttons: Filter & Refresh */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilterDrawer((prev) => !prev)}
            className={`h-9 px-3.5 rounded-xl border text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-all ${
              showFilterDrawer || dateFrom || dateTo || selectedAssignee !== 'all'
                ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
            }`}
          >
            {showFilterDrawer || dateFrom || dateTo || selectedAssignee !== 'all' ? (
              <>
                <X size={14} />
                <span>Remove Filter</span>
              </>
            ) : (
              <>
                <Filter size={14} />
                <span>Filter</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              customersQuery.refetch()
              countsQuery.refetch()
            }}
            disabled={customersQuery.isFetching}
            className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-all shadow-none"
            title="Refresh customers"
          >
            <RefreshCw size={14} className={customersQuery.isFetching ? 'spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Collapsible Date Range & Assignee Filter */}
      {showFilterDrawer && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>From:</span>
            <input
              type="date"
              className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setPage(0)
              }}
            />
            <span>To:</span>
            <input
              type="date"
              className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setPage(0)
              }}
            />
          </div>

          {assignees.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>Assignee:</span>
              <select
                className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs"
                value={selectedAssignee}
                onChange={(e) => {
                  setSelectedAssignee(e.target.value)
                  setPage(0)
                }}
              >
                <option value="all">All Assignees</option>
                {assignees.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            className="text-xs text-blue-600 hover:underline font-semibold ml-auto"
            onClick={() => {
              setDateFrom('')
              setDateTo('')
              setSelectedAssignee('all')
              setPage(0)
            }}
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Status Filter Pill Bar */}
      <div className="autoweb-status-tabs">
        <button
          type="button"
          className={`autoweb-status-btn ${activeStatus === 'ALL' ? 'active' : ''}`}
          onClick={() => {
            setActiveStatus('ALL')
            setPage(0)
          }}
        >
          All
          <span className="autoweb-status-badge">{statusCounts.total}</span>
        </button>
        <button
          type="button"
          className={`autoweb-status-btn ${activeStatus === 'PENDING' ? 'active' : ''}`}
          onClick={() => {
            setActiveStatus('PENDING')
            setPage(0)
          }}
        >
          Pending
          <span className="autoweb-status-badge pending">{statusCounts.pending}</span>
        </button>
        <button
          type="button"
          className={`autoweb-status-btn ${activeStatus === 'IN_PROGRESS' ? 'active' : ''}`}
          onClick={() => {
            setActiveStatus('IN_PROGRESS')
            setPage(0)
          }}
        >
          In progress
          <span className="autoweb-status-badge in-progress">{statusCounts.inProgress}</span>
        </button>
        <button
          type="button"
          className={`autoweb-status-btn ${activeStatus === 'COMPLETED' ? 'active' : ''}`}
          onClick={() => {
            setActiveStatus('COMPLETED')
            setPage(0)
          }}
        >
          Completed
          <span className="autoweb-status-badge completed">{statusCounts.completed}</span>
        </button>
      </div>

      {/* Main Customers Table Card */}
      <div className="autoweb-table-card">
        {customersQuery.isPending ? (
          <LoadingState message="Loading Autowebsion customers..." />
        ) : customersQuery.isError ? (
          <ErrorState
            title="Unable to load Autowebsion customers"
            message={customersQuery.error?.message || 'Failed to fetch'}
            onRetry={() => customersQuery.refetch()}
          />
        ) : rawRows.length === 0 ? (
          <div className="autoweb-empty-state">
            <Building size={36} className="autoweb-empty-icon" />
            <p>No customers found matching the selected filters.</p>
          </div>
        ) : (
          <div className="autoweb-table-scroll">
            <table className="autoweb-table">
              <thead>
                <tr>
                  {isIndexVisible && <th style={{ width: '45px' }}>#</th>}
                  {isDateVisible && <th style={{ minWidth: '130px' }}>CREATED</th>}
                  {isCustomerVisible && <th style={{ minWidth: '180px' }}>CUSTOMER</th>}
                  {isContactVisible && <th style={{ minWidth: '180px' }}>CONTACT</th>}
                  {isRequirementFormVisible && <th style={{ minWidth: '150px' }}>REQUIREMENT FORM</th>}
                  {isServicesVisible && <th style={{ minWidth: '160px' }}>SERVICES</th>}
                  {isStatusVisible && <th style={{ minWidth: '140px' }}>STATUS</th>}
                  {isExpirationVisible && <th style={{ minWidth: '120px' }}>EXPIRATION</th>}
                  {isClientRemarkVisible && <th style={{ minWidth: '150px' }}>CLIENT REMARK</th>}
                  {isInternalRemarkVisible && <th style={{ minWidth: '180px' }}>INTERNAL REMARK</th>}
                  {isDraftSentVisible && <th style={{ minWidth: '130px' }}>DRAFT SENT</th>}
                  {isAssigneeVisible && <th style={{ minWidth: '180px' }}>ASSIGNED TO</th>}
                </tr>
              </thead>
              <tbody>
                {rawRows.map((customer, index) => {
                  const customerId = customer.customerId
                  const createdDate = customer.createdAt
                    ? new Date(customer.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'
                  const createdTime = customer.createdAt
                    ? new Date(customer.createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })
                    : ''

                  const websiteStatus = getWebsiteServiceStatus(customer)
                  const automationStatus = getAutomationServiceStatus(customer)

                  const serviceTypes = Array.isArray(customer.serviceTypes) ? customer.serviceTypes : []
                  const hasWebsite = serviceTypes.some((s) => s.toUpperCase().includes('WEB'))
                  const hasAutomation = serviceTypes.some((s) => s.toUpperCase().includes('AUTO'))

                  return (
                    <tr key={customerId || index}>
                      {/* 1. Row Index */}
                      {isIndexVisible && <td className="autoweb-td-index">{page * size + index + 1}</td>}

                      {/* 2. Created Date + Website Exists Globe button */}
                      {isDateVisible && (
                        <td className="autoweb-td-date">
                          <div className="text-xs font-semibold text-slate-800">{createdDate}</div>
                          {createdTime && <div className="text-[11px] text-slate-400">{createdTime}</div>}
                          <div className="mt-1.5">
                            <button
                              type="button"
                              className={`inline-flex items-center justify-center h-7 w-7 rounded-md border transition-all ${
                                customer.isWebsiteExists
                                  ? 'border-blue-300 bg-blue-50 text-blue-600'
                                  : 'border-slate-200 bg-slate-50 text-slate-400 hover:text-slate-600'
                              }`}
                              disabled={!canEditWebsiteExists || updatingWebsiteExistsId === customerId}
                              onClick={() => handleToggleWebsiteExists(customer)}
                              title={
                                customer.isWebsiteExists
                                  ? 'Website Exists: Yes'
                                  : 'Website Exists: No (Click to toggle)'
                              }
                            >
                              {updatingWebsiteExistsId === customerId ? (
                                <Loader2 size={13} className="spin" />
                              ) : (
                                <Globe size={13} />
                              )}
                            </button>
                          </div>
                        </td>
                      )}

                      {/* 3. Customer */}
                      {isCustomerVisible && (
                        <td>
                          <div className="autoweb-business-cell">
                            <div className="flex items-center gap-2">
                              <strong className="autoweb-business-title" title={customer.businessName || 'Customer'}>
                                {customer.businessName || customer.ownerName || 'Customer'}
                              </strong>
                              {isActionsVisible && (
                                <button
                                  type="button"
                                  className="autoweb-detail-btn flex-shrink-0"
                                  title="View complete customer details"
                                  aria-label={`View details for ${customer.businessName || customer.ownerName || 'customer'}`}
                                  onClick={() => setSelectedCustomer(toOnboardingCustomer(customer, index))}
                                >
                                  <Eye size={14} />
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 truncate max-w-[180px]">
                              {customer.ownerName || '—'}
                            </p>
                            {customer.hasDuplicateCustomer && (
                              <button
                                type="button"
                                className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                                onClick={() =>
                                  setViewingDuplicate({
                                    name: customer.businessName || customer.ownerName || 'Customer',
                                    customerId,
                                  })
                                }
                              >
                                Other Business
                              </button>
                            )}
                          </div>
                        </td>
                      )}

                      {/* 4. Contact */}
                      {isContactVisible && (
                        <td>
                          <div className="space-y-1">
                            {customer.email && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-700 truncate max-w-[180px]">
                                <Mail size={12} className="text-slate-400 flex-shrink-0" />
                                <span title={customer.email}>{customer.email}</span>
                              </div>
                            )}
                            {customer.phoneNumber && (
                              <div className="flex items-center gap-1 text-xs text-slate-700">
                                <Phone size={12} className="text-slate-400 flex-shrink-0" />
                                <span>{customer.phoneNumber}</span>
                                <button
                                  type="button"
                                  className="ml-1 inline-flex items-center justify-center h-6 w-6 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 transition-colors"
                                  title={`Click to call ${customer.phoneNumber}`}
                                  disabled={!canEditContact || callingCustomerId === String(customerId)}
                                  onClick={() =>
                                    handleCallCustomer(
                                      customer.phoneNumber || '',
                                      customer.ownerName || '',
                                      customerId,
                                    )
                                  }
                                >
                                  {callingCustomerId === String(customerId) ? (
                                    <Loader2 size={12} className="spin" />
                                  ) : (
                                    <Phone size={12} />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      )}

                      {/* 5. Requirement Form */}
                      {isRequirementFormVisible && (
                        <td>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
                            onClick={() => {
                              const formUrl = getCustomerFormUrl(customer.phoneNumber)
                              if (formUrl) {
                                window.open(formUrl, '_blank')
                              } else {
                                setToast({ type: 'error', message: 'No phone number available for form.' })
                              }
                            }}
                          >
                            <FileText size={13} />
                            Open Form
                          </button>
                        </td>
                      )}

                      {/* 6. Services */}
                      {isServicesVisible && (
                        <td>
                          <div className="flex flex-col gap-1 items-start">
                            {serviceTypes.length > 0 ? (
                              serviceTypes.map((sType, sIdx) => {
                                const isAuto = sType.toUpperCase().includes('AUTO')
                                const serviceTarget = isAuto ? 'AUTOMATION' : 'WEBSITE'
                                return (
                                  <button
                                    key={sIdx}
                                    type="button"
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                                      isAuto
                                        ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                                        : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                    }`}
                                    onClick={() =>
                                      setServiceFlowTarget({
                                        customer: toOnboardingCustomer(customer, index, serviceTarget),
                                        serviceType: serviceTarget,
                                      })
                                    }
                                    title="Click to view service flow checklist"
                                  >
                                    {isAuto ? <Bot size={12} /> : <Globe size={12} />}
                                    <span>{sType}</span>
                                  </button>
                                )
                              })
                            ) : (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                                onClick={() => {
                                  const fallbackTarget = activeSubTab === 'AUTOMATION' ? 'AUTOMATION' : 'WEBSITE'
                                  setServiceFlowTarget({
                                    customer: toOnboardingCustomer(customer, index, fallbackTarget),
                                    serviceType: fallbackTarget,
                                  })
                                }}
                                title="Click to view service flow checklist"
                              >
                                {activeSubTab === 'AUTOMATION' ? <Bot size={12} /> : <Globe size={12} />}
                                <span>{activeSubTab === 'AUTOMATION' ? 'Automation' : 'Website'}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      )}

                      {/* 7. Status */}
                      {isStatusVisible && (
                        <td>
                          {activeSubTab === 'WEBSITE' ? (
                            <select
                              className={`autoweb-status-select status-${websiteStatus.toLowerCase().replace(/_/g, '-')}`}
                              value={websiteStatus}
                              disabled={!canEditStatus || updatingStatusId === customerId}
                              onChange={(e) => handleStatusChange(customer, e.target.value, 'WEBSITE')}
                            >
                              <option value="PENDING">Pending</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="COMPLETED">Completed</option>
                            </select>
                          ) : activeSubTab === 'AUTOMATION' ? (
                            <select
                              className={`autoweb-status-select status-${automationStatus.toLowerCase().replace(/_/g, '-')}`}
                              value={automationStatus}
                              disabled={!canEditStatus || updatingStatusId === customerId}
                              onChange={(e) => handleStatusChange(customer, e.target.value, 'AUTOMATION')}
                            >
                              <option value="PENDING">Pending</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="COMPLETED">Completed</option>
                            </select>
                          ) : hasWebsite && hasAutomation ? (
                            <div className="flex flex-col gap-1.5 py-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1 py-0.5 rounded border border-blue-200">
                                  Web:
                                </span>
                                <select
                                  className={`autoweb-status-select status-${websiteStatus.toLowerCase().replace(/_/g, '-')}`}
                                  value={websiteStatus}
                                  disabled={!canEditStatus || updatingStatusId === customerId}
                                  onChange={(e) => handleStatusChange(customer, e.target.value, 'WEBSITE')}
                                >
                                  <option value="PENDING">Pending</option>
                                  <option value="IN_PROGRESS">In Progress</option>
                                  <option value="COMPLETED">Completed</option>
                                </select>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1 py-0.5 rounded border border-purple-200">
                                  Auto:
                                </span>
                                <select
                                  className={`autoweb-status-select status-${automationStatus.toLowerCase().replace(/_/g, '-')}`}
                                  value={automationStatus}
                                  disabled={!canEditStatus || updatingStatusId === customerId}
                                  onChange={(e) => handleStatusChange(customer, e.target.value, 'AUTOMATION')}
                                >
                                  <option value="PENDING">Pending</option>
                                  <option value="IN_PROGRESS">In Progress</option>
                                  <option value="COMPLETED">Completed</option>
                                </select>
                              </div>
                            </div>
                          ) : hasAutomation ? (
                            <select
                              className={`autoweb-status-select status-${automationStatus.toLowerCase().replace(/_/g, '-')}`}
                              value={automationStatus}
                              disabled={!canEditStatus || updatingStatusId === customerId}
                              onChange={(e) => handleStatusChange(customer, e.target.value, 'AUTOMATION')}
                            >
                              <option value="PENDING">Pending</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="COMPLETED">Completed</option>
                            </select>
                          ) : (
                            <select
                              className={`autoweb-status-select status-${websiteStatus.toLowerCase().replace(/_/g, '-')}`}
                              value={websiteStatus}
                              disabled={!canEditStatus || updatingStatusId === customerId}
                              onChange={(e) => handleStatusChange(customer, e.target.value, 'WEBSITE')}
                            >
                              <option value="PENDING">Pending</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="COMPLETED">Completed</option>
                            </select>
                          )}
                        </td>
                      )}

                      {/* 8. Expiration */}
                      {isExpirationVisible && (
                        <td>
                          <div className="flex items-center gap-1 text-xs text-red-600 font-medium">
                            <Clock size={12} />
                            <span>
                              {customer.serviceExpiration
                                ? new Date(customer.serviceExpiration).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : 'Not Available'}
                            </span>
                          </div>
                        </td>
                      )}

                      {/* 9. Client Remark */}
                      {isClientRemarkVisible && (
                        <td>
                          <button
                            type="button"
                            onClick={() =>
                              setViewingClientRemark({
                                name: customer.businessName || customer.ownerName || 'Customer',
                                remark: customer.clientRemark || 'No client remark entered yet.',
                              })
                            }
                            className="inline-flex items-center justify-center bg-pink-50 hover:bg-pink-100 rounded-md px-3 py-1.5 transition-colors border border-pink-100"
                          >
                            <span className="text-xs font-medium text-pink-700 truncate max-w-[140px]">
                              {customer.clientRemark || 'Click to View'}
                            </span>
                          </button>
                        </td>
                      )}

                      {/* 10. Internal Remark (Show remark from response, click to fetch history on demand) */}
                      {isInternalRemarkVisible && (
                        <td>
                          <div className="flex flex-col gap-1 items-start">
                            {activeSubTab === 'WEBSITE' ? (
                              customer.internalRemark ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenInternalRemarks(customer, 'WEBSITE_DEPARTMENT')}
                                  className="w-full text-left group flex items-start gap-1.5 p-1.5 rounded-lg hover:bg-blue-50/60 border border-transparent hover:border-blue-200 transition-all max-w-[220px]"
                                  title="Click to view full internal remark history"
                                >
                                  <MessageSquare
                                    size={13}
                                    className="text-slate-400 group-hover:text-blue-600 mt-0.5 flex-shrink-0"
                                  />
                                  <span className="text-xs text-slate-800 line-clamp-2 font-medium group-hover:text-blue-600 transition-colors">
                                    {customer.internalRemark}
                                  </span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenInternalRemarks(customer, 'WEBSITE_DEPARTMENT')}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-500 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 hover:border-blue-200 transition-all"
                                  title="Click to fetch internal remark history"
                                >
                                  <MessageSquare size={12} className="text-slate-400" />
                                  <span>No remark (View History)</span>
                                </button>
                              )
                            ) : activeSubTab === 'AUTOMATION' ? (
                              customer.internalRemark ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenInternalRemarks(customer, 'AUTOMATION_DEPARTMENT')}
                                  className="w-full text-left group flex items-start gap-1.5 p-1.5 rounded-lg hover:bg-purple-50/60 border border-transparent hover:border-purple-200 transition-all max-w-[220px]"
                                  title="Click to view full internal remark history"
                                >
                                  <MessageSquare
                                    size={13}
                                    className="text-slate-400 group-hover:text-purple-600 mt-0.5 flex-shrink-0"
                                  />
                                  <span className="text-xs text-slate-800 line-clamp-2 font-medium group-hover:text-purple-600 transition-colors">
                                    {customer.internalRemark}
                                  </span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenInternalRemarks(customer, 'AUTOMATION_DEPARTMENT')}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-500 bg-slate-50 hover:bg-purple-50 hover:text-purple-600 border border-slate-200 hover:border-purple-200 transition-all"
                                  title="Click to fetch internal remark history"
                                >
                                  <MessageSquare size={12} className="text-slate-400" />
                                  <span>No remark (View History)</span>
                                </button>
                              )
                            ) : (
                              <>
                                {customer.internalRemark ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenInternalRemarks(customer, hasAutomation && !hasWebsite ? 'AUTOMATION_DEPARTMENT' : 'WEBSITE_DEPARTMENT')}
                                    className="w-full text-left group flex items-start gap-1.5 p-1 rounded-lg hover:bg-blue-50/60 border border-transparent hover:border-blue-200 transition-all max-w-[220px]"
                                    title="Click to view full internal remark history"
                                  >
                                    <MessageSquare
                                      size={13}
                                      className="text-slate-400 group-hover:text-blue-600 mt-0.5 flex-shrink-0"
                                    />
                                    <span className="text-xs text-slate-800 line-clamp-2 font-medium group-hover:text-blue-600 transition-colors">
                                      {customer.internalRemark}
                                    </span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenInternalRemarks(customer, 'WEBSITE_DEPARTMENT')}
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition-all"
                                    title="Click to fetch internal remark history"
                                  >
                                    <MessageSquare size={11} className="text-slate-400" />
                                    <span>No remark</span>
                                  </button>
                                )}
                                <div className="flex items-center gap-1 mt-0.5">
                                  {hasWebsite && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenInternalRemarks(customer, 'WEBSITE_DEPARTMENT')}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                                      title="Click to fetch Website internal remarks"
                                    >
                                      <Globe size={10} />
                                      <span>Web History</span>
                                    </button>
                                  )}
                                  {hasAutomation && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenInternalRemarks(customer, 'AUTOMATION_DEPARTMENT')}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors"
                                      title="Click to fetch Automation internal remarks"
                                    >
                                      <Bot size={10} />
                                      <span>Auto History</span>
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      )}

                      {/* 11. Draft Sent */}
                      {isDraftSentVisible && (
                        <td>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${
                              customer.isMailSent
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            <FileText size={12} />
                            {customer.isMailSent ? 'Draft Sent' : 'Not Sent'}
                          </span>
                        </td>
                      )}

                      {/* 12. Assigned To matching Screenshot 1 */}
                      {isAssigneeVisible && (
                        <td>
                          <div className="relative flex flex-col gap-1 items-start">
                            {/* Website Assigned User Pill */}
                            {(customer.websiteAssignedUserName || customer.websiteAssignedUserEmail) && (
                              <div
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                                title={`Website Assigned to: ${customer.websiteAssignedUserEmail || customer.websiteAssignedUserName}`}
                              >
                                <Globe size={11} className="text-blue-600 flex-shrink-0" />
                                <span className="truncate max-w-[130px]">
                                  {customer.websiteAssignedUserName || customer.websiteAssignedUserEmail}
                                </span>
                              </div>
                            )}

                            {/* Automation Assigned User Pill */}
                            {(customer.automationAssignedUserName || customer.automationAssignedUserEmail) && (
                              <div
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200"
                                title={`Automation Assigned to: ${customer.automationAssignedUserEmail || customer.automationAssignedUserName}`}
                              >
                                <Bot size={11} className="text-purple-600 flex-shrink-0" />
                                <span className="truncate max-w-[130px]">
                                  {customer.automationAssignedUserName || customer.automationAssignedUserEmail}
                                </span>
                              </div>
                            )}

                            {/* Fallback general assigned pill if neither specific is present */}
                            {!customer.websiteAssignedUserEmail &&
                              !customer.automationAssignedUserEmail &&
                              (customer.assignedUserName || customer.assignedUserEmail) && (
                                <div
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                                  title={`Assigned to: ${customer.assignedUserEmail || customer.assignedUserName}`}
                                >
                                  <Layers size={11} className="text-slate-500 flex-shrink-0" />
                                  <span className="truncate max-w-[130px]">
                                    {customer.assignedUserName || customer.assignedUserEmail}
                                  </span>
                                </div>
                              )}

                            {/* Assign Button matching Screenshot 1 */}
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation()
                                setAssignSearchQuery('')
                                setOpenAssignDropdownId((prev) =>
                                  prev === customerId ? null : customerId,
                                )
                              }}
                              disabled={!canEditAssignee}
                              title={canEditAssignee ? 'Click to assign user' : 'Read only'}
                            >
                              <Layers size={12} className="text-indigo-600" />
                              <span>Assign</span>
                              <ChevronsUpDown size={12} className="text-indigo-400" />
                            </button>

                            {/* Dropdown Menu matching Screenshot 1 */}
                            {openAssignDropdownId === customerId && (
                              <div
                                ref={assignDropdownRef}
                                className="absolute left-0 top-full mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-30 py-1.5 animate-in fade-in duration-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* Search box */}
                                <div className="p-2 border-b border-slate-100">
                                  <div className="relative">
                                    <Search
                                      size={13}
                                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                                    />
                                    <input
                                      type="text"
                                      placeholder="Search users..."
                                      value={assignSearchQuery}
                                      onChange={(e) => setAssignSearchQuery(e.target.value)}
                                      autoFocus
                                      className="w-full pl-8 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500"
                                    />
                                  </div>
                                </div>

                                <div className="max-h-60 overflow-y-auto py-1">
                                  {/* Unassigned Option matching Screenshot 1 */}
                                  <div className="px-2 py-1">
                                    <button
                                      type="button"
                                      className="w-full text-left px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100/70 hover:bg-amber-200/70 rounded-lg transition-colors"
                                      onClick={() => {
                                        setOpenAssignDropdownId(null)
                                      }}
                                    >
                                      Unassigned
                                    </button>
                                  </div>

                                  {/* Autowebision Users Header matching Screenshot 1 */}
                                  <div className="px-3 pt-2 pb-1 text-[11px] font-semibold text-slate-400">
                                    Autowebision Users
                                  </div>

                                  {/* User List matching Screenshot 1 */}
                                  {filteredAssignees.length > 0 ? (
                                    filteredAssignees.map((user) => {
                                      const displayName = user.name.includes(' (')
                                        ? user.name.split(' (')[0]
                                        : user.name
                                      return (
                                        <button
                                          type="button"
                                          key={user.id}
                                          onClick={() => {
                                            setOpenAssignDropdownId(null)
                                            setAssignModalTarget({
                                              customer,
                                              user: {
                                                email: user.id,
                                                name: displayName,
                                              },
                                            })
                                          }}
                                          className="w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                                        >
                                          <Layers
                                            size={14}
                                            className="text-indigo-600 mt-0.5 flex-shrink-0"
                                          />
                                          <div className="flex-1 min-w-0">
                                            <div className="text-xs font-semibold text-slate-800 truncate">
                                              {displayName}
                                            </div>
                                            <div className="text-[11px] text-slate-400 truncate">
                                              {user.id}
                                            </div>
                                          </div>
                                        </button>
                                      )
                                    })
                                  ) : (
                                    <div className="px-3 py-2 text-xs text-slate-400 text-center">
                                      No users found
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      )}

                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <TablePagination
          page={page}
          pageSize={size}
          totalResults={totalElements}
          onPageChange={(newPage) => setPage(newPage)}
          onPageSizeChange={(newSize) => {
            setSize(newSize)
            setPage(0)
          }}
          pageSizeOptions={[10, 20, 50, 100]}
          disabled={customersQuery.isFetching}
        />
      </div>

      {/* Customer Profile Drawer Modal */}
      <CustomersListModal
        customer={selectedCustomer}
        assignees={assignees}
        showStatus={true}
        showAssignTo={true}
        departmentType={permissionDepartmentType}
        onClose={() => setSelectedCustomer(null)}
      />

      {/* Sub-Service Flow Modal */}
      <ServiceFlowModal
        customer={serviceFlowTarget?.customer ?? null}
        isOpen={Boolean(serviceFlowTarget)}
        onClose={() => setServiceFlowTarget(null)}
        isEditable={canEditServices}
        departmentType={
          serviceFlowTarget?.serviceType === 'AUTOMATION'
            ? 'AUTOMATION_DEPARTMENT'
            : serviceFlowTarget?.serviceType === 'WEBSITE'
              ? 'WEBSITE_DEPARTMENT'
              : permissionDepartmentType
        }
        serviceType={serviceFlowTarget?.serviceType}
        onStepsUpdated={() => {
          customersQuery.refetch()
          countsQuery.refetch()
        }}
        onSubServiceStatusUpdated={() => {
          customersQuery.refetch()
          countsQuery.refetch()
        }}
      />

      {/* Client Remark Dialog */}
      {viewingClientRemark && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Client Remark</h3>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 p-1"
                onClick={() => setViewingClientRemark(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="py-4">
              <p className="text-xs font-semibold text-slate-500 mb-1">{viewingClientRemark.name}</p>
              <div className="p-3 bg-pink-50/50 border border-pink-100 rounded-xl text-sm text-slate-700 whitespace-pre-wrap">
                {viewingClientRemark.remark}
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl"
                onClick={() => setViewingClientRemark(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Business Dialog */}
      {viewingDuplicate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Duplicate Business Notice</h3>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 p-1"
                onClick={() => setViewingDuplicate(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="py-4 text-xs text-slate-600 space-y-2">
              <p className="font-semibold text-slate-800">{viewingDuplicate.name}</p>
              <p>This customer is associated with multiple business registrations in the system.</p>
              <p className="text-slate-400">Customer ID: {viewingDuplicate.customerId}</p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl"
                onClick={() => setViewingDuplicate(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Internal Remarks On-Demand Dialog */}
      {viewingInternalRemarks && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-150"
          onClick={() => setViewingInternalRemarks(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                {viewingInternalRemarks.departmentType === 'AUTOMATION_DEPARTMENT' ? (
                  <div className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
                    <Bot size={18} />
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                    <Globe size={18} />
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {viewingInternalRemarks.departmentType === 'AUTOMATION_DEPARTMENT'
                      ? 'Automation'
                      : 'Website'}{' '}
                    Internal Remarks
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {viewingInternalRemarks.customerName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                onClick={() => setViewingInternalRemarks(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="py-4 max-h-96 overflow-y-auto space-y-3">
              {viewingInternalRemarks.loading && (
                <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <Loader2 size={24} className="spin text-blue-600" />
                  <p className="text-xs font-medium">Fetching internal remarks...</p>
                </div>
              )}

              {viewingInternalRemarks.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                  {viewingInternalRemarks.error}
                </div>
              )}

              {!viewingInternalRemarks.loading &&
                !viewingInternalRemarks.error &&
                (!viewingInternalRemarks.remarks ||
                  viewingInternalRemarks.remarks.length === 0) && (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No internal remarks found for this department.
                  </div>
                )}

              {!viewingInternalRemarks.loading &&
                !viewingInternalRemarks.error &&
                viewingInternalRemarks.remarks &&
                viewingInternalRemarks.remarks.length > 0 &&
                viewingInternalRemarks.remarks.map((r, rIdx) => (
                  <div
                    key={rIdx}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="font-semibold text-slate-700">
                        {r.staffName || 'Staff'}
                      </span>
                      <span>
                        {r.timestamp
                          ? new Date(r.timestamp).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </span>
                    </div>
                    <div className="text-slate-800 whitespace-pre-wrap font-medium">
                      {r.remark || '—'}
                    </div>
                  </div>
                ))}
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors"
                onClick={() => setViewingInternalRemarks(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Customer Department Selection Modal matching Screenshot 2 */}
      {assignModalTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-150"
          onClick={() => !isAssigningUser && setAssignModalTarget(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-lg font-bold text-slate-900">Assign Customer</h3>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                onClick={() => !isAssigningUser && setAssignModalTarget(null)}
                disabled={isAssigningUser}
              >
                <X size={18} />
              </button>
            </div>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Choose a department to assign{' '}
              <strong className="text-slate-900">
                {assignModalTarget.customer.businessName ||
                  assignModalTarget.customer.ownerName ||
                  'Customer'}
              </strong>{' '}
              to <strong className="text-slate-900">{assignModalTarget.user.name}</strong>
            </p>

            {/* Action Cards matching Screenshot 2 */}
            <div className="flex items-center justify-center gap-4 mt-6">
              {/* Automation Card */}
              <button
                type="button"
                disabled={isAssigningUser}
                onClick={() =>
                  handleExecuteAssignment(
                    assignModalTarget.customer.customerId,
                    assignModalTarget.user.email,
                    'AUTOMATION_DEPARTMENT',
                  )
                }
                className="flex-1 min-w-[100px] h-28 flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/40 hover:shadow-sm transition-all text-slate-800 hover:text-purple-700 group disabled:opacity-50"
              >
                <Bot
                  size={32}
                  strokeWidth={1.75}
                  className="text-slate-800 group-hover:text-purple-600 transition-colors"
                />
                <span className="text-sm font-semibold">Automation</span>
              </button>

              {/* Website Card */}
              <button
                type="button"
                disabled={isAssigningUser}
                onClick={() =>
                  handleExecuteAssignment(
                    assignModalTarget.customer.customerId,
                    assignModalTarget.user.email,
                    'WEBSITE_DEPARTMENT',
                  )
                }
                className="flex-1 min-w-[100px] h-28 flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 hover:shadow-sm transition-all text-slate-800 hover:text-blue-700 group disabled:opacity-50"
              >
                <Globe
                  size={32}
                  strokeWidth={1.75}
                  className="text-slate-800 group-hover:text-blue-600 transition-colors"
                />
                <span className="text-sm font-semibold">Website</span>
              </button>

              {/* Both Card */}
              <button
                type="button"
                disabled={isAssigningUser}
                onClick={() =>
                  handleExecuteAssignment(
                    assignModalTarget.customer.customerId,
                    assignModalTarget.user.email,
                    undefined,
                  )
                }
                className="flex-1 min-w-[100px] h-28 flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 hover:shadow-sm transition-all text-slate-800 hover:text-indigo-700 group disabled:opacity-50"
              >
                <Layers
                  size={32}
                  strokeWidth={1.75}
                  className="text-slate-800 group-hover:text-indigo-600 transition-colors"
                />
                <span className="text-sm font-semibold">Both</span>
              </button>
            </div>

            {isAssigningUser && (
              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-indigo-600 font-semibold">
                <Loader2 size={16} className="spin" />
                <span>Assigning customer...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AutowebisionCustomersPage
