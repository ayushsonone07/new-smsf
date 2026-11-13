import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  InternalRemarkBadge,
  formatRemarkTimestamp,
} from '../../../../components/head/customers-list/InternalRemarkBadge'
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
  Link2,
  Copy,
} from 'lucide-react'
import { LoadingState } from '../../../../components/ui/LoadingState'
import { notifyCustomerAssigned } from '../../../../api/notification-factory'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { TablePagination } from '../../../../components/ui/TablePagination'
import { RefreshButton } from '../../../../components/ui/RefreshButton'
import { CustomersListModal } from '../../../../components/head/customers-list/CustomersListModal'
import { ServiceFlowModal } from '../../../../components/head/customers-list/ServiceFlowModal'
import { ServiceTagsModal } from '../../../../components/head/customers-list/ServiceTagsModal'
import { SendDraftModal } from '../../../../components/head/customers-list/SendDraftModal'
import { DraftHistoryModal } from '../../../../components/head/customers-list/DraftHistoryModal'
import {
  SubServiceValidationModal,
  type SubServiceStatusItem,
} from '../../../../components/head/customers-list/SubServiceValidationModal'
import { extractServiceTags } from '../../../../api/service-flow.api'
import {
  sendWebsiteDraftMail,
  fetchWebsiteDraftHistory,
  type WebsiteDraftHistoryEntry,
} from '../../../../api/website-draft.api'
import {
  getCustomerInternalRemarks,
  getCustomerReviewReplies,
  getCustomerRemarks,
  addClientRemark,
  type CustomerRemark,
} from '../../../../api/customer-drawer.api'
import {
  fetchLightAutowebisionCustomers,
  assignAutowebisionUser,
  updateAutowebisionStatus,
  updateWebsiteExistsStatus,
  fetchAutowebsionSummaryCounts,
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
import {
  CustomersListFilters,
  type CustomerTab,
} from '../../../../components/head/customers-list/CustomersListFilters'
import { CustomersListSearchBar } from '../../../../components/head/customers-list/CustomersListSearchBar'
import '../../../../components/head/customers-list/CustomersList.css'
import './AutowebisionCustomers.css'
import {
  getWebsiteServiceStatus,
  getAutomationServiceStatus,
  getSubServicesForCustomer,
  checkSubServicesCompletion,
  getServicePillStatus,
  getStatusBadgeStyle,
  getStatusSelectStyle,
  getStatusIconColor,
  formatStatusLabel,
  getServicePillStyle,
} from './autowebisionHelpers'

function parseSafeDate(raw: any): Date | null {
  if (!raw) return null
  if (Array.isArray(raw)) {
    const [y, m, d, h = 0, min = 0, s = 0] = raw
    const parsed = new Date(y, m - 1, d, h, min, s)
    return isNaN(parsed.getTime()) ? null : parsed
  }
  const parsed = new Date(raw)
  return isNaN(parsed.getTime()) ? null : parsed
}

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
  const queryClient = useQueryClient()
  const userRole = (session?.user as any)?.role
  const normalizedRole = (userRole ?? '').toUpperCase().replace(/^ROLE_/, '')
  const isUserPath =
    typeof window !== 'undefined' &&
    (window.location.pathname.toLowerCase().includes('/user') ||
      window.location.pathname.toLowerCase().includes('-user') ||
      window.location.pathname.toLowerCase().includes('departmentuser') ||
      window.location.pathname.toLowerCase().includes('/users'))

  const isHead =
    normalizedRole.includes('HEAD') ||
    (session?.user as any)?.isHead === true ||
    (typeof window !== 'undefined' &&
      (window.location.pathname.toLowerCase().includes('/head') ||
        window.location.pathname.toLowerCase().includes('-head')))

  const isDepartmentUser =
    !isHead &&
    (normalizedRole === 'USER' ||
      normalizedRole === 'DEPARTMENT_USER' ||
      normalizedRole === 'DEPARTMENT USER' ||
      Boolean(isUserPath))
  const userEmail = session?.user.email || session?.user.username || ''

  // Permissions must come from the department that owns the current route.
  // Using AUTOWEBSION_DEPARTMENT here bypassed the AUTOMATION_DEPARTMENT
  // Head/User access configured by Admin.
  const isAutomationScreen =
    defaultSubTab === 'AUTOMATION' ||
    (typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('automation'))

  const isWebsiteScreen =
    defaultSubTab === 'WEBSITE' ||
    (typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('website'))

  const permissionDepartmentType = isAutomationScreen
    ? 'AUTOMATION_DEPARTMENT'
    : isWebsiteScreen
      ? 'WEBSITE_DEPARTMENT'
      : (session?.user.departmentType || 'AUTOWEBSION_DEPARTMENT')
  const permissionRouteName = permissionDepartmentType === 'AUTOMATION_DEPARTMENT'
    ? 'automation_department/head/customer-list'
    : permissionDepartmentType === 'WEBSITE_DEPARTMENT'
      ? 'website_department/head/customer-list'
      : undefined
  const { isColumnEnabled, isColumnConfigured, canEditColumn } = useDepartmentColumnPermissions(
    permissionDepartmentType,
    permissionRouteName,
  )

  const [activeSubTab, setActiveSubTab] = useState<AutowebsionSubTab>(() => {
    if (defaultSubTab && defaultSubTab !== 'ALL') return defaultSubTab
    if (isWebsiteScreen) return 'WEBSITE'
    if (isAutomationScreen) return 'AUTOMATION'
    return 'ALL'
  })

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
  // Draft Sent column is visible on Autowebsion (ALL) and Website, and strictly hidden ONLY on Automation tab
  const isDraftSentVisible =
    activeSubTab !== 'AUTOMATION' &&
    (isColumnEnabled('Draft Sent') || isColumnEnabled('Draft') || isColumnEnabled('Mail Sent'))
  const isAssigneeConfigured = isColumnConfigured('Assigned To')
  const isAssigneeVisible = isAssigneeConfigured
    ? isColumnEnabled('Assigned To') || isColumnEnabled('Assign To') || isColumnEnabled('Assignee')
    : !isDepartmentUser && (isColumnEnabled('Assigned To') || isColumnEnabled('Assign To') || isColumnEnabled('Assignee'))
  const isActionsVisible = isColumnEnabled('Actions') || isColumnEnabled('Action')

  // Dynamic column permissions are authoritative for Heads. Department users are
  // the primary workers responsible for managing status and remarks.
  const canEditWebsiteExists =
    isDepartmentUser || (isColumnConfigured('Website Exists') ? canEditColumn('Website Exists') : false)
  // Status dropdown & edit is strictly for Department Users only. Head accounts see read-only status pills.
  const canEditStatus = !isHead && isDepartmentUser
  const canEditDraft =
    activeSubTab !== 'AUTOMATION' &&
    (isDepartmentUser || (isColumnConfigured('Draft Sent') ? canEditColumn('Draft Sent') : false))
  const canEditAssignee = isAssigneeConfigured
    ? canEditColumn('Assigned To')
    : !isDepartmentUser
  const canEditServices =
    isDepartmentUser || (isColumnConfigured('Services') ? canEditColumn('Services') : false)
  const canEditRemark =
    isDepartmentUser || (
      isColumnConfigured('Internal Remark') || isColumnConfigured('Remark')
        ? canEditColumn('Internal Remark') || canEditColumn('Remark')
        : false
    )
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
    if (defaultSubTab && defaultSubTab !== 'ALL') {
      setActiveSubTab(defaultSubTab)
      setPage(0)
    } else if (isWebsiteScreen) {
      setActiveSubTab('WEBSITE')
      setPage(0)
    } else if (isAutomationScreen) {
      setActiveSubTab('AUTOMATION')
      setPage(0)
    }
  }, [defaultSubTab, isWebsiteScreen, isAutomationScreen])

  // Customer whose client remarks are open, so the dialog's refresh button can reload them.
  const clientRemarkCustomerRef = useRef<AutowebsionCustomerLightDTO | null>(null)

  // Fetches the client remarks for one customer into the open Client Remark dialog.
  const loadClientRemarks = useCallback(
    async (
      customer: AutowebsionCustomerLightDTO,
      targetDept: 'WEBSITE_DEPARTMENT' | 'AUTOMATION_DEPARTMENT',
    ) => {
      const initialText = customer.clientRemark?.trim()
      try {
        const [reviewRepliesRes, generalRemarksRes] = await Promise.allSettled([
          getCustomerReviewReplies(customer.customerId, targetDept),
          getCustomerRemarks(customer.customerId, targetDept, userEmail),
        ])

        const list: Array<{ reply: string; timestamp: string; staffName?: string }> = []
        const seen = new Set<string>()

        if (reviewRepliesRes.status === 'fulfilled' && Array.isArray(reviewRepliesRes.value)) {
          reviewRepliesRes.value.forEach((r) => {
            const text = (r.reply || '').trim()
            if (text && !seen.has(text)) {
              seen.add(text)
              list.push({
                reply: text,
                timestamp: r.timestamp || '',
                staffName: r.staffName || '',
              })
            }
          })
        }

        if (generalRemarksRes.status === 'fulfilled' && generalRemarksRes.value?.clientRemark) {
          generalRemarksRes.value.clientRemark.forEach((r) => {
            const text = (r.remark || (r as any).clientRemark || '').trim()
            if (text && !seen.has(text)) {
              seen.add(text)
              list.push({
                reply: text,
                timestamp: r.timestamp || '',
                staffName: r.staffName || '',
              })
            }
          })
        }

        if (list.length === 0 && initialText) {
          list.push({ reply: initialText, timestamp: customer.updatedAt || customer.createdAt || '' })
        }

        setViewingClientRemark((prev) =>
          prev && prev.customerId === customer.customerId
            ? { ...prev, remarks: list, loading: false }
            : prev,
        )
      } catch (err: any) {
        setViewingClientRemark((prev) =>
          prev && prev.customerId === customer.customerId
            ? { ...prev, loading: false, error: err?.message || 'Failed to load client remarks' }
            : prev,
        )
      }
    },
    [userEmail],
  )

  const handleOpenClientRemarkDialog = useCallback(
    async (customer: AutowebsionCustomerLightDTO) => {
      const targetDept: 'WEBSITE_DEPARTMENT' | 'AUTOMATION_DEPARTMENT' =
        activeSubTab === 'AUTOMATION'
          ? 'AUTOMATION_DEPARTMENT'
          : activeSubTab === 'WEBSITE'
            ? 'WEBSITE_DEPARTMENT'
            : (customer.serviceTypes?.some((s: string) => s.toUpperCase().includes('AUTOMATION'))
                ? 'AUTOMATION_DEPARTMENT'
                : 'WEBSITE_DEPARTMENT')

      const initialText = customer.clientRemark?.trim()
      const initialRemarks: Array<{ reply: string; timestamp: string; staffName?: string }> = initialText
        ? [{ reply: initialText, timestamp: customer.updatedAt || customer.createdAt || '' }]
        : []

      clientRemarkCustomerRef.current = customer
      setViewingClientRemark({
        customerId: customer.customerId,
        name: customer.businessName || customer.ownerName || 'Customer',
        departmentType: targetDept,
        remarks: initialRemarks,
        loading: true,
        error: null,
      })
      setNewClientRemarkText('')

      await loadClientRemarks(customer, targetDept)
    },
    [activeSubTab, isAutomationScreen, isWebsiteScreen, loadClientRemarks],
  )

  // Modals state
  const [selectedCustomer, setSelectedCustomer] = useState<OnboardingCustomer | null>(null)
  const [modalTab, setModalTab] = useState<'overview' | 'duplicates' | undefined>(undefined)
  const [serviceFlowTarget, setServiceFlowTarget] = useState<{
    customer: OnboardingCustomer
    serviceType: 'WEBSITE' | 'AUTOMATION'
  } | null>(null)
  const [serviceTagsTarget, setServiceTagsTarget] = useState<{
    customer: OnboardingCustomer
    serviceType: string
    targetServiceType?: 'WEBSITE' | 'AUTOMATION'
    index: number
  } | null>(null)
  const [viewingClientRemark, setViewingClientRemark] = useState<{
    customerId: number
    name: string
    departmentType: 'WEBSITE_DEPARTMENT' | 'AUTOMATION_DEPARTMENT'
    remarks: Array<{ reply: string; timestamp: string; staffName?: string }>
    loading: boolean
    error?: string | null
  } | null>(null)
  const [newClientRemarkText, setNewClientRemarkText] = useState('')
  const [isSubmittingClientRemark, setIsSubmittingClientRemark] = useState(false)
  const [updatingWebsiteExistsId, setUpdatingWebsiteExistsId] = useState<number | null>(null)
  const [confirmWebsiteExistsTarget, setConfirmWebsiteExistsTarget] = useState<AutowebsionCustomerLightDTO | null>(null)
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null)
  const [callingCustomerId, setCallingCustomerId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [localStatusMap, setLocalStatusMap] = useState<Record<string, string>>({})
  const [validationModal, setValidationModal] = useState<{
    open: boolean
    type: 'incomplete' | 'acknowledgment'
    message: string
    detail?: string
    subServices?: SubServiceStatusItem[]
  } | null>(null)

  // On-demand Internal Remarks state
  const [activeRemarkPopoverKey, setActiveRemarkPopoverKey] = useState<string | null>(null)
  const [viewingInternalRemarks, setViewingInternalRemarks] = useState<{
    customerId: number
    customerName: string
    departmentType: 'WEBSITE_DEPARTMENT' | 'AUTOMATION_DEPARTMENT'
    remarks: CustomerRemark[] | null
    loading: boolean
    error: string | null
  } | null>(null)

  // Website Draft Modals state
  const [selectedCustomerForDraft, setSelectedCustomerForDraft] = useState<AutowebsionCustomerLightDTO | null>(null)
  const [sendDraftModalOpen, setSendDraftModalOpen] = useState(false)
  const [draftHistoryModalOpen, setDraftHistoryModalOpen] = useState(false)
  const [isSendingDraft, setIsSendingDraft] = useState(false)
  const [draftHistory, setDraftHistory] = useState<WebsiteDraftHistoryEntry[]>([])
  const [isLoadingDraftHistory, setIsLoadingDraftHistory] = useState(false)
  const [isRefreshingDraftHistory, setIsRefreshingDraftHistory] = useState(false)
  // Email of the customer whose draft history is open (guards late refresh responses).
  const draftHistoryEmailRef = useRef('')

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

  // 4. Exact Assignable List: GET /api/meetings/users/assigning-list?departmentType=AUTOWEBSION_DEPARTMENT
  // Do NOT hit when logged in as department user (Assign is only for Head)
  const meetingsAssignQuery = useQuery({
    queryKey: ['meetingsAssigningListAutowebsion'],
    queryFn: () => fetchMeetingsAssigningList('AUTOWEBSION_DEPARTMENT'),
    enabled: !isDepartmentUser,
    staleTime: 60_000,
  })

  const assigningUsersQuery = useAssigningUsers('AUTOWEBSION_DEPARTMENT', {
    enabled: !isDepartmentUser,
  })

  const assignees = useMemo(() => {
    if (isDepartmentUser) return []
    const list: Array<{ id: string; name: string }> = []
    const seen = new Set<string>()

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
  }, [isDepartmentUser, meetingsAssignQuery.data, assigningUsersQuery.data])

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

  // Update one sub-service status in the cached customer list (no refetch).
  function updateCachedSubServiceStatus(newStatus: string, subServiceName?: string) {
    if (!serviceFlowTarget?.customer) return
    const targetCustomerId = Number(serviceFlowTarget.customer.id)

    queryClient.setQueriesData(
      { queryKey: ['autowebisionCustomers'] },
      (oldData: any) => {
        if (!oldData) return oldData
        const listKey = Array.isArray(oldData.data)
          ? 'data'
          : Array.isArray(oldData.content)
            ? 'content'
            : null
        if (!listKey) return oldData

        return {
          ...oldData,
          [listKey]: oldData[listKey].map((c: AutowebsionCustomerLightDTO) => {
            if (c.customerId !== targetCustomerId) return c

            const prevSubList = Array.isArray(c.subServiceInfo) ? [...c.subServiceInfo] : []
            const updatedSubList = prevSubList.map((sub: any) => {
              const name =
                sub?.name || (typeof sub === 'object' ? Object.keys(sub)[0] : String(sub))
              if (
                !subServiceName ||
                name.trim().toLowerCase() === subServiceName.trim().toLowerCase()
              ) {
                return typeof sub === 'object' && 'name' in sub
                  ? { ...sub, status: newStatus }
                  : { [name]: newStatus }
              }
              return sub
            })

            const updatedServices = Array.isArray(c.services)
              ? c.services.map((srv: any) => {
                  if (Array.isArray(srv.subServiceInfo)) {
                    return {
                      ...srv,
                      subServiceInfo: srv.subServiceInfo.map((sub: any) => {
                        const name =
                          sub?.name || (typeof sub === 'object' ? Object.keys(sub)[0] : String(sub))
                        if (
                          !subServiceName ||
                          name.trim().toLowerCase() === subServiceName.trim().toLowerCase()
                        ) {
                          return typeof sub === 'object' && 'name' in sub
                            ? { ...sub, status: newStatus }
                            : { [name]: newStatus }
                        }
                        return sub
                      }),
                    }
                  }
                  return srv
                })
              : c.services

            return {
              ...c,
              subServiceInfo: updatedSubList,
              services: updatedServices,
            }
          }),
        }
      },
    )
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
      serviceMonths: c.serviceExpiration || undefined,
      serviceExpiration: c.serviceExpiration || undefined,
      clientRemark: c.clientRemark || undefined,
      createdAt: c.createdAt ? String(c.createdAt) : undefined,
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
      serviceTags: extractServiceTags(c),
      duplicateCount: c.duplicateCount ?? 0,
      hasDuplicateCustomer: Boolean(c.hasDuplicateCustomer) || (c.duplicateCount ?? 0) > 0,
      parentCustomerId: c.parentCustomerId ?? null,
      parentBusinessName: c.parentBusinessName ?? null,
      isLinkedBusiness: Boolean(c.isLinkedBusiness) || Boolean(c.parentCustomerId),
      rawCustomer: c,
    }
  }

  // Handle confirming "Website Exists" from confirmation modal
  async function handleConfirmWebsiteExists(customer: AutowebsionCustomerLightDTO) {
    if (!canEditWebsiteExists) return
    setUpdatingWebsiteExistsId(customer.customerId)
    try {
      await updateWebsiteExistsStatus(customer.customerId, true)
      setToast({
        type: 'success',
        message: 'Website status updated to Exists.',
      })
      setConfirmWebsiteExistsTarget(null)
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
      notifyCustomerAssigned({ id: customerId }, assigneeEmail, deptLabel)
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

  // Fetches the internal remarks for one customer into the open Internal Remarks dialog.
  const loadInternalRemarks = useCallback(
    (customerId: number, departmentType: 'WEBSITE_DEPARTMENT' | 'AUTOMATION_DEPARTMENT') =>
      getCustomerInternalRemarks(customerId, departmentType, userEmail)
        .then((data) => {
          const list = Array.isArray(data) ? data : []
          setViewingInternalRemarks((prev) =>
            prev && prev.customerId === customerId
              ? { ...prev, remarks: list, loading: false }
              : prev,
          )
        })
        .catch((err) => {
          setViewingInternalRemarks((prev) =>
            prev && prev.customerId === customerId
              ? {
                  ...prev,
                  error: err instanceof Error ? err.message : 'Failed to fetch remarks',
                  loading: false,
                }
              : prev,
          )
        }),
    [userEmail],
  )

  // Handle on-demand fetching of internal remarks for Website or Automation
  const handleOpenFullRemarkDialog = useCallback(
    (
      customer: AutowebsionCustomerLightDTO,
      departmentType: 'WEBSITE_DEPARTMENT' | 'AUTOMATION_DEPARTMENT',
      preloadedRemarks?: CustomerRemark[],
    ) => {
      const hasPreloaded = Array.isArray(preloadedRemarks) && preloadedRemarks.length > 0
      setViewingInternalRemarks({
        customerId: customer.customerId,
        customerName: customer.businessName || customer.ownerName || 'Customer',
        departmentType,
        remarks: hasPreloaded ? preloadedRemarks : null,
        loading: !hasPreloaded,
        error: null,
      })

      if (!hasPreloaded) {
        void loadInternalRemarks(customer.customerId, departmentType)
      }
    },
    [loadInternalRemarks],
  )

  // Website Draft Handlers
  const handleOpenDraftModal = (customer: AutowebsionCustomerLightDTO) => {
    setSelectedCustomerForDraft(customer)
    setSendDraftModalOpen(true)
  }

  const handleCloseDraftModal = () => {
    setSendDraftModalOpen(false)
    setSelectedCustomerForDraft(null)
  }

  const handleSendDraft = async (draftLink: string, remark: string) => {
    if (!selectedCustomerForDraft) return
    const clientEmail = selectedCustomerForDraft.email || ''
    const clientName =
      selectedCustomerForDraft.businessName ||
      selectedCustomerForDraft.ownerName ||
      'Customer'

    if (!clientEmail) {
      setToast({ type: 'error', message: 'Customer does not have a valid email address.' })
      return
    }

    setIsSendingDraft(true)
    try {
      const result = await sendWebsiteDraftMail({
        clientEmail,
        clientName,
        draftLink,
        remark,
        customerId: selectedCustomerForDraft.customerId,
      })
      setToast({
        type: 'success',
        message: result.message || 'Website draft email sent successfully',
      })
      handleCloseDraftModal()
      await customersQuery.refetch()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send website draft email'
      setToast({ type: 'error', message: msg })
    } finally {
      setIsSendingDraft(false)
    }
  }

  const handleOpenDraftHistoryModal = (customer: AutowebsionCustomerLightDTO) => {
    setSelectedCustomerForDraft(customer)
    setDraftHistoryModalOpen(true)
    const clientEmail = customer.email || ''
    const customerId = customer.customerId
    const key = `${customerId}_${clientEmail}`
    draftHistoryEmailRef.current = key
    if (customerId || clientEmail) {
      setIsLoadingDraftHistory(true)
      fetchWebsiteDraftHistory({ clientEmail, customerId })
        .then((data) => {
          if (draftHistoryEmailRef.current === key) {
            setDraftHistory(data)
          }
        })
        .catch(() => {
          if (draftHistoryEmailRef.current === key) {
            setDraftHistory([])
          }
        })
        .finally(() => {
          if (draftHistoryEmailRef.current === key) {
            setIsLoadingDraftHistory(false)
          }
        })
    } else {
      setDraftHistory([])
    }
  }

  const handleCloseDraftHistoryModal = () => {
    setDraftHistoryModalOpen(false)
    setSelectedCustomerForDraft(null)
    setDraftHistory([])
    draftHistoryEmailRef.current = ''
  }

  // Refresh button in the Draft History modal: reloads only this customer's drafts,
  // keeping the current list on screen (dimmed) until the new one arrives.
  const refreshDraftHistory = async () => {
    const clientEmail = selectedCustomerForDraft?.email || ''
    const customerId = selectedCustomerForDraft?.customerId
    if (!customerId && !clientEmail) return
    setIsRefreshingDraftHistory(true)
    const key = `${customerId}_${clientEmail}`
    try {
      const data = await fetchWebsiteDraftHistory({ clientEmail, customerId })
      // Ignore a late response if the modal was closed or switched to another customer.
      if (draftHistoryEmailRef.current === key) setDraftHistory(data)
    } finally {
      setIsRefreshingDraftHistory(false)
    }
  }

  // Low-level status update
  async function executeStatusChange(
    customer: AutowebsionCustomerLightDTO,
    newStatus: string,
    targetServiceType?: 'WEBSITE' | 'AUTOMATION',
  ) {
    if (isHead || !canEditStatus) return
    const mapKey = `${customer.customerId}_${targetServiceType || 'ALL'}`
    setLocalStatusMap((prev) => ({ ...prev, [mapKey]: newStatus }))
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
      setLocalStatusMap((prev) => {
        const next = { ...prev }
        delete next[mapKey]
        return next
      })
      const msg = err instanceof Error ? err.message : 'Failed to update status'
      setToast({ type: 'error', message: msg })
    } finally {
      setUpdatingStatusId(null)
    }
  }

  // Handle status update with validation:
  // Handle status update with validation:
  // If status is in progress or pending and user tries to update to COMPLETED:
  // Sub-services must be completed first, otherwise show "Firstly complete SubService first"
  async function handleStatusChange(
    customer: AutowebsionCustomerLightDTO,
    newStatus: string,
    targetServiceType?: 'WEBSITE' | 'AUTOMATION',
  ) {
    if (isHead || !canEditStatus) return

    if (newStatus === 'COMPLETED') {
      const check = checkSubServicesCompletion(customer, targetServiceType)

      if (!check.allCompleted) {
        const msg = check.isWaitingAck
          ? 'Complete your acknowledgment'
          : 'Please complete subservice'
        setToast({
          type: 'error',
          message: msg,
        })
        setValidationModal({
          open: true,
          type: check.isWaitingAck ? 'acknowledgment' : 'incomplete',
          message: msg,
          detail: check.isWaitingAck
            ? 'All sub-services are completed, but customer acknowledgment is pending confirmation.'
            : 'All sub-services must be marked as completed before this service can be finalized.',
          subServices: check.subServices,
        })
        return
      }
    }

    await executeStatusChange(customer, newStatus, targetServiceType)
  }

  // Handle Airtel Click to Call
  async function handleCallCustomer(phone: string, customerName: string, customerId: number) {
    if (!phone) {
      setToast({ type: 'error', message: 'Customer has no phone number on record.' })
      return
    }
    setCallingCustomerId(String(customerId))
    try {
      const result = await initiateAirtelClickToCall(phone)
      if (result?.success === false) {
        throw new Error(result.message || 'Unable to initiate call')
      }
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

  // Helper to determine exact service type for service tags API
  function getExactServiceTypeForTags(
    c: AutowebsionCustomerLightDTO,
    targetServiceType?: 'WEBSITE' | 'AUTOMATION',
  ): string {
    const services = Array.isArray(c.services) ? c.services : []
    if (targetServiceType === 'WEBSITE' || activeSubTab === 'WEBSITE') {
      const match = services.find((s: any) =>
        String(s?.serviceType || '').toUpperCase().includes('WEB'),
      )
      if (match?.serviceType) return String(match.serviceType)
      return 'WEBSITE'
    }
    if (targetServiceType === 'AUTOMATION' || activeSubTab === 'AUTOMATION') {
      const match = services.find((s: any) =>
        String(s?.serviceType || '').toUpperCase().includes('AUTO'),
      )
      if (match?.serviceType) return String(match.serviceType)
      return 'AUTOMATION'
    }
    if (services.length > 0 && services[0]?.serviceType) {
      return String(services[0].serviceType)
    }
    if (Array.isArray(c.serviceTypes) && c.serviceTypes.length > 0) {
      return c.serviceTypes[0]
    }
    return 'WEBSITE'
  }

  // Extract all service tags assigned to customer or specific service
  function getServiceTagsForCustomer(
    customer: AutowebsionCustomerLightDTO,
    targetServiceType?: 'WEBSITE' | 'AUTOMATION',
  ): Array<{ key: string; label: string }> {
    const list: Array<{ key: string; label: string }> = []
    const seen = new Set<string>()

    const addTag = (k: string, v: string) => {
      const norm = String(v || k).trim()
      if (!norm || seen.has(norm.toUpperCase())) return
      seen.add(norm.toUpperCase())
      list.push({ key: k, label: norm })
    }

    if (Array.isArray(customer.services)) {
      for (const s of customer.services) {
        const st = String(s?.serviceType || '').toUpperCase()
        const matches =
          !targetServiceType ||
          (targetServiceType === 'WEBSITE' && (st.includes('WEB') || st.includes('SITE'))) ||
          (targetServiceType === 'AUTOMATION' && (st.includes('AUTO') || st.includes('BOT')))

        if (matches && s?.serviceTags) {
          let val = s.serviceTags
          if (typeof val === 'string') {
            try {
              val = JSON.parse(val)
            } catch {
              addTag(val, val)
            }
          }
          if (Array.isArray(val)) {
            val.forEach((item, idx) => {
              const name =
                typeof item === 'string'
                  ? item
                  : item?.tagName || item?.name || Object.values(item)[0]
              if (name) addTag(`s_tag_${idx}`, String(name))
            })
          } else if (val && typeof val === 'object') {
            Object.entries(val).forEach(([k, v]) => {
              const name =
                typeof v === 'object'
                  ? (v as any)?.tagName || (v as any)?.name || Object.values(v as any)[0]
                  : v
              if (name) addTag(k, String(name))
            })
          }
        }
      }
    }

    if (customer.serviceTags) {
      let val = customer.serviceTags
      if (typeof val === 'string') {
        try {
          val = JSON.parse(val)
        } catch {
          addTag(val, val)
        }
      }
      if (Array.isArray(val)) {
        val.forEach((item, idx) => {
          const name =
            typeof item === 'string'
              ? item
              : item?.tagName || item?.name || Object.values(item)[0]
          if (name) addTag(`c_tag_${idx}`, String(name))
        })
      } else if (val && typeof val === 'object') {
        Object.entries(val).forEach(([k, v]) => {
          const name =
            typeof v === 'object'
              ? (v as any)?.tagName || (v as any)?.name || Object.values(v as any)[0]
              : v
          if (name) addTag(k, String(name))
        })
      }
    }

    if (list.length === 0) {
      const fallback = extractServiceTags(customer)
      if (fallback && typeof fallback === 'object') {
        Object.entries(fallback).forEach(([k, v]) => {
          if (v) addTag(k, String(v))
        })
      }
    }

    return list
  }

  // Open Service Tags modal (editable for Department User, read-only for Department Head)
  function handleOpenServiceTags(
    customer: AutowebsionCustomerLightDTO,
    index: number,
    targetServiceType?: 'WEBSITE' | 'AUTOMATION',
  ) {
    const exactType = getExactServiceTypeForTags(customer, targetServiceType)
    const onboardingCust = toOnboardingCustomer(customer, index, targetServiceType)
    setServiceTagsTarget({
      customer: onboardingCust,
      serviceType: exactType,
      targetServiceType,
      index,
    })
  }

  const rawRows = customersQuery.data?.data || []

  // Service Tags modal reads the live row, so a refresh / tag update shows the new tags.
  const liveServiceTagsRow = serviceTagsTarget
    ? rawRows.find((row) => String(row.customerId) === serviceTagsTarget.customer.id)
    : undefined
  // Memoised on the fetched row: the modal re-syncs its tags whenever customer.serviceTags changes identity.
  const liveServiceTags = useMemo(
    () => (liveServiceTagsRow ? extractServiceTags(liveServiceTagsRow) : null),
    [liveServiceTagsRow],
  )
  const liveServiceTagsCustomer =
    serviceTagsTarget && liveServiceTags
      ? { ...serviceTagsTarget.customer, serviceTags: liveServiceTags }
      : null
  const totalElements = customersQuery.data?.totalElements ?? 0

  const activeTab: CustomerTab =
    activeStatus === 'PENDING'
      ? 'pending'
      : activeStatus === 'IN_PROGRESS'
        ? 'in-progress'
        : activeStatus === 'COMPLETED'
          ? 'completed'
          : 'all'

  const handleTabChange = (tab: CustomerTab) => {
    if (tab === 'pending') setActiveStatus('PENDING')
    else if (tab === 'in-progress') setActiveStatus('IN_PROGRESS')
    else if (tab === 'completed') setActiveStatus('COMPLETED')
    else setActiveStatus('ALL')
    setPage(0)
  }

  const tabCounts = {
    all: statusCounts.total,
    pending: statusCounts.pending,
    inProgress: statusCounts.inProgress,
    completed: statusCounts.completed,
  }

  function getClStatusClass(status: string) {
    const s = String(status || 'PENDING').toUpperCase()
    if (s.includes('COMPLETE')) return 'cl-status-btn--completed'
    if (s.includes('PROGRESS')) return 'cl-status-btn--in-progress'
    return 'cl-status-btn--pending'
  }

  return (
    <div className="autoweb-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`autoweb-toast autoweb-toast-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header & Sub-Tab Switcher matching Google UI design */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-bold text-slate-900">Autowebsion Customers</h1>
          <p className="text-xs text-slate-500">View all Website &amp; Automation customers in one place</p>
        </div>

        {/* Center Pill Sub-Tab Switcher Tabs */}
        <div className="cl-tabs" role="tablist">
          <button
            type="button"
            className={`cl-tab ${activeSubTab === 'ALL' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveSubTab('ALL')
              setPage(0)
            }}
          >
            <Layers size={14} />
            <span>All Services</span>
            {countsQuery.data?.all?.total !== undefined ? (
              <span className="cl-tab__count">{countsQuery.data.all.total}</span>
            ) : (
              <span className="cl-tab__count">{totalElements}</span>
            )}
          </button>

          <button
            type="button"
            className={`cl-tab ${activeSubTab === 'WEBSITE' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveSubTab('WEBSITE')
              setPage(0)
            }}
          >
            <Globe size={14} />
            <span>Website</span>
            {countsQuery.data?.website?.total !== undefined && (
              <span className="cl-tab__count">{countsQuery.data.website.total}</span>
            )}
          </button>

          <button
            type="button"
            className={`cl-tab ${activeSubTab === 'AUTOMATION' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveSubTab('AUTOMATION')
              setPage(0)
            }}
          >
            <Bot size={14} />
            <span>Automation</span>
            {countsQuery.data?.automation?.total !== undefined && (
              <span className="cl-tab__count">{countsQuery.data.automation.total}</span>
            )}
          </button>
        </div>
      </div>

      {/* Google UI Filters: Status Tabs, Search Bar, Date Range, Assignee Filter, Refresh */}
      <CustomersListFilters
        activeTab={activeTab}
        onTabChange={handleTabChange}
        tabCounts={tabCounts}
        searchSlot={
          <CustomersListSearchBar
            value={search}
            onChange={(val) => {
              setSearch(val)
              setPage(0)
            }}
            placeholder="Search by name, email, phone, or business..."
          />
        }
        actionsSlot={
          <RefreshButton
            onRefresh={async () => {
              const [customersResult] = await Promise.all([
                customersQuery.refetch(),
                countsQuery.refetch(),
              ])
              if (customersResult.isSuccess) setLocalStatusMap({})
            }}
            isRefreshing={customersQuery.isFetching}
            label="customers"
          />
        }
        assignees={isAssigneeVisible ? assignees : undefined}
        selectedAssigneeId={selectedAssignee}
        onAssigneeChange={(id) => {
          setSelectedAssignee(id || 'all')
          setPage(0)
        }}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateChange={(from, to) => {
          setDateFrom(from)
          setDateTo(to)
          setPage(0)
        }}
        onReset={() => {
          setDateFrom('')
          setDateTo('')
          setSelectedAssignee('all')
          setSearch('')
          setActiveStatus('ALL')
          setPage(0)
        }}
      />

      {/* Main Customers Table Card (Google UI cl-table-wrapper & cl-table) */}
      <div
        className={`cl-table-wrapper autoweb-cl-wrapper transition-opacity${
          customersQuery.isFetching && !customersQuery.isPending ? ' opacity-60 pointer-events-none' : ''
        }`}
        aria-busy={customersQuery.isFetching}
      >
        {customersQuery.isPending ? (
          <LoadingState message="Loading Autowebsion customers..." />
        ) : customersQuery.isError ? (
          <ErrorState
            title="Unable to load Autowebsion customers"
            message={customersQuery.error?.message || 'Failed to fetch'}
            onRetry={() => customersQuery.refetch()}
          />
        ) : rawRows.length === 0 ? (
          <div className="cl-empty" style={{ padding: '48px 16px', textAlign: 'center' }}>
            <Building size={36} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
            <p style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>
              No customers found matching the selected filters.
            </p>
          </div>
        ) : (
          <table className="cl-table autoweb-cl-table">
            <thead>
              <tr>
                {isIndexVisible && <th className="cl-th cl-col-num">#</th>}
                {isCustomerVisible && <th className="cl-th cl-col-biz">BUSINESS</th>}
                {isContactVisible && <th className="cl-th cl-col-contact">CONTACT</th>}
                {isServicesVisible && <th className="cl-th cl-col-services">SERVICES</th>}
                {isStatusVisible && <th className="cl-th cl-col-status">STATUS</th>}
                {isInternalRemarkVisible && <th className="cl-th cl-col-internal-remark">INTERNAL REMARK</th>}
                {isDraftSentVisible && <th className="cl-th cl-col-draft">DRAFT SENT</th>}
                {isAssigneeVisible && <th className="cl-th cl-col-assign">ASSIGNED TO</th>}
              </tr>
            </thead>
            <tbody>
              {rawRows.map((customer, index) => {
                const customerId = customer.customerId
                // Created Date and Expiration are displayed in the Eye icon drawer modal

                const websiteStatus =
                  localStatusMap[`${customer.customerId}_WEBSITE`] ||
                  localStatusMap[`${customer.customerId}_ALL`] ||
                  getWebsiteServiceStatus(customer)
                const automationStatus =
                  localStatusMap[`${customer.customerId}_AUTOMATION`] ||
                  localStatusMap[`${customer.customerId}_ALL`] ||
                  getAutomationServiceStatus(customer)

                const webPill = getServicePillStyle(getServicePillStatus(customer, 'WEBSITE'))
                const autoPill = getServicePillStyle(getServicePillStatus(customer, 'AUTOMATION'))

                const serviceTypes = Array.isArray(customer.serviceTypes) ? customer.serviceTypes : []
                const services = Array.isArray(customer.services) ? customer.services : []
                const perServiceStatus = Array.isArray((customer as any).perServiceStatus) ? (customer as any).perServiceStatus : []
                const hasWebsite =
                  serviceTypes.some((s) => s.toUpperCase().includes('WEB')) ||
                  services.some((s) => String(s?.serviceType || '').toUpperCase().includes('WEB')) ||
                  perServiceStatus.some((s: any) => String(s?.serviceType || '').toUpperCase().includes('WEB'))
                const hasAutomation =
                  serviceTypes.some((s) => s.toUpperCase().includes('AUTO')) ||
                  services.some((s) => String(s?.serviceType || '').toUpperCase().includes('AUTO')) ||
                  perServiceStatus.some((s: any) => String(s?.serviceType || '').toUpperCase().includes('AUTO'))

                return (
                  <tr key={customerId || index} className="cl-row">
                    {/* 1. Row Index */}
                    {isIndexVisible && <td className="cl-td cl-col-num">{page * size + index + 1}</td>}

                    {/* 3. Business */}
                    {isCustomerVisible && (
                      <td className="cl-td cl-col-biz">
                        <div className="cl-biz-line">
                          <button
                            type="button"
                            className="cl-biz-name cl-biz-name--link"
                            onClick={() => {
                              setSelectedCustomer(toOnboardingCustomer(customer, index))
                              setModalTab('overview')
                            }}
                            title={customer.businessName || customer.ownerName || 'Customer'}
                          >
                            {customer.businessName || customer.ownerName || 'Customer'}
                          </button>

                          {/* Form Button */}
                          <button
                            type="button"
                            className="cl-form-pill"
                            title="Open editable customer form in new tab"
                            onClick={() => {
                              const isDup = Boolean(
                                customer.hasDuplicateCustomer ||
                                customer.isLinkedBusiness ||
                                customer.parentCustomerId ||
                                (customer.duplicateCount ?? 0) > 0,
                              )
                              const url = getCustomerFormUrl(customer.phoneNumber, isDup, customer.customerId)
                              if (url) {
                                window.open(url, '_blank')
                              } else {
                                setToast({ type: 'error', message: 'No phone number available for form.' })
                              }
                            }}
                          >
                            <FileText size={11} />
                            <span>Form</span>
                          </button>

                          {/* Website Exists Globe button */}
                          {activeSubTab !== 'AUTOMATION' && (
                            <button
                              type="button"
                              className={`inline-flex items-center justify-center h-6 w-6 rounded-md border transition-all ${
                                customer.isWebsiteExists
                                  ? 'border-blue-300 bg-blue-50 text-blue-600 cursor-not-allowed'
                                  : canEditWebsiteExists
                                    ? 'border-slate-200 bg-slate-50 text-slate-400 hover:text-amber-700 hover:border-amber-300 hover:bg-amber-50 cursor-pointer'
                                    : 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                              }`}
                              disabled={customer.isWebsiteExists || !canEditWebsiteExists || updatingWebsiteExistsId === customerId}
                              onClick={() => {
                                if (!customer.isWebsiteExists && canEditWebsiteExists) {
                                  setConfirmWebsiteExistsTarget(customer)
                                }
                              }}
                              title={
                                customer.isWebsiteExists
                                  ? 'Website Exists: YES (Cannot be turned NO)'
                                  : canEditWebsiteExists
                                    ? 'Click to confirm Website Exists'
                                    : 'Website does not exist (Read-only for Head)'
                              }
                            >
                              {updatingWebsiteExistsId === customerId ? (
                                <Loader2 size={12} className="spin" />
                              ) : (
                                <Globe size={12} />
                              )}
                            </button>
                          )}

                          {/* Main View Pill (with hover showing parent business name) */}
                          {(Boolean(customer.isLinkedBusiness) || Boolean(customer.parentCustomerId)) && (
                            <span
                              className="cl-linked-branch-pill"
                              title={customer.parentBusinessName || 'Main Business'}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                borderRadius: '9999px',
                                border: '1px solid #c7d2fe',
                                backgroundColor: '#eef2ff',
                                padding: '2px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#4338ca',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                              onClick={() => {
                                setSelectedCustomer(toOnboardingCustomer(customer, index))
                                setModalTab('overview')
                              }}
                            >
                              <Link2 size={11} />
                              <span>Main View</span>
                            </span>
                          )}

                          {/* Other / Duplicate Pill Button */}
                          {(Boolean(customer.hasDuplicateCustomer) || (customer.duplicateCount ?? 0) > 0) && (
                            <button
                              type="button"
                              className="cl-dup-pill-btn"
                              title="View other businesses"
                              onClick={() => {
                                setSelectedCustomer(toOnboardingCustomer(customer, index))
                                setModalTab('duplicates')
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                borderRadius: '9999px',
                                border: '1px solid #ffe19a',
                                backgroundColor: '#fff5d6',
                                padding: '2px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#8a5a00',
                                cursor: 'pointer',
                              }}
                            >
                              <Copy size={11} />
                              <span>
                                {customer.duplicateCount && customer.duplicateCount > 0
                                  ? `${customer.duplicateCount} Other`
                                  : 'Other'}
                              </span>
                            </button>
                          )}
                        </div>

                        <div className="cl-biz-meta" title={customer.ownerName || '—'}>
                          {customer.ownerName || '—'}
                        </div>
                      </td>
                    )}

                    {/* 4. Contact */}
                    {isContactVisible && (
                      <td className="cl-td cl-col-contact">
                        <div className="cl-email" title={customer.email || '—'}>
                          {customer.email || '—'}
                        </div>

                        <div className="cl-phone-row">
                          <span className="cl-phone-text" title={customer.phoneNumber || '—'}>
                            {customer.phoneNumber || '—'}
                          </span>
                          {customer.phoneNumber && (
                            <button
                              type="button"
                              className="cl-call-icon"
                              title={`Click to call ${customer.phoneNumber}`}
                              disabled={callingCustomerId === String(customerId)}
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
                          )}
                        </div>
                      </td>
                    )}

                    {/* 6. Services */}
                    {isServicesVisible && (
                      <td className="cl-td cl-col-services">
                        <div className="flex flex-col gap-1 items-start">
                          {activeSubTab === 'WEBSITE' ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                className={`cl-service-type-badge ${webPill.btnClass}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '3px 8px',
                                  borderRadius: '8px',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  backgroundColor: webPill.inlineStyle.backgroundColor,
                                  borderColor: webPill.inlineStyle.borderColor,
                                  color: webPill.inlineStyle.color,
                                }}
                                onClick={() =>
                                  setServiceFlowTarget({
                                    customer: toOnboardingCustomer(customer, index, 'WEBSITE'),
                                    serviceType: 'WEBSITE',
                                  })
                                }
                                title={`Website (${webPill.label}) - Click to view Website service flow`}
                              >
                                <Globe size={11} className={`${webPill.iconClass} flex-shrink-0`} style={{ color: webPill.inlineStyle.color }} />
                                <span>Website</span>
                              </button>
                            </div>
                          ) : activeSubTab === 'AUTOMATION' ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                className={`cl-service-type-badge ${autoPill.btnClass}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '3px 8px',
                                  borderRadius: '8px',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  backgroundColor: autoPill.inlineStyle.backgroundColor,
                                  borderColor: autoPill.inlineStyle.borderColor,
                                  color: autoPill.inlineStyle.color,
                                }}
                                onClick={() =>
                                  setServiceFlowTarget({
                                    customer: toOnboardingCustomer(customer, index, 'AUTOMATION'),
                                    serviceType: 'AUTOMATION',
                                  })
                                }
                                title={`Automation (${autoPill.label}) - Click to view Automation service flow`}
                              >
                                <Bot size={11} className={`${autoPill.iconClass} flex-shrink-0`} style={{ color: autoPill.inlineStyle.color }} />
                                <span>Automation</span>
                              </button>
                            </div>
                          ) : hasWebsite && hasAutomation ? (
                            <div className="flex flex-wrap gap-1.5 items-center">
                              <button
                                type="button"
                                className={`cl-service-type-badge ${webPill.btnClass}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '3px 8px',
                                  borderRadius: '8px',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  backgroundColor: webPill.inlineStyle.backgroundColor,
                                  borderColor: webPill.inlineStyle.borderColor,
                                  color: webPill.inlineStyle.color,
                                }}
                                onClick={() =>
                                  setServiceFlowTarget({
                                    customer: toOnboardingCustomer(customer, index, 'WEBSITE'),
                                    serviceType: 'WEBSITE',
                                  })
                                }
                                title={`Website (${webPill.label}) - Click to view Website service flow`}
                              >
                                <Globe size={11} className={`${webPill.iconClass} flex-shrink-0`} style={{ color: webPill.inlineStyle.color }} />
                                <span>Website</span>
                              </button>
                              <button
                                type="button"
                                className={`cl-service-type-badge ${autoPill.btnClass}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '3px 8px',
                                  borderRadius: '8px',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  backgroundColor: autoPill.inlineStyle.backgroundColor,
                                  borderColor: autoPill.inlineStyle.borderColor,
                                  color: autoPill.inlineStyle.color,
                                }}
                                onClick={() =>
                                  setServiceFlowTarget({
                                    customer: toOnboardingCustomer(customer, index, 'AUTOMATION'),
                                    serviceType: 'AUTOMATION',
                                  })
                                }
                                title={`Automation (${autoPill.label}) - Click to view Automation service flow`}
                              >
                                <Bot size={11} className={`${autoPill.iconClass} flex-shrink-0`} style={{ color: autoPill.inlineStyle.color }} />
                                <span>Automation</span>
                              </button>
                            </div>
                          ) : hasAutomation ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                className={`cl-service-type-badge ${autoPill.btnClass}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '3px 8px',
                                  borderRadius: '8px',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  backgroundColor: autoPill.inlineStyle.backgroundColor,
                                  borderColor: autoPill.inlineStyle.borderColor,
                                  color: autoPill.inlineStyle.color,
                                }}
                                onClick={() =>
                                  setServiceFlowTarget({
                                    customer: toOnboardingCustomer(customer, index, 'AUTOMATION'),
                                    serviceType: 'AUTOMATION',
                                  })
                                }
                                title={`Automation (${autoPill.label}) - Click to view Automation service flow`}
                              >
                                <Bot size={11} className={`${autoPill.iconClass} flex-shrink-0`} style={{ color: autoPill.inlineStyle.color }} />
                                <span>Automation</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                className={`cl-service-type-badge ${webPill.btnClass}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '3px 8px',
                                  borderRadius: '8px',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  backgroundColor: webPill.inlineStyle.backgroundColor,
                                  borderColor: webPill.inlineStyle.borderColor,
                                  color: webPill.inlineStyle.color,
                                }}
                                onClick={() =>
                                  setServiceFlowTarget({
                                    customer: toOnboardingCustomer(customer, index, 'WEBSITE'),
                                    serviceType: 'WEBSITE',
                                  })
                                }
                                title={`Website (${webPill.label}) - Click to view Website service flow`}
                              >
                                <Globe size={11} className={`${webPill.iconClass} flex-shrink-0`} style={{ color: webPill.inlineStyle.color }} />
                                <span>Website</span>
                              </button>
                            </div>
                          )}

                          {/* Rendered Service Tags: visible to both Department User and Head */}
                          {(() => {
                            const targetTab =
                              activeSubTab === 'WEBSITE'
                                ? 'WEBSITE'
                                : activeSubTab === 'AUTOMATION'
                                  ? 'AUTOMATION'
                                  : undefined
                            const tags = getServiceTagsForCustomer(customer, targetTab)
                            if (tags.length === 0) return null

                            return (
                              <div className="flex flex-wrap gap-1 mt-1 max-w-[210px]">
                                {tags.slice(0, 2).map(({ key, label }) => (
                                  <span
                                    key={key}
                                    onClick={() => handleOpenServiceTags(customer, index, targetTab)}
                                    title={
                                      isDepartmentUser
                                        ? `Click to manage tags (${label})`
                                        : `Service tag: ${label} (Click to view)`
                                    }
                                    className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100 transition-colors cursor-pointer truncate max-w-[140px]"
                                  >
                                    {label.replace(/_/g, ' ')}
                                  </span>
                                ))}
                                {tags.length > 2 && (
                                  <span
                                    onClick={() => handleOpenServiceTags(customer, index, targetTab)}
                                    title={
                                      isDepartmentUser
                                        ? 'View & manage all tags'
                                        : 'View all tags (Read only)'
                                    }
                                    className="inline-flex items-center text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer px-1"
                                  >
                                    +{tags.length - 2}
                                  </span>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      </td>
                    )}

                    {/* 7. Status */}
                    {isStatusVisible && (
                      <td className="cl-td cl-col-status">
                        {canEditStatus ? (
                          /* Department User: Editable status dropdowns styled with cl-status-btn */
                          <div className="flex flex-col gap-1.5 items-start">
                            {activeSubTab === 'WEBSITE' ? (
                              <div className="relative inline-flex items-center">
                                <Globe size={11} className={`absolute left-2.5 pointer-events-none ${getStatusIconColor(websiteStatus)}`} />
                                <select
                                  className={`cl-status-btn ${getClStatusClass(websiteStatus)} pl-6 pr-6 cursor-pointer appearance-none`}
                                  value={websiteStatus}
                                  disabled={updatingStatusId === customerId}
                                  onChange={(e) => handleStatusChange(customer, e.target.value, 'WEBSITE')}
                                >
                                  <option value="PENDING">Pending</option>
                                  <option value="IN_PROGRESS">In Progress</option>
                                  <option value="COMPLETED">Completed</option>
                                </select>
                                <ChevronsUpDown size={10} className="absolute right-2 pointer-events-none opacity-60" />
                              </div>
                            ) : activeSubTab === 'AUTOMATION' ? (
                              <div className="relative inline-flex items-center">
                                <Bot size={11} className={`absolute left-2.5 pointer-events-none ${getStatusIconColor(automationStatus)}`} />
                                <select
                                  className={`cl-status-btn ${getClStatusClass(automationStatus)} pl-6 pr-6 cursor-pointer appearance-none`}
                                  value={automationStatus}
                                  disabled={updatingStatusId === customerId}
                                  onChange={(e) => handleStatusChange(customer, e.target.value, 'AUTOMATION')}
                                >
                                  <option value="PENDING">Pending</option>
                                  <option value="IN_PROGRESS">In Progress</option>
                                  <option value="COMPLETED">Completed</option>
                                </select>
                                <ChevronsUpDown size={10} className="absolute right-2 pointer-events-none opacity-60" />
                              </div>
                            ) : hasWebsite && hasAutomation ? (
                              <div className="flex flex-col gap-1 items-start">
                                <div className="relative inline-flex items-center">
                                  <Globe size={11} className={`absolute left-2.5 pointer-events-none ${getStatusIconColor(websiteStatus)}`} />
                                  <select
                                    className={`cl-status-btn ${getClStatusClass(websiteStatus)} pl-6 pr-6 cursor-pointer appearance-none`}
                                    value={websiteStatus}
                                    disabled={updatingStatusId === customerId}
                                    onChange={(e) => handleStatusChange(customer, e.target.value, 'WEBSITE')}
                                  >
                                    <option value="PENDING">Pending</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="COMPLETED">Completed</option>
                                  </select>
                                  <ChevronsUpDown size={10} className="absolute right-2 pointer-events-none opacity-60" />
                                </div>
                                <div className="relative inline-flex items-center">
                                  <Bot size={11} className={`absolute left-2.5 pointer-events-none ${getStatusIconColor(automationStatus)}`} />
                                  <select
                                    className={`cl-status-btn ${getClStatusClass(automationStatus)} pl-6 pr-6 cursor-pointer appearance-none`}
                                    value={automationStatus}
                                    disabled={updatingStatusId === customerId}
                                    onChange={(e) => handleStatusChange(customer, e.target.value, 'AUTOMATION')}
                                  >
                                    <option value="PENDING">Pending</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="COMPLETED">Completed</option>
                                  </select>
                                  <ChevronsUpDown size={10} className="absolute right-2 pointer-events-none opacity-60" />
                                </div>
                              </div>
                            ) : hasAutomation ? (
                              <div className="relative inline-flex items-center">
                                <Bot size={11} className={`absolute left-2.5 pointer-events-none ${getStatusIconColor(automationStatus)}`} />
                                <select
                                  className={`cl-status-btn ${getClStatusClass(automationStatus)} pl-6 pr-6 cursor-pointer appearance-none`}
                                  value={automationStatus}
                                  disabled={updatingStatusId === customerId}
                                  onChange={(e) => handleStatusChange(customer, e.target.value, 'AUTOMATION')}
                                >
                                  <option value="PENDING">Pending</option>
                                  <option value="IN_PROGRESS">In Progress</option>
                                  <option value="COMPLETED">Completed</option>
                                </select>
                                <ChevronsUpDown size={10} className="absolute right-2 pointer-events-none opacity-60" />
                              </div>
                            ) : (
                              <div className="relative inline-flex items-center">
                                <Globe size={11} className={`absolute left-2.5 pointer-events-none ${getStatusIconColor(websiteStatus)}`} />
                                <select
                                  className={`cl-status-btn ${getClStatusClass(websiteStatus)} pl-6 pr-6 cursor-pointer appearance-none`}
                                  value={websiteStatus}
                                  disabled={updatingStatusId === customerId}
                                  onChange={(e) => handleStatusChange(customer, e.target.value, 'WEBSITE')}
                                >
                                  <option value="PENDING">Pending</option>
                                  <option value="IN_PROGRESS">In Progress</option>
                                  <option value="COMPLETED">Completed</option>
                                </select>
                                <ChevronsUpDown size={10} className="absolute right-2 pointer-events-none opacity-60" />
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Head: Read-only status pills */
                          <div className="flex flex-col gap-1 items-start">
                            {activeSubTab === 'WEBSITE' ? (
                              <div
                                className={`cl-status-btn ${getClStatusClass(websiteStatus)} cl-status-btn--locked select-none`}
                                title="Website Status (Read-only for Head)"
                              >
                                <Globe size={11} className={getStatusIconColor(websiteStatus)} />
                                <span>{formatStatusLabel(websiteStatus)}</span>
                              </div>
                            ) : activeSubTab === 'AUTOMATION' ? (
                              <div
                                className={`cl-status-btn ${getClStatusClass(automationStatus)} cl-status-btn--locked select-none`}
                                title="Automation Status (Read-only for Head)"
                              >
                                <Bot size={11} className={getStatusIconColor(automationStatus)} />
                                <span>{formatStatusLabel(automationStatus)}</span>
                              </div>
                            ) : hasWebsite && hasAutomation ? (
                              <div className="flex flex-col gap-1 items-start">
                                <div
                                  className={`cl-status-btn ${getClStatusClass(websiteStatus)} cl-status-btn--locked select-none`}
                                  title="Website Status (Read-only for Head)"
                                >
                                  <Globe size={11} className={getStatusIconColor(websiteStatus)} />
                                  <span>{formatStatusLabel(websiteStatus)}</span>
                                </div>
                                <div
                                  className={`cl-status-btn ${getClStatusClass(automationStatus)} cl-status-btn--locked select-none`}
                                  title="Automation Status (Read-only for Head)"
                                >
                                  <Bot size={11} className={getStatusIconColor(automationStatus)} />
                                  <span>{formatStatusLabel(automationStatus)}</span>
                                </div>
                              </div>
                            ) : hasAutomation ? (
                              <div
                                className={`cl-status-btn ${getClStatusClass(automationStatus)} cl-status-btn--locked select-none`}
                                title="Automation Status (Read-only for Head)"
                              >
                                <Bot size={11} className={getStatusIconColor(automationStatus)} />
                                <span>{formatStatusLabel(automationStatus)}</span>
                              </div>
                            ) : (
                              <div
                                className={`cl-status-btn ${getClStatusClass(websiteStatus)} cl-status-btn--locked select-none`}
                                title="Website Status (Read-only for Head)"
                              >
                                <Globe size={11} className={getStatusIconColor(websiteStatus)} />
                                <span>{formatStatusLabel(websiteStatus)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    )}

                    {/* 10. Internal Remark */}
                    {isInternalRemarkVisible && (
                      <td className="cl-td cl-col-internal-remark">
                        <div className="flex flex-col gap-1 items-start">
                          {activeSubTab === 'WEBSITE' ? (
                            <InternalRemarkBadge
                              customer={customer}
                              customerId={customerId}
                              customerName={customer.businessName || customer.ownerName || 'Customer'}
                              departmentType="WEBSITE_DEPARTMENT"
                              userEmail={userEmail}
                              activePopoverKey={activeRemarkPopoverKey}
                              setActivePopoverKey={setActiveRemarkPopoverKey}
                              onOpenFullDialog={handleOpenFullRemarkDialog}
                            />
                          ) : activeSubTab === 'AUTOMATION' ? (
                            <InternalRemarkBadge
                              customer={customer}
                              customerId={customerId}
                              customerName={customer.businessName || customer.ownerName || 'Customer'}
                              departmentType="AUTOMATION_DEPARTMENT"
                              userEmail={userEmail}
                              activePopoverKey={activeRemarkPopoverKey}
                              setActivePopoverKey={setActiveRemarkPopoverKey}
                              onOpenFullDialog={handleOpenFullRemarkDialog}
                            />
                          ) : (
                            <>
                              {hasWebsite && (
                                <InternalRemarkBadge
                                  customer={customer}
                                  customerId={customerId}
                                  customerName={customer.businessName || customer.ownerName || 'Customer'}
                                  departmentType="WEBSITE_DEPARTMENT"
                                  userEmail={userEmail}
                                  activePopoverKey={activeRemarkPopoverKey}
                                  setActivePopoverKey={setActiveRemarkPopoverKey}
                                  onOpenFullDialog={handleOpenFullRemarkDialog}
                                />
                              )}
                              {hasAutomation && (
                                <InternalRemarkBadge
                                  customer={customer}
                                  customerId={customerId}
                                  customerName={customer.businessName || customer.ownerName || 'Customer'}
                                  departmentType="AUTOMATION_DEPARTMENT"
                                  userEmail={userEmail}
                                  activePopoverKey={activeRemarkPopoverKey}
                                  setActivePopoverKey={setActiveRemarkPopoverKey}
                                  onOpenFullDialog={handleOpenFullRemarkDialog}
                                />
                              )}
                              {!hasWebsite && !hasAutomation && (
                                <InternalRemarkBadge
                                  customer={customer}
                                  customerId={customerId}
                                  customerName={customer.businessName || customer.ownerName || 'Customer'}
                                  departmentType="WEBSITE_DEPARTMENT"
                                  userEmail={userEmail}
                                  activePopoverKey={activeRemarkPopoverKey}
                                  setActivePopoverKey={setActiveRemarkPopoverKey}
                                  onOpenFullDialog={handleOpenFullRemarkDialog}
                                />
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    )}

                    {/* 11. Draft Sent */}
                    {isDraftSentVisible && (
                      <td className="cl-td cl-col-draft">
                        <div className="flex items-center gap-1.5">
                          {canEditDraft ? (
                            <button
                              type="button"
                              onClick={() => handleOpenDraftModal(customer)}
                              className={`cl-form-pill cursor-pointer transition-colors ${
                                customer.isMailSent ? 'cl-draft-pill--sent' : 'cl-draft-pill--unsent'
                              }`}
                              style={
                                customer.isMailSent
                                  ? { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', color: '#15803d' }
                                  : { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' }
                              }
                              title={
                                customer.isMailSent
                                  ? 'Draft already sent. Click to send another'
                                  : 'Click to send draft'
                              }
                            >
                              <FileText size={12} />
                              <span>{customer.isMailSent ? 'Draft Sent' : 'Send Draft'}</span>
                            </button>
                          ) : (
                            <div
                              className={`cl-form-pill select-none cursor-default ${
                                customer.isMailSent ? 'cl-draft-pill--sent' : 'cl-draft-pill--unsent'
                              }`}
                              style={
                                customer.isMailSent
                                  ? { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', color: '#15803d' }
                                  : { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' }
                              }
                              title={
                                customer.isMailSent
                                  ? 'Draft Sent (Read-only for Head)'
                                  : 'Send Draft (Read-only for Head)'
                              }
                            >
                              <FileText size={12} />
                              <span>{customer.isMailSent ? 'Draft Sent' : 'Send Draft'}</span>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenDraftHistoryModal(customer)}
                            className="cl-row-view"
                            style={{ width: '26px', height: '26px' }}
                            title="View Website Draft History"
                          >
                            <Clock size={12} />
                          </button>
                        </div>
                      </td>
                    )}

                    {/* 12. Assigned To */}
                    {isAssigneeVisible && (
                      <td className="cl-td cl-col-assign">
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

                          {/* Assign Button using cl-assign-btn */}
                          <button
                            type="button"
                            className="cl-assign-btn"
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
                            <ChevronsUpDown size={12} className="text-slate-400" />
                          </button>

                          {/* Dropdown Menu */}
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
                                {/* Unassigned Option */}
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

                                {/* Autowebision Users Header */}
                                <div className="px-3 pt-2 pb-1 text-[11px] font-semibold text-slate-400">
                                  Autowebision Users
                                </div>

                                {/* User List */}
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
        )}

        {/* Pagination matching Google UI styling */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', background: '#fff' }}>
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
      </div>

      {/* Customer Profile Drawer Modal */}
      <CustomersListModal
        customer={selectedCustomer}
        assignees={assignees}
        showStatus={true}
        showAssignTo={isAssigneeVisible}
        canEditRemark={canEditRemark}
        initialTab={modalTab}
        departmentType={
          activeSubTab === 'AUTOMATION'
            ? 'AUTOMATION_DEPARTMENT'
            : activeSubTab === 'WEBSITE'
              ? 'WEBSITE_DEPARTMENT'
              : (selectedCustomer?.serviceType?.toUpperCase().includes('AUTOMATION')
                  ? 'AUTOMATION_DEPARTMENT'
                  : selectedCustomer?.serviceType?.toUpperCase().includes('WEBSITE')
                    ? 'WEBSITE_DEPARTMENT'
                    : permissionDepartmentType)
        }
        onOpenFullPage={(cust) => {
          const isDup = Boolean(
            cust.hasDuplicateCustomer ||
            (cust.duplicateCount ?? 0) > 0 ||
            (cust as any).isLinkedBusiness ||
            (cust as any).parentCustomerId,
          )
          const url = getCustomerFormUrl(cust.phone, isDup, cust.id)
          if (url) window.open(url, '_blank')
        }}
        onClose={() => {
          setSelectedCustomer(null)
          setModalTab(undefined)
        }}
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
        onStepsUpdated={(steps, subServiceName) => {
          // No API refetch: the backend syncs sub_service_info from the flow the same way
          // (all steps done -> PENDING_CUSTOMER_ACK, any done -> IN_PROGRESS), mirror it in the cache.
          if (!subServiceName || steps.length === 0) return
          const done = steps.filter((s) => s.status.toUpperCase() === 'COMPLETED').length
          const newStatus =
            done === steps.length ? 'PENDING_CUSTOMER_ACK' : done > 0 ? 'IN_PROGRESS' : 'PENDING'
          updateCachedSubServiceStatus(newStatus, subServiceName)
        }}
        onSubServiceStatusUpdated={(newStatus, subServiceName) => {
          // Do NOT refetch customersQuery or countsQuery!
          updateCachedSubServiceStatus(newStatus, subServiceName)
        }}
      />

      {/* Client Remark Dialog */}
      {viewingClientRemark && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150"
          onClick={() => setViewingClientRemark(null)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-2xl p-6 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-pink-50 text-pink-700 border border-pink-200">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    Client Remark - {viewingClientRemark.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Client remarks and replies ({viewingClientRemark.departmentType === 'AUTOMATION_DEPARTMENT' ? 'Automation' : 'Website'})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RefreshButton
                  onRefresh={() => {
                    const customer = clientRemarkCustomerRef.current
                    if (!customer || customer.customerId !== viewingClientRemark.customerId) return
                    const targetDept = viewingClientRemark.departmentType
                    setViewingClientRemark((prev) => (prev ? { ...prev, loading: true, error: null } : prev))
                    return loadClientRemarks(customer, targetDept)
                  }}
                  isRefreshing={viewingClientRemark.loading}
                  label="client remarks"
                />
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  onClick={() => setViewingClientRemark(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Add Remark Form */}
            {isDepartmentUser && session?.user?.role !== 'CUSTOMER' && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!newClientRemarkText.trim() || isSubmittingClientRemark) return
                  setIsSubmittingClientRemark(true)
                  try {
                    await addClientRemark(
                      viewingClientRemark.customerId,
                      newClientRemarkText.trim(),
                      viewingClientRemark.departmentType,
                    )
                    const newEntry = {
                      reply: newClientRemarkText.trim(),
                      timestamp: new Date().toISOString(),
                      staffName: session?.user?.name || session?.user?.username || 'You',
                    }
                    setViewingClientRemark((prev) =>
                      prev ? { ...prev, remarks: [newEntry, ...prev.remarks] } : prev,
                    )
                    setNewClientRemarkText('')
                    queryClient.invalidateQueries({ queryKey: ['autowebisionCustomers'] })
                  } catch (err: any) {
                    console.error('Failed to add client remark', err)
                  } finally {
                    setIsSubmittingClientRemark(false)
                  }
                }}
                className="pt-4 flex gap-2"
              >
                <input
                  type="text"
                  value={newClientRemarkText}
                  onChange={(e) => setNewClientRemarkText(e.target.value)}
                  placeholder="Add a new client remark..."
                  disabled={isSubmittingClientRemark}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={isSubmittingClientRemark || !newClientRemarkText.trim()}
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  {isSubmittingClientRemark ? 'Adding...' : 'Add'}
                </button>
              </form>
            )}

            {/* Body */}
            <div className="py-4 max-h-[50vh] overflow-y-auto space-y-3">
              {viewingClientRemark.loading && viewingClientRemark.remarks.length === 0 && (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <Loader2 size={24} className="animate-spin text-pink-600" />
                  <p className="text-xs font-medium">Fetching client remarks...</p>
                </div>
              )}

              {viewingClientRemark.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                  {viewingClientRemark.error}
                </div>
              )}

              {!viewingClientRemark.loading &&
                !viewingClientRemark.error &&
                viewingClientRemark.remarks.length === 0 && (
                  <div className="p-4 bg-pink-50/50 border border-pink-100 rounded-xl text-center">
                    <p className="text-xs font-semibold text-pink-700">No client remark entered yet.</p>
                    <p className="text-[11px] text-slate-500 mt-1">Use the input above to add the first client remark.</p>
                  </div>
                )}

              {viewingClientRemark.remarks.map((rem, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-pink-100 bg-pink-50/30 hover:bg-pink-50/50 transition-colors"
                >
                  <p className="text-xs font-medium text-slate-800 whitespace-pre-wrap">{rem.reply}</p>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-pink-100/60 text-[10px] text-slate-500">
                    {rem.staffName && (
                      <span className="font-semibold text-pink-700 bg-pink-100/80 px-1.5 py-0.5 rounded">
                        {rem.staffName}
                      </span>
                    )}
                    {rem.timestamp && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock size={10} />
                        {formatRemarkTimestamp(rem.timestamp)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
                onClick={() => setViewingClientRemark(null)}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150"
          onClick={() => setViewingInternalRemarks(null)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-2xl p-6 shadow-2xl border border-slate-200"
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
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <MessageSquare size={16} className="text-slate-600" />
                    Internal Remark History - {viewingInternalRemarks.customerName}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    All internal remarks for this customer ({viewingInternalRemarks.departmentType === 'AUTOMATION_DEPARTMENT' ? 'Automation' : 'Website'})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RefreshButton
                  onRefresh={() => {
                    const { customerId, departmentType } = viewingInternalRemarks
                    setViewingInternalRemarks((prev) => (prev ? { ...prev, loading: true, error: null } : prev))
                    return loadInternalRemarks(customerId, departmentType)
                  }}
                  isRefreshing={viewingInternalRemarks.loading}
                  label="internal remarks"
                />
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  onClick={() => setViewingInternalRemarks(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="py-4 max-h-[60vh] overflow-y-auto space-y-3">
              {viewingInternalRemarks.loading && (
                <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <Loader2 size={24} className="animate-spin text-blue-600" />
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
                viewingInternalRemarks.remarks
                  .slice()
                  .sort((a, b) => {
                    const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0
                    const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0
                    return tB - tA
                  })
                  .map((r, rIdx) => {
                    const badgeColors = [
                      'bg-blue-500',
                      'bg-purple-500',
                      'bg-emerald-500',
                      'bg-indigo-500',
                      'bg-amber-500',
                    ]
                    const colorClass = badgeColors[rIdx % badgeColors.length]
                    return (
                      <div
                        key={rIdx}
                        className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs shadow-xs hover:shadow-md transition-shadow space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-6 w-6 rounded-full flex items-center justify-center ${colorClass} text-white font-bold text-xs flex-shrink-0`}
                            >
                              {rIdx + 1}
                            </div>
                            <span className="font-bold text-slate-900 text-sm">
                              {r.staffName || 'Staff'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {formatRemarkTimestamp(r.timestamp)}
                          </span>
                        </div>
                        <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-slate-800 whitespace-pre-wrap font-normal leading-relaxed text-xs">
                          {r.remark || (r as any).text || '—'}
                        </div>
                      </div>
                    )
                  })}
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
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

      {/* Send Website Draft Modal */}
      {selectedCustomerForDraft && (
        <SendDraftModal
          isOpen={sendDraftModalOpen}
          onClose={handleCloseDraftModal}
          onSubmit={handleSendDraft}
          customerName={
            selectedCustomerForDraft.businessName ||
            selectedCustomerForDraft.ownerName ||
            'Customer'
          }
          customerEmail={selectedCustomerForDraft.email || ''}
          isLoading={isSendingDraft}
        />
      )}

      {/* Website Draft History Modal */}
      {selectedCustomerForDraft && (
        <DraftHistoryModal
          isOpen={draftHistoryModalOpen}
          onClose={handleCloseDraftHistoryModal}
          history={draftHistory}
          isLoading={isLoadingDraftHistory}
          onRefresh={refreshDraftHistory}
          isRefreshing={isRefreshingDraftHistory}
          customerName={
            selectedCustomerForDraft.businessName ||
            selectedCustomerForDraft.ownerName ||
            'Customer'
          }
          customerEmail={selectedCustomerForDraft.email || ''}
        />
      )}

      {/* Sub-Service Validation / Acknowledgment Modal */}
      <SubServiceValidationModal
        open={Boolean(validationModal?.open)}
        type={validationModal?.type || 'incomplete'}
        message={validationModal?.message || 'Please complete subservice'}
        detail={validationModal?.detail}
        subServices={validationModal?.subServices}
        onClose={() => setValidationModal(null)}
      />

      {/* Confirm Website Exists Modal matching Screenshot 2 */}
      {confirmWebsiteExistsTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-150"
          onClick={() => !updatingWebsiteExistsId && setConfirmWebsiteExistsTarget(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <h3 className="text-base font-bold text-slate-900">Confirm Website Exists</h3>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                onClick={() => !updatingWebsiteExistsId && setConfirmWebsiteExistsTarget(null)}
                disabled={Boolean(updatingWebsiteExistsId)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body matching Screenshot 2 */}
            <div className="py-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
              Once turned <strong className="text-amber-600 font-bold">YES</strong> it cannot be turned{' '}
              <strong className="text-slate-900 font-bold">NO</strong>. Are you sure?
            </div>

            {/* Footer Buttons matching Screenshot 2 */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={Boolean(updatingWebsiteExistsId)}
                onClick={() => setConfirmWebsiteExistsTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#f3ede2] hover:bg-[#eae0d0] text-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(updatingWebsiteExistsId)}
                onClick={() => handleConfirmWebsiteExists(confirmWebsiteExistsTarget)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#d97706] hover:bg-[#b45309] text-white transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                {updatingWebsiteExistsId === confirmWebsiteExistsTarget.customerId ? (
                  <>
                    <Loader2 size={13} className="spin" />
                    <span>Confirming...</span>
                  </>
                ) : (
                  <span>Yes, Confirm</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Tags Modal: editable for Department User, read-only for Department Head */}
      {serviceTagsTarget && (
        <ServiceTagsModal
          isOpen={Boolean(serviceTagsTarget)}
          customer={liveServiceTagsCustomer ?? serviceTagsTarget.customer}
          serviceType={serviceTagsTarget.serviceType}
          onRefresh={() => customersQuery.refetch()}
          isRefreshing={customersQuery.isFetching}
          readOnly={!canEditServices}
          onClose={() => setServiceTagsTarget(null)}
          onTagsUpdated={() => {
            customersQuery.refetch()
          }}
        />
      )}
    </div>
  )
}

export default AutowebisionCustomersPage
