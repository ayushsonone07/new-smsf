import { useState, useEffect, useMemo, useRef, type ChangeEvent } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import './CustomersList.css'
import { getSession } from '../../../app/auth/session'
import { useQueryClient } from '@tanstack/react-query'
import { updateCustomer } from '../../../api/customers.api'
import {
  extractBillingCustomers,
  fetchBillingCustomers,
  getBillingInformation,
  getBillingInvoice,
  updateBillingInvoice,
  uploadCustomerBill,
  type BillingCustomer,
} from '../../../api/billing.api'
import { Button } from '../../ui/Button'
import { Icon } from '../shared/Icon'
import { getDuplicateCustomerSummaries } from '../../../api/department-users.api'
import { useCustomerDrawerDetails } from '../../../features/departments/hooks/useCustomerDrawerDetails'
import type {
  OnboardingCustomer,
  OnboardingAssignee,
  OnboardingStatus,
} from './CustomersList'
import type {
  CustomerExportFormat,
  CustomerProfileDetails,
  CustomerRemark,
  CustomerServiceRow,
} from '../../../api/customer-drawer.api'
import { addClientRemark, downloadCustomerExport } from '../../../api/customer-drawer.api'
import {
  CUSTOMER_ACTIVITY_EVENT,
  getCustomerActivities,
  type CustomerActivityEvent,
} from '../../../utils/customerActivity'
import { getRecurringTimeline } from '../../../api/history.api'
import { notifyBillGenerated } from '../../../api/notification-factory'

export interface CustomersListModalProps {
  customer: OnboardingCustomer | null
  assignees: OnboardingAssignee[]
  showStatus?: boolean
  showAssignTo?: boolean
  canEditRemark?: boolean
  departmentType?: string
  onClose: () => void
  /** Optional: when passed, a "Full page" button appears in Personal information */
  onOpenFullPage?: (customer: OnboardingCustomer) => void
  initialTab?: DrawerTab
  /** Fetch only the common customer profile endpoint (used by superadmin). */
  profileOnly?: boolean
  requestUsername?: string
}

type DrawerTab =
  | 'overview'
  | 'duplicates'
  | 'deliverables'
  | 'business-form'
  | 'bill-upload'
  | 'remarks'
  | 'activity'
  | 'recurring'

const STATUS_LABEL: Record<OnboardingStatus, string> = {
  pending: 'Pending',
  'in-progress': 'In progress',
  completed: 'Completed',
}

const SERVICE_DOT_COLORS = [
  '#64748b',
  '#2459e0',
  '#16a34a',
  '#e11d48',
  '#f59e0b',
  '#7c3aed',
  '#0891b2',
]

const PROFILE_FIELD_GROUPS: {
  title: string
  keys: (keyof CustomerProfileDetails)[]
}[] = [
  {
    title: 'Customer & package',
    keys: [
      'ownerName',
      'businessName',
      'email',
      'phone',
      'additionalNumber',
      'plan',
      'isWebinarClient',
      'source',
      'leadType',
    ],
  },
  {
    title: 'Business information',
    keys: [
      'brandName',
      'businessCategory',
      'businessType',
      'customBusinessType',
      'yearStarted',
      'happyCustomers',
      'simpleDescription',
      'workingHours',
      'certifications',
      'partnerBrands',
    ],
  },
  {
    title: 'Address & location',
    keys: [
      'address',
      'area',
      'city',
      'state',
      'zipCode',
      'country',
      'billingAddress',
      'locationKeywords',
    ],
  },
  {
    title: 'Website & online presence',
    keys: [
      'websiteLink',
      'domain',
      'domainStatus',
      'selectedWebsiteTheme',
      'gmbProfileLink',
      'logoLink',
      'imagesLink',
      'socialLinks',
      'websiteSeoKeywords',
      'googleReviewLink',
    ],
  },
  {
    title: 'Marketing & preferences',
    keys: [
      'tonePreference',
      'targetAudience',
      'tagline',
      'month',
      'year',
      'campaignTheme',
      'topProducts',
      'topProblems',
      'topBenefits',
      'monthlyOffer',
      'festiveOffer',
      'mainGoal',
      'appointmentMethod',
      'testimonials',
      'disclaimer',
    ],
  },
  {
    title: 'Links & chatbot',
    keys: [
      'bookingLink',
      'paymentLink',
      'appointmentLink',
      'aiChatbotEmail',
      'aiChatbotLink',
      'faqs',
      'offers',
      'pricing',
      'additionalInstructions',
      'remarks',
    ],
  },
  {
    title: 'Payment & dates',
    keys: [
      'dateOfPayment',
      'paymentLinkSS',
      'generatedBillInfo',
      'amountPaid',
      'amountPending',
      'paymentId',
      'serviceExpiration',
      'lastUpdatedAt',
    ],
  },
]

const FORM_ICON =
  'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5ZM14 3v5h5M9 13h6M9 17h6'
const EXTERNAL_ICON =
  'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'
const HOURGLASS_ICON =
  'M6 2h12M6 22h12M7 2v4a5 5 0 0 0 2 4l3 2-3 2a5 5 0 0 0-2 4v4m10-20v4a5 5 0 0 1-2 4l-3 2 3 2a5 5 0 0 1 2 4v4'

/** Department that is allowed to upload generated bills. */
const BILL_UPLOAD_DEPARTMENT = 'BILLING_DEPARTMENT'
const BILL_FILE_ACCEPT = '.pdf,.doc,.docx,image/*,video/*'

const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
}

const drawerVariants: Variants = {
  hidden: { x: '100%' },
  visible: {
    x: 0,
    transition: { type: 'spring', stiffness: 300, damping: 32, mass: 0.9 },
  },
}

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22 } },
}

/** Shows "—" for empty values */
function show(value?: string) {
  return value && value.trim() ? value : '—'
}

/** Formats a number-ish value as Indian rupees, or returns "—" when empty. */
function formatCurrency(value: unknown) {
  if (value === undefined || value === null || value === '') return '—'
  const amount = Number(String(value).replace(/[^0-9.-]/g, ''))
  if (!Number.isFinite(amount)) return String(value)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function Field({
  label,
  value,
  full = false,
}: {
  label: string
  value?: string
  full?: boolean
}) {
  return (
    <div className={`cl-drawer__field${full ? ' cl-drawer__field--full' : ''}`}>
      <div className="cl-drawer__field-label">{label}</div>
      <div className="cl-drawer__field-value">{show(value)}</div>
    </div>
  )
}

/**
 * Customer Onboarding detail drawer.
 * Takes 40% of the screen width on desktop, 60% on tablet and the full
 * width on phones. Customer details are loaded when the drawer is opened.
 */
export function CustomersListModal({
  customer,
  assignees,
  showStatus: _showStatus = true,
  showAssignTo = true,
  canEditRemark = true,
  departmentType = 'ONBOARDING_DEPARTMENT',
  onClose,
  onOpenFullPage,
  initialTab,
  profileOnly = false,
  requestUsername,
}: CustomersListModalProps) {
  // Billing department opens straight to the Bill Upload tab.
  const defaultDrawerTab: DrawerTab =
    initialTab ??
    (departmentType === BILL_UPLOAD_DEPARTMENT ? 'bill-upload' : 'overview')
  const [activeTab, setActiveTab] = useState<DrawerTab>(defaultDrawerTab)
  const [closing, setClosing] = useState(false)
  const [activeCustomer, setActiveCustomer] = useState<OnboardingCustomer | null>(customer)
  const [isAddingRemark, setIsAddingRemark] = useState(false)
  const [isAddingClientRemark, setIsAddingClientRemark] = useState(false)
  const [editingRemark, setEditingRemark] = useState<string | null>(null)
  const [editingRemarkText, setEditingRemarkText] = useState('')
  const [isSavingRemark, setIsSavingRemark] = useState(false)
  const [editingClientRemark, setEditingClientRemark] = useState<string | null>(null)
  const [editingClientRemarkText, setEditingClientRemarkText] = useState('')
  const [isSavingClientRemark, setIsSavingClientRemark] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportingFormat, setExportingFormat] = useState<CustomerExportFormat | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const [exportError, setExportError] = useState('')
  const [billFile, setBillFile] = useState<File | null>(null)
  const [billUploading, setBillUploading] = useState(false)
  const [billError, setBillError] = useState('')
  const [billSuccess, setBillSuccess] = useState('')
  const [invoice, setInvoice] = useState({
    invoiceNo: '',
    date: '',
    amount: '',
    status: 'PENDING' as string,
    billingLink: '',
  })
  const [invoiceSaving, setInvoiceSaving] = useState(false)
  const [invoiceError, setInvoiceError] = useState('')
  const [invoiceSuccess, setInvoiceSuccess] = useState('')
  const [invoiceDraftId, setInvoiceDraftId] = useState<number | null>(null)
  const billInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const isSuperAdmin = (getSession()?.user.role as string) === 'ADMIN' || (getSession()?.user.role as string) === 'SUPERADMIN'

  const showBillUploadTab = departmentType === BILL_UPLOAD_DEPARTMENT

  const current = activeCustomer ?? customer
  const apiDetails = useCustomerDrawerDetails(current, {
    profileOnly,
    departmentType,
    requestUsername,
  })
  const [localActivities, setLocalActivities] = useState<CustomerActivityEvent[]>([])
  const recurringCustomerId = Number(current?.id)

  const recurringQuery = useQuery({
    queryKey: ['customer-recurring-timeline', current?.id, departmentType],
    queryFn: () =>
      getRecurringTimeline(recurringCustomerId, departmentType || ''),
    enabled:
      Boolean(customer && departmentType && Number.isFinite(recurringCustomerId)) &&
      activeTab === 'recurring',
    staleTime: 15_000,
  })

  useEffect(() => {
    const refreshActivities = () => {
      setLocalActivities(getCustomerActivities(current?.id, current?.phone))
    }
    refreshActivities()
    window.addEventListener(CUSTOMER_ACTIVITY_EVENT, refreshActivities)
    return () => window.removeEventListener(CUSTOMER_ACTIVITY_EVENT, refreshActivities)
  }, [current?.id, current?.phone])

  const [prevCustomerId, setPrevCustomerId] = useState(customer?.id)
  if (customer?.id !== prevCustomerId) {
    setPrevCustomerId(customer?.id)
    setActiveCustomer(customer)
    setActiveTab(defaultDrawerTab)
    setClosing(false)
    setBillFile(null)
    setBillError('')
    setBillSuccess('')
    setInvoiceError('')
    setInvoiceSuccess('')
    setInvoiceDraftId(null)
  }

  // Clear the native file input whenever the drawer switches customers,
  // since its value is uncontrolled and cannot be reset during render.
  useEffect(() => {
    if (billInputRef.current) billInputRef.current.value = ''
  }, [customer?.id])

  useEffect(() => {
    setActiveCustomer((previous) => {
      if (previous?.id === customer?.id) return previous
      return customer
    })
  }, [customer?.id])

  function startClose() {
    setClosing(true)
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false)
      }
    }
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showExportMenu])

  async function handleExport(targetFormat: CustomerExportFormat) {
    const customerId = Number(current?.id)
    if (!Number.isInteger(customerId) || customerId <= 0 || isExporting) return
    setExportError('')
    setIsExporting(true)
    setExportingFormat(targetFormat)
    setShowExportMenu(false)
    try {
      await downloadCustomerExport(customerId, targetFormat)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Unable to export customer.')
    } finally {
      setIsExporting(false)
      setExportingFormat(null)
    }
  }

  async function saveRemarkEdit() {
    if (!canEditRemark || !current?.id || !editingRemarkText.trim() || isSavingRemark) return
    setIsSavingRemark(true)
    try {
      await updateCustomer(current.id, { remark: editingRemarkText.trim(), remarkType: 'INTERNAL', departmentType, serviceType: departmentType === 'AUTOMATION_DEPARTMENT' ? 'AUTOMATION' : departmentType === 'WEBSITE_DEPARTMENT' ? 'WEBSITE' : undefined })
      await queryClient.invalidateQueries({ queryKey: ['customer-drawer-internal-remarks'] })
      await queryClient.invalidateQueries({ queryKey: ['customer-drawer-remarks'] })
      await queryClient.invalidateQueries({ queryKey: ['customer-drawer-details'] })
      setEditingRemark(null)
    } catch (error) {
      console.error('Failed to update remark', error)
    } finally {
      setIsSavingRemark(false)
    }
  }

  async function saveClientRemarkEdit() {
    if (!current?.id || !editingClientRemarkText.trim() || isSavingClientRemark) return
    setIsSavingClientRemark(true)
    try {
      await addClientRemark(current.id, editingClientRemarkText.trim(), departmentType)
      await queryClient.invalidateQueries({ queryKey: ['customer-drawer-review-replies'] })
      await queryClient.invalidateQueries({ queryKey: ['customer-drawer-remarks'] })
      await queryClient.invalidateQueries({ queryKey: ['customer-drawer-details'] })
      setEditingClientRemark(null)
    } catch (error) {
      console.error('Failed to update client remark', error)
    } finally {
      setIsSavingClientRemark(false)
    }
  }

  // Close on Escape key
  useEffect(() => {
    if (!customer) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') startClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [customer, onClose])

  const duplicatesQuery = useQuery({
    queryKey: ['duplicate-customer-summaries', customer?.id ?? 0, departmentType],
    queryFn: () => getDuplicateCustomerSummaries(customer?.id ?? 0, departmentType),
    enabled: Boolean(
      customer &&
        (customer.hasDuplicateCustomer ||
          (customer.duplicateCount && customer.duplicateCount > 0)),
    ),
    staleTime: 60_000,
  })

  const duplicateItems = useMemo(() => {
    const fromApi = duplicatesQuery.data ?? []
    if (fromApi.length > 0) return fromApi
    return customer?.duplicateCustomers ?? []
  }, [duplicatesQuery.data, customer?.duplicateCustomers])

  // Billing lookup key — the backend searches billing customers by owner name,
  // business name, phone number or email.
  const billingSearch = useMemo(() => {
    const phone = (apiDetails.profile?.phone || current?.phone || '').trim()
    const email = (apiDetails.profile?.email || current?.email || '').trim()
    return phone || email
  }, [
    apiDetails.profile?.phone,
    apiDetails.profile?.email,
    current?.phone,
    current?.email,
  ])

  // Billing data is only fetched once the Bill Upload tab is opened.
  const billingQuery = useQuery({
    queryKey: ['customer-drawer-billing', billingSearch],
    queryFn: () =>
      fetchBillingCustomers({ page: 0, size: 10, searchParam: billingSearch }),
    enabled:
      showBillUploadTab && activeTab === 'bill-upload' && billingSearch.length > 0,
    staleTime: 15_000,
  })

  // Match the returned billing record to the opened customer by id, phone or email.
  const billingCustomer = useMemo<BillingCustomer | null>(() => {
    const list = extractBillingCustomers(billingQuery.data)
    if (list.length === 0) return null

    const targetId = String(current?.id ?? '')
    const byId = list.find((item) => String(item.id) === targetId)
    if (byId) return byId

    const digits = (value?: string | null) => (value || '').replace(/\D/g, '')
    const targetPhone = digits(apiDetails.profile?.phone || current?.phone)
    const targetEmail = (apiDetails.profile?.email || current?.email || '')
      .trim()
      .toLowerCase()

    return (
      list.find((item) => {
        const phone = digits(item.phoneNumber) || digits(item.phone as string)
        const email = String(item.email ?? '').trim().toLowerCase()
        return (
          (targetPhone.length > 0 && phone === targetPhone) ||
          (targetEmail.length > 0 && email === targetEmail)
        )
      }) ?? null
    )
  }, [
    billingQuery.data,
    current?.id,
    current?.phone,
    current?.email,
    apiDetails.profile?.phone,
    apiDetails.profile?.email,
  ])

  const billingInfo = useMemo(
    () => getBillingInformation(billingCustomer),
    [billingCustomer],
  )

  const billingErrorMessage =
    billingQuery.error instanceof Error
      ? billingQuery.error.message
      : 'Something went wrong while loading billing details.'

  // Seed the editable invoice draft once per billing record. Re-seeding is
  // keyed on the billing id so background refetches never clobber user edits.
  if (billingCustomer && invoiceDraftId !== billingCustomer.id) {
    const details = getBillingInvoice(billingCustomer)
    setInvoiceDraftId(billingCustomer.id)
    setInvoice({
      invoiceNo: details.invoiceNo || `INV-${billingCustomer.id}`,
      date: details.invoiceDate.slice(0, 10),
      amount: details.invoiceAmount,
      status: details.status,
      billingLink: details.billingLink,
    })
    setInvoiceError('')
    setInvoiceSuccess('')
  }

  function handleBillFileChange(event: ChangeEvent<HTMLInputElement>) {
    setBillFile(event.target.files?.[0] ?? null)
    setBillError('')
    setBillSuccess('')
  }

  async function handleBillUpload() {
    if (!billingCustomer || billUploading) return
    if (!billFile) {
      setBillError('Select a bill file to upload.')
      return
    }

    setBillUploading(true)
    setBillError('')
    setBillSuccess('')
    try {
      await uploadCustomerBill(billingCustomer.id, billFile)
      notifyBillGenerated(billingCustomer)
      const refreshed = await billingQuery.refetch()
      setBillFile(null)
      if (billInputRef.current) billInputRef.current.value = ''
      setBillSuccess('Bill uploaded successfully. The bill status is now Generated.')
      const refreshedCustomer =
        extractBillingCustomers(refreshed.data).find(
          (item) => String(item.id) === String(billingCustomer.id),
        ) ?? billingCustomer
      const details = getBillingInvoice(refreshedCustomer)
      setInvoice((value) => ({
        ...value,
        status: details.status,
        billingLink: details.billingLink || value.billingLink,
      }))
    } catch (error) {
      setBillError(
        error instanceof Error && error.message
          ? error.message
          : 'Failed to upload bill. Please try again.',
      )
    } finally {
      setBillUploading(false)
    }
  }

  async function handleSaveInvoice() {
    if (!billingCustomer || invoiceSaving) return
    const invoiceNo = invoice.invoiceNo.trim()
    if (!invoiceNo) {
      setInvoiceError('Invoice number is required.')
      return
    }
    if (invoice.status === 'GENERATED' && !invoice.billingLink.trim()) {
      setInvoiceError('Billing link is required when status is Generated.')
      return
    }

    setInvoiceSaving(true)
    setInvoiceError('')
    setInvoiceSuccess('')
    try {
      await updateBillingInvoice(billingCustomer.id, {
        invoiceNo,
        invoiceDate: invoice.date,
        invoiceAmount: invoice.amount,
        status: invoice.status,
        billingLink: invoice.billingLink.trim(),
      })
      if (invoice.status === 'GENERATED') notifyBillGenerated(billingCustomer)
      await billingQuery.refetch()
      setInvoiceSuccess("Invoice details saved in the customer's billing details.")
    } catch (error) {
      setInvoiceError(
        error instanceof Error && error.message
          ? error.message
          : 'Failed to save invoice details. Please try again.',
      )
    } finally {
      setInvoiceSaving(false)
    }
  }

  const allBusinesses = useMemo(() => {
    if (!customer) return []
    const mainId = String(customer.id)
    const main = {
      ...customer,
      isMainBusiness: true,
    }
    if (!duplicateItems.length) return [main]
    const others = duplicateItems
      .filter((d: any) => String(d.customerId || d.id || '') !== mainId)
      .map((d: any, index: number) => ({
        ...d,
        id: String(d.duplicateCustomerId || d.customerId || d.id || `${customer.id}-dup-${index}`),
        businessName: d.businessName || d.customerDetails?.businessName || d.brandName || 'Business',
        contactName: d.ownerName || d.customerDetails?.ownerName || customer.contactName,
        contactDate: d.createdAt || customer.contactDate,
        phone: d.phoneNumber || d.phone || d.contact || d.customerDetails?.phoneNumber || customer.phone,
        email: d.email || d.customerDetails?.email || customer.email,
        status: toOnboardingStatus(d.onboardingStatus || d.completeServiceStatus || d.status) || 'pending',
        gstNumber: d.gstNumber || d.customerDetails?.gstNumber,
        isMainBusiness: false,
      }))
    return [main, ...others]
  }, [customer, duplicateItems])

  const completedBusinessesCount = useMemo(() => {
    return allBusinesses.filter((b) => {
      const st = b.status || (b as any).onboardingStatus
      return st === 'completed' || String(st).toUpperCase() === 'COMPLETED'
    }).length
  }, [allBusinesses])

  const assignee =
    assignees.find((a) => a.id === current?.assigneeId) ?? null

  const customerServiceRows = apiDetails.serviceRows.filter(
    (row) => String(row.customerId) === String(current?.id),
  )
  const relevantServiceRows = customerServiceRows.length > 0
    ? customerServiceRows
    : apiDetails.serviceRows
  const serviceRow = relevantServiceRows[0]
  const rowDetails = serviceRow?.customerDetails
  const profile = apiDetails.profile
  interface DrawerDepartmentServiceItem {
    name: string
    status?: OnboardingStatus
    row?: CustomerServiceRow
  }

  const services: DrawerDepartmentServiceItem[] = useMemo(() => {
    if (serviceRow?.departmentStatuses != null) {
      return getDepartmentServices(
        serviceRow.departmentStatuses,
        serviceRow,
        departmentType,
      )
    }

    // Fallback 1: current.subServiceInfo (e.g. Automation / Website sub-services)
    if (Array.isArray(current?.subServiceInfo) && current.subServiceInfo.length > 0) {
      return current.subServiceInfo.map((sub: any): DrawerDepartmentServiceItem => {
        const name = sub?.name || (typeof sub === 'object' ? Object.keys(sub)[0] : String(sub))
        const status = sub?.status || (typeof sub === 'object' ? Object.values(sub)[0] : 'pending')
        return {
          name: formatServiceName(String(name)),
          status: toOnboardingStatus(String(status)),
          row: undefined,
        }
      })
    }

    // Fallback 2: current.services
    if (Array.isArray(current?.services) && current.services.length > 0) {
      return current.services.map((s: any): DrawerDepartmentServiceItem => {
        const name = s?.serviceType || s?.name || 'Service'
        const status = s?.status || 'pending'
        return {
          name: formatServiceName(String(name)),
          status: toOnboardingStatus(String(status)),
          row: undefined,
        }
      })
    }

    // Fallback 3: rawCustomer customerServices or current.customerServices
    const raw = current?.rawCustomer as any
    const rawCustomerServices = raw?.customerServices || (current as any)?.customerServices
    if (Array.isArray(rawCustomerServices) && rawCustomerServices.length > 0) {
      return rawCustomerServices.map((cs: any): DrawerDepartmentServiceItem => {
        const name = cs?.serviceType || cs?.name || 'Service'
        const status = cs?.status || (cs?.isServiceActive ? 'completed' : 'pending')
        return {
          name: formatServiceName(String(name)),
          status: toOnboardingStatus(String(status)) || current?.status,
          row: undefined,
        }
      })
    }

    // Fallback 4: rawCustomer serviceTypes
    if (Array.isArray(raw?.serviceTypes) && raw.serviceTypes.length > 0) {
      return raw.serviceTypes.map((st: string): DrawerDepartmentServiceItem => ({
        name: formatServiceName(st),
        status: current?.status,
        row: undefined,
      }))
    }

    // Fallback 5: superAdminRemarks departments
    if (Array.isArray(apiDetails.superAdminRemarks?.departments) && apiDetails.superAdminRemarks!.departments.length > 0) {
      return apiDetails.superAdminRemarks!.departments.map((dept): DrawerDepartmentServiceItem => ({
        name: formatServiceName(dept.serviceType || dept.departmentType),
        status: current?.status || 'pending',
        row: undefined,
      }))
    }

    // Fallback 6: Comma-separated packageName (e.g. "Only Google, Only WhatsApp, Google+Website")
    const pkg = current?.packageName || raw?.packageName || apiDetails.profile?.packageName
    if (pkg && typeof pkg === 'string' && pkg.includes(',')) {
      const parts = pkg.split(',').map((p) => p.trim()).filter(Boolean)
      if (parts.length > 0) {
        return parts.map((part): DrawerDepartmentServiceItem => ({
          name: formatServiceName(part),
          status: current?.status || 'pending',
          row: undefined,
        }))
      }
    }

    if (current?.serviceType && current.serviceType !== '—') {
      return [{
        name: formatServiceName(current.serviceType),
        status: current?.status,
        row: undefined,
      }]
    }

    return []
  }, [serviceRow, departmentType, current, apiDetails.superAdminRemarks, apiDetails.profile?.packageName])

  const hasDepartmentServiceSummary =
    serviceRow?.departmentStatuses != null || services.length > 0
  const doneCount = services.filter((s) => s.status === 'completed').length
  const internalRemarkEntries = useMemo(() => {
    const list =
      apiDetails.internalRemarks && apiDetails.internalRemarks.length > 0
        ? apiDetails.internalRemarks
        : (apiDetails.remarks?.internalRemark ?? [])
    return list.map((remark) => ({ category: 'Internal', remark }))
  }, [apiDetails.internalRemarks, apiDetails.remarks?.internalRemark])

  const clientRemarkEntries = useMemo(() => {
    if (isSuperAdmin) {
      return (apiDetails.superAdminRemarks?.departments ?? []).flatMap((department) =>
        department.clientRemarks.map((remark) => ({
          category: 'Client',
          departmentType: department.departmentType,
          remark,
        })),
      )
    }
    const clientReplies = (apiDetails.reviewReplies ?? []).map((r) => ({
      remark: r.reply,
      timestamp: r.timestamp,
      staffName: r.staffName,
    }))
    const list =
      clientReplies.length > 0
        ? clientReplies
        : (apiDetails.remarks?.clientRemark ?? [])
    return list.map((remark) => ({ category: 'Client', remark }))
  }, [isSuperAdmin, apiDetails.superAdminRemarks?.departments, apiDetails.reviewReplies, apiDetails.remarks?.clientRemark])

  const onboardingRemarkEntries = useMemo(() => {
    const list: CustomerRemark[] = isSuperAdmin
      ? [...(apiDetails.superAdminRemarks?.customerRemarks ?? [])]
      : [
          ...(apiDetails.remarks?.departmentRemark ?? []),
          ...(apiDetails.remarks?.fifteenDayMeetingRemark ?? []),
        ]
    if (apiDetails.profile?.remarks && typeof apiDetails.profile.remarks === 'string') {
      list.push({
        remark: apiDetails.profile.remarks,
        staffName: 'Form Submission',
        timestamp: apiDetails.profile.lastUpdatedAt || '',
      })
    }
    return list.map((remark) => ({ category: 'Onboarding', remark }))
  }, [
    apiDetails.remarks?.departmentRemark,
    apiDetails.remarks?.fifteenDayMeetingRemark,
    apiDetails.superAdminRemarks?.customerRemarks,
    apiDetails.profile?.remarks,
    apiDetails.profile?.lastUpdatedAt,
    isSuperAdmin,
  ])

  const remarkEntries = useMemo(() => {
    return [
      ...(isSuperAdmin ? [] : internalRemarkEntries),
      ...clientRemarkEntries,
      ...onboardingRemarkEntries,
    ].sort(
      (a, b) =>
        (Date.parse(b.remark.timestamp || '') || 0) -
        (Date.parse(a.remark.timestamp || '') || 0),
    )
  }, [isSuperAdmin, internalRemarkEntries, clientRemarkEntries, onboardingRemarkEntries])

  const customerRemarks = clientRemarkEntries
  const internalRemarks = internalRemarkEntries
  const remarkCount =
    remarkEntries.length ||
    Number(
      Boolean(rowDetails?.remark || serviceRow?.internalRemark || current?.remark),
    )
  const contactName =
    apiDetails.profile?.ownerName || rowDetails?.ownerName || current?.contactName || ''
  const businessName =
    apiDetails.profile?.businessName ||
    rowDetails?.businessName ||
    current?.businessName ||
    ''
  const fullAddress =
    apiDetails.profile?.address ||
    apiDetails.profile?.billingAddress ||
    rowDetails?.address ||
    [
      apiDetails.profile?.area,
      apiDetails.profile?.city,
      apiDetails.profile?.state,
      apiDetails.profile?.zipCode,
      apiDetails.profile?.country,
    ]
      .filter(Boolean)
      .join(', ')
  const updates = [
    {
      title: 'Customer registered',
      detail: businessName,
      timestamp: current?.contactDate || '',
    },
    ...apiDetails.reviewReplies.map((reply) => ({
      title: 'Review reply added',
      detail: reply.reply,
      timestamp: reply.timestamp,
    })),
    ...remarkEntries.map(({ category, remark }) => ({
      title: `${category} remark added`,
      detail: remark.remark || '',
      timestamp: remark.timestamp || '',
    })),
    ...buildServiceStatusUpdates(relevantServiceRows),
    ...localActivities.map((activity) => {
      const department = formatServiceName(
        activity.departmentType.replace(/_DEPARTMENT$/i, ''),
      )
      return {
        title: activity.kind === 'call-initiated'
          ? `${department} call initiated`
          : `${department} email sent`,
        detail: activity.detail,
        timestamp: activity.timestamp,
      }
    }),
  ].sort(
    (a, b) =>
      (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0),
  )
  const hasBusinessForm = Boolean(
    apiDetails.profile &&
      Object.values(apiDetails.profile).some(
        (value) => typeof value === 'string' && value.trim().length > 0,
      ),
  )
  const initialLetter = (
    contactName || businessName || 'C'
  )
    .trim()
    .charAt(0)
    .toUpperCase()

  const allTabs: { id: DrawerTab; label: string; count?: number }[] = [
    ...(showBillUploadTab
      ? [{ id: 'bill-upload' as DrawerTab, label: 'Bill Upload' }]
      : []),
    { id: 'overview', label: 'Overview' },
    ...(duplicateItems.length > 0
      ? [
          {
            id: 'duplicates' as DrawerTab,
            label: 'Duplicate businesses',
            count: duplicateItems.length,
          },
        ]
      : []),
    {
      id: 'deliverables',
      label: 'Deliverables',
      count:
        apiDetails.serviceRowsLoading || !hasDepartmentServiceSummary
          ? undefined
          : services.length,
    },
    { id: 'business-form', label: 'Business form' },
    { id: 'remarks', label: 'Remarks', count: remarkEntries.length },
    { id: 'activity', label: 'Updates', count: updates.length },
    {
      id: 'recurring',
      label: 'Recurring',
      count: recurringQuery.data?.events.length,
    },
  ]
  const tabs = profileOnly
    ? allTabs.filter((tab) =>
        tab.id === 'overview' || tab.id === 'business-form' || tab.id === 'recurring')
    : allTabs

  useEffect(() => {
    if (profileOnly && !['overview', 'business-form', 'recurring'].includes(activeTab)) {
      setActiveTab('overview')
    } else if (activeTab === 'bill-upload' && !showBillUploadTab) {
      setActiveTab('overview')
    }
  }, [activeTab, profileOnly, showBillUploadTab])

  if (!customer || !current) return null

  return (
    <>
      <motion.div
        className="cl-drawer-overlay"
        onClick={startClose}
        role="presentation"
        variants={overlayVariants}
        initial="hidden"
        animate={closing ? 'hidden' : 'visible'}
      />

      <motion.div
        className="cl-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Customer details for ${contactName}`}
        variants={drawerVariants}
        initial="hidden"
        animate={closing ? 'hidden' : 'visible'}
        onAnimationComplete={(definition) => {
          if (closing && definition === 'hidden') onClose()
        }}
      >
        {/* Header */}
        <div className="cl-drawer__header">
          <button
            type="button"
            className="cl-drawer__close"
            onClick={startClose}
            aria-label="Close drawer"
          >
            ×
          </button>

          <motion.div
            className="cl-drawer__name-row"
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.16 }}
          >
            <div className="cl-drawer__avatar">{initialLetter}</div>
            <div className="cl-drawer__name-text">
              <div className="cl-drawer__name-header">
                <h2>{contactName}</h2>
                {current.contactDate && (
                  <span className="cl-drawer__date-time">
                    {current.contactDate}
                  </span>
                )}
                {isSuperAdmin && (
                  <div
                    ref={exportMenuRef}
                    className="cl-drawer__export-container"
                  >
                    <button
                      type="button"
                      className={`cl-drawer__export-btn ${showExportMenu ? 'cl-drawer__export-btn--active' : ''}`}
                      onClick={() => setShowExportMenu((prev) => !prev)}
                      disabled={isExporting || !Number.isInteger(Number(current?.id))}
                      aria-expanded={showExportMenu}
                      aria-haspopup="true"
                      title={
                        isExporting
                          ? `Exporting ${exportingFormat ? exportingFormat.toUpperCase() : ''}…`
                          : 'Export complete customer report'
                      }
                    >
                      <Icon name="download" size={15} />
                    </button>

                    <AnimatePresence>
                      {showExportMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          className="cl-drawer__export-menu"
                          role="menu"
                        >
                          <div className="cl-drawer__export-menu-header">
                            <span>CHOOSE EXPORT FORMAT</span>
                          </div>

                          <button
                            type="button"
                            className="cl-drawer__export-menu-item"
                            role="menuitem"
                            onClick={() => void handleExport('xlsx')}
                          >
                            <div className="cl-drawer__export-menu-icon cl-drawer__export-menu-icon--excel">
                              📊
                            </div>
                            <div className="cl-drawer__export-menu-text">
                              <strong>Excel Spreadsheet (.xlsx)</strong>
                              <span>Structured multi-sheet workbook with Financials & Services</span>
                            </div>
                          </button>

                          <button
                            type="button"
                            className="cl-drawer__export-menu-item"
                            role="menuitem"
                            onClick={() => void handleExport('pdf')}
                          >
                            <div className="cl-drawer__export-menu-icon cl-drawer__export-menu-icon--pdf">
                              📄
                            </div>
                            <div className="cl-drawer__export-menu-text">
                              <strong>PDF Document (.pdf)</strong>
                              <span>Executive Dossier with customer summary & status tables</span>
                            </div>
                          </button>

                          <button
                            type="button"
                            className="cl-drawer__export-menu-item"
                            role="menuitem"
                            onClick={() => void handleExport('json')}
                          >
                            <div className="cl-drawer__export-menu-icon cl-drawer__export-menu-icon--json">
                              📦
                            </div>
                            <div className="cl-drawer__export-menu-text">
                              <strong>JSON Data (.json)</strong>
                              <span>Clean structured developer payload</span>
                            </div>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {exportError && (
                      <span role="alert" className="cl-drawer__export-error">
                        {exportError}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <span>{businessName}</span>
            </div>
          </motion.div>

          {showAssignTo && (
            <motion.div
              className="cl-drawer__status-pills"
              variants={fadeUpVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.22 }}
            >
              <span className="cl-drawer__spill cl-drawer__spill--info">
                Service user:{' '}
                {serviceRow?.assignedUserEmail ||
                  serviceRow?.assignedUserName ||
                  assignee?.name ||
                  'Unassigned'}
              </span>
            </motion.div>
          )}
        </div>

        {/* Body */}
        <div className="cl-drawer__body">
          {(apiDetails.isLoading || apiDetails.errors.length > 0) && (
            <div
              className="cl-drawer__card"
              role={apiDetails.errors.length > 0 ? 'alert' : 'status'}
            >
              {apiDetails.isLoading && <p>Loading customer details...</p>}
              {apiDetails.errors.length > 0 && (
                <div>
                  <strong>Some customer details could not be loaded:</strong>
                  <ul>
                    {apiDetails.errors.map((error, index) => (
                      <li key={`${error}-${index}`}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Duplicate businesses switcher */}
          {(allBusinesses.length > 1 || duplicatesQuery.isLoading) && (
            <div className="cl-drawer__dup-banner">
              <div className="cl-drawer__dup-head">
                <div className="cl-drawer__dup-title">
                  <Icon name="link" size={14} />
                  <span>
                    Same founder · {allBusinesses.length}{' '}
                    {allBusinesses.length === 1 ? 'business' : 'businesses'}
                  </span>
                </div>
                <div className="cl-drawer__dup-sub">
                  {completedBusinessesCount} of {allBusinesses.length} completed
                </div>
              </div>

              {duplicatesQuery.isLoading && allBusinesses.length <= 1 ? (
                <div className="cl-drawer__dup-loading">
                  Checking duplicate businesses…
                </div>
              ) : (
                <div className="cl-drawer__dup-scroll">
                  {allBusinesses.map((biz) => {
                    const isSelected =
                      String(biz.id) === String(activeCustomer?.id)
                    const bizStatus = biz.status || 'pending'
                    const dotColor =
                      bizStatus === 'completed'
                        ? '#16a34a'
                        : bizStatus === 'in-progress'
                          ? '#2459e0'
                          : '#ffc629'
                    const statusText =
                      bizStatus === 'completed'
                        ? 'Completed'
                        : bizStatus === 'in-progress'
                          ? 'In progress'
                          : 'Pending'
                    const rawTitle = biz.businessName || 'Business'
                    const title = biz.isMainBusiness
                      ? `Main · ${rawTitle}`
                      : rawTitle
                    const subtitle = `${statusText} · form by ${biz.isMainBusiness ? 'Founder' : 'Branch manager'}`

                    return (
                      <button
                        key={String(biz.id)}
                        type="button"
                        onClick={() => setActiveCustomer(biz as any)}
                        className={`cl-drawer__dup-btn${isSelected ? ' is-selected' : ''}`}
                      >
                        <div className="cl-drawer__dup-btn-head">
                          <span
                            className="cl-drawer__dup-dot"
                            style={{
                              background:
                                isSelected && dotColor === '#2459e0'
                                  ? '#93c5fd'
                                  : dotColor,
                            }}
                          />
                          <span
                            className="cl-drawer__dup-btn-title"
                            title={title}
                          >
                            {title}
                          </span>
                        </div>
                        <div className="cl-drawer__dup-btn-sub">
                          {subtitle}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="cl-drawer__dup-footer">
                Founder name, phone, email, GST and logo are pre-filled from
                the main business. Each business has its own package and
                onboarding. New businesses on {activeCustomer?.phone || customer.phone || 'founder phone'} go straight to {assignee?.name || 'Assigned user'} — round robin is skipped.
              </div>
            </div>
          )}

          {/* Department statistics are unavailable to a Superadmin profile-only request. */}
          {!profileOnly && <div className="cl-drawer__stats">
            <div className="cl-drawer__stat">
              <div className="cl-drawer__stat-label">Services</div>
              <div className="cl-drawer__stat-value">
                {apiDetails.serviceRowsLoading
                  ? '—/—'
                  : hasDepartmentServiceSummary
                    ? `${doneCount}/${services.length}`
                    : '—/—'}
              </div>
              <div className="cl-drawer__stat-sub">
                {hasDepartmentServiceSummary ? 'completed' : 'summary unavailable'}
              </div>
            </div>
            <div className="cl-drawer__stat">
              <div className="cl-drawer__stat-label">Activity</div>
              <div className="cl-drawer__stat-value">{updates.length}</div>
              <div className="cl-drawer__stat-sub">recorded updates</div>
            </div>
            <div className="cl-drawer__stat">
              <div className="cl-drawer__stat-label">Remarks</div>
              <div className="cl-drawer__stat-value">{remarkCount}</div>
              <div className="cl-drawer__stat-sub">
                {isSuperAdmin
                  ? `${customerRemarks.length} client · ${onboardingRemarkEntries.length} customer`
                  : `${customerRemarks.length} customer · ${internalRemarks.length} internal`}
              </div>
            </div>
          </div>}

          {/* Tabs */}
          <div className="cl-drawer__tabs" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`cl-drawer__tab-btn${
                  activeTab === tab.id ? ' is-active' : ''
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {tab.count !== undefined ? (
                  <span className="cl-drawer__tab-count">{tab.count}</span>
                ) : null}
              </button>
            ))}
          </div>

          {/* Overview */}
          {activeTab === 'overview' && (
            <motion.div
              className="cl-drawer__stack"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="cl-drawer__card">
                <div className="cl-drawer__card-head">
                  <h3>Personal information</h3>
                  {onOpenFullPage && (
                    <button
                      type="button"
                      className="cl-drawer__outline-btn"
                      onClick={() => onOpenFullPage(customer)}
                    >
                      <Icon name="eye" d={EXTERNAL_ICON} size={13} strokeWidth={2} />
                      Full page
                    </button>
                  )}
                </div>

                <div className="cl-drawer__fields">
                  <Field label="Full name" value={contactName} />
                  <Field label="Business name" value={businessName} />
                  <Field
                    label="Phone"
                    value={
                      apiDetails.profile?.phone ||
                      rowDetails?.phoneNumber ||
                      customer.phone
                    }
                  />
                  <Field
                    label="Email"
                    value={
                      apiDetails.profile?.email ||
                      rowDetails?.email ||
                      customer.email
                    }
                  />
                  <Field label="Address" value={fullAddress} full />
                  <Field
                    label="Package"
                    value={
                      apiDetails.profile?.packageName ||
                      apiDetails.profile?.plan ||
                      customer.packageName
                    }
                    full
                  />
                  <Field
                    label="GST"
                    value={
                      apiDetails.profile?.gstNumber ||
                      rowDetails?.gstNumber ||
                      customer.gstNumber
                    }
                  />
                  <Field
                    label="Service expiry"
                    value={
                      apiDetails.profile?.serviceExpiration ||
                      serviceRow?.serviceExpiration ||
                      customer.serviceMonths
                    }
                  />
                  <Field
                    label="Amount paid"
                    value={formatCurrency(
                      apiDetails.profile?.amountPaid || rowDetails?.amountPaid
                    )}
                  />
                  <Field
                    label="Amount pending"
                    value={formatCurrency(
                      apiDetails.profile?.amountPending ||
                      rowDetails?.amountPending
                    )}
                  />
                  <Field
                    label="Sales person"
                    value={
                      serviceRow?.assignedUserName ||
                      serviceRow?.assignedUserEmail ||
                      customer.salesPerson
                    }
                  />
                  <Field
                    label="Assigned to"
                    value={assignee?.name || serviceRow?.assignedUserName}
                  />
                </div>
              </div>

              <div className="cl-drawer__card">
                <div className="cl-drawer__card-head">
                  <h3>Included services</h3>
                  <span className="cl-drawer__card-meta">
                    {hasDepartmentServiceSummary
                      ? `${doneCount}/${services.length} completed`
                      : 'Summary unavailable'}
                  </span>
                </div>

                {!hasDepartmentServiceSummary ? (
                  <div className="cl-drawer__card-meta">
                    Service status summary was not returned by the backend.
                  </div>
                ) : services.length === 0 ? (
                  <div className="cl-drawer__card-meta">
                    No services added yet.
                  </div>
                ) : (
                  <ul className="cl-drawer__services">
                    {services.map((service, idx) => (
                      <li key={`${service.name}-${idx}`} className="cl-drawer__service">
                        <span
                          className="cl-drawer__service-dot"
                          style={{
                            background:
                              SERVICE_DOT_COLORS[idx % SERVICE_DOT_COLORS.length],
                          }}
                        />
                        <span className="cl-drawer__service-name">
                          {service.name}
                        </span>
                        <span
                          className={`cl-drawer__service-pill cl-drawer__service-pill--${service.status ?? 'unavailable'}`}
                        >
                          {service.status
                            ? STATUS_LABEL[service.status]
                            : 'Status unavailable'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          )}

          {/* Remarks */}
          {activeTab === 'remarks' && (
            <motion.div
              className="cl-drawer__remarks"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Status summary pill header */}
                <div className="cl-drawer__remarks-summary">
                  <div className="cl-drawer__remarks-pills">
                    {!isSuperAdmin && (
                      <span className="cl-drawer__remarks-summary-pill cl-drawer__remarks-summary-pill--internal">
                        Internal ({internalRemarkEntries.length})
                      </span>
                    )}
                    <span className="cl-drawer__remarks-summary-pill cl-drawer__remarks-summary-pill--client">
                      Client ({clientRemarkEntries.length})
                    </span>
                    <span className="cl-drawer__remarks-summary-pill cl-drawer__remarks-summary-pill--onboarding">
                      Customer ({onboardingRemarkEntries.length})
                    </span>
                  </div>
                </div>

                {/* Section 1: Internal Remarks */}
                {!isSuperAdmin && <div className="cl-drawer__remark-section">
                  {canEditRemark && getSession()?.user.role !== 'CUSTOMER' && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault()
                        const form = e.target as HTMLFormElement
                        const input = form.elements.namedItem('newRemark') as HTMLInputElement
                        const value = input.value.trim()
                        if (!value || isAddingRemark) return
                        
                        setIsAddingRemark(true)
                        try {
                          await updateCustomer(current.id, { remark: value, remarkType: 'INTERNAL', departmentType, serviceType: departmentType === 'AUTOMATION_DEPARTMENT' ? 'AUTOMATION' : departmentType === 'WEBSITE_DEPARTMENT' ? 'WEBSITE' : undefined })
                          await queryClient.invalidateQueries({ queryKey: ['customer-drawer-internal-remarks'] })
                          await queryClient.invalidateQueries({ queryKey: ['customer-drawer-details'] })
                          await queryClient.invalidateQueries({ queryKey: ['customer-drawer-remarks'] })
                          input.value = ''
                        } catch (err) {
                          console.error('Failed to add remark', err)
                        } finally {
                          setIsAddingRemark(false)
                        }
                      }}
                      style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}
                    >
                      <input
                        name="newRemark"
                        type="text"
                        placeholder="Add internal remark..."
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '13px',
                        }}
                        disabled={isAddingRemark}
                      />
                      <Button type="submit" disabled={isAddingRemark}>
                        {isAddingRemark ? 'Adding...' : 'Add'}
                      </Button>
                    </form>
                  )}

                  <RemarkGroup
                    title="Internal Remarks"
                    badge="Team only"
                    emptyMessage="No internal remarks recorded."
                    entries={internalRemarkEntries}
                    fallback={
                      current.remark ||
                      rowDetails?.remark ||
                      serviceRow?.internalRemark
                    }
                    internal
                    editable={canEditRemark}
                    editingRemark={editingRemark}
                    editingRemarkText={editingRemarkText}
                    onEdit={(remark) => { setEditingRemark(remark.timestamp || remark.remark || 'remark'); setEditingRemarkText(remark.remark || '') }}
                    onEditTextChange={setEditingRemarkText}
                    onCancelEdit={() => setEditingRemark(null)}
                    onSaveEdit={saveRemarkEdit}
                    isSavingRemark={isSavingRemark}
                    pageSize={4}
                  />
                </div>}

                {/* Section 2: Client Remarks */}
                <div className="cl-drawer__remark-section">
                  {!isSuperAdmin && getSession()?.user.role !== 'CUSTOMER' && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault()
                        const form = e.target as HTMLFormElement
                        const input = form.elements.namedItem('newClientRemark') as HTMLInputElement
                        const value = input.value.trim()
                        if (!value || isAddingClientRemark || !current?.id) return

                        setIsAddingClientRemark(true)
                        try {
                          await addClientRemark(current.id, value, departmentType)
                          await queryClient.invalidateQueries({ queryKey: ['customer-drawer-remarks'] })
                          await queryClient.invalidateQueries({ queryKey: ['customer-drawer-review-replies'] })
                          await queryClient.invalidateQueries({ queryKey: ['customer-drawer-details'] })
                          input.value = ''
                        } catch (err) {
                          console.error('Failed to add client remark', err)
                        } finally {
                          setIsAddingClientRemark(false)
                        }
                      }}
                      style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}
                    >
                      <input
                        name="newClientRemark"
                        type="text"
                        placeholder="Add client remark..."
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '13px',
                        }}
                        disabled={isAddingClientRemark}
                      />
                      <Button type="submit" disabled={isAddingClientRemark}>
                        {isAddingClientRemark ? 'Adding...' : 'Add'}
                      </Button>
                    </form>
                  )}
                  {isSuperAdmin ? (
                    (apiDetails.superAdminRemarks?.departments.length ?? 0) > 0 ? (
                      apiDetails.superAdminRemarks?.departments.map((department) => (
                        <RemarkGroup
                          key={`${department.departmentType}-${department.serviceType}`}
                          title={formatFieldLabel(department.departmentType)}
                          pageSize={4}
                          badge={formatServiceName(department.serviceType)}
                          emptyMessage="No client remarks recorded."
                          entries={department.clientRemarks.map((remark) => ({ category: 'Client', remark }))}
                        />
                      ))
                    ) : (
                      <p className="cl-drawer__empty">No client remarks recorded.</p>
                    )
                  ) : (
                    <RemarkGroup
                      title="Client Remarks"
                      pageSize={4}
                      badge="Customer replies"
                      emptyMessage="No client remarks recorded."
                      entries={clientRemarkEntries}
                      editable
                      editingRemark={editingClientRemark}
                      editingRemarkText={editingClientRemarkText}
                      onEdit={(remark) => {
                        setEditingClientRemark(remark.timestamp || remark.remark || 'remark')
                        setEditingClientRemarkText(remark.remark || '')
                      }}
                      onEditTextChange={setEditingClientRemarkText}
                      onCancelEdit={() => setEditingClientRemark(null)}
                      onSaveEdit={saveClientRemarkEdit}
                      isSavingRemark={isSavingClientRemark}
                    />
                  )}
                </div>

                {/* Section 3: Customer Remarks */}
                <div className="cl-drawer__remark-section">
                  <RemarkGroup
                    title="Customer Remarks"
                    pageSize={4}
                    badge="Department & meetings"
                    emptyMessage="No customer remarks recorded."
                    entries={onboardingRemarkEntries}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Business form */}
          {activeTab === 'business-form' && (
            <motion.div
              className="cl-drawer__card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="cl-drawer__card-head">
                <div>
                  <h3>Business information form</h3>
                  <p className="cl-drawer__card-meta">
                    Filed by the customer from the requirement link.
                  </p>
                </div>
                <span
                  className={`cl-drawer__form-badge${hasBusinessForm ? ' is-submitted' : ''}`}
                >
                  {hasBusinessForm ? 'Submitted' : 'Not submitted'}
                </span>
              </div>
              {profile ? (
                <div className="cl-drawer__profile-sections">
                  {getProfileSections(profile).map((section) => (
                    <section key={section.title}>
                      <h4>{section.title}</h4>
                      <div className="cl-drawer__form-rows">
                        {section.entries.map(([key, value]) => (
                          <FormRow
                            key={key}
                            label={formatFieldLabel(key)}
                            value={formatProfileValue(key, value)}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <p className="cl-drawer__empty">
                  {apiDetails.isLoading
                    ? 'Loading business form...'
                    : 'No business form details were returned.'}
                </p>
              )}
              {customer.formUrl && (
                <button
                  type="button"
                  className="cl-drawer__form-link"
                  onClick={() =>
                    window.open(customer.formUrl, '_blank', 'noopener,noreferrer')
                  }
                >
                  <Icon name="eye" d={FORM_ICON} size={13} strokeWidth={2} />
                  Open original form
                </button>
              )}
            </motion.div>
          )}

          {/* Bill upload (Billing department only) */}
          {activeTab === 'bill-upload' && showBillUploadTab && (
            <motion.div
              className="cl-drawer__stack"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="cl-drawer__card">
                <div className="cl-drawer__card-head">
                  <div>
                    <h3>Bill upload</h3>
                    <p className="cl-drawer__card-meta">
                      Upload the generated bill for {contactName || 'this customer'}.
                    </p>
                  </div>
                  {billingCustomer && (
                    <span
                      className={`cl-drawer__bill-status cl-drawer__bill-status--${billingInfo.billStatus.toLowerCase()}`}
                    >
                      <Icon
                        name={billingInfo.isGenerated ? 'done' : 'hourglass'}
                        size={13}
                        strokeWidth={2}
                      />
                      {billingInfo.billStatusLabel}
                    </span>
                  )}
                </div>

                {billingQuery.isLoading ? (
                  <p className="cl-drawer__empty">Loading billing details…</p>
                ) : billingQuery.isError ? (
                  <div
                    className="cl-drawer__bill-notice cl-drawer__bill-notice--error"
                    role="alert"
                  >
                    <strong>Unable to load billing details</strong>
                    <span>{billingErrorMessage}</span>
                    <button
                      type="button"
                      className="cl-drawer__outline-btn"
                      onClick={() => billingQuery.refetch()}
                    >
                      <Icon name="refresh" size={13} strokeWidth={2} />
                      Try again
                    </button>
                  </div>
                ) : !billingSearch ? (
                  <p className="cl-drawer__empty">
                    This customer has no phone number or email, so billing details
                    could not be requested.
                  </p>
                ) : !billingCustomer ? (
                  <div className="cl-drawer__bill-empty">
                    <p className="cl-drawer__empty">
                      No billing record was found for this customer.
                    </p>
                    <button
                      type="button"
                      className="cl-drawer__outline-btn"
                      disabled={billingQuery.isFetching}
                      onClick={() => billingQuery.refetch()}
                    >
                      <Icon name="refresh" size={13} strokeWidth={2} />
                      {billingQuery.isFetching ? 'Refreshing…' : 'Refresh'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="cl-drawer__fields">
                      <Field
                        label="Customer name"
                        value={billingCustomer.ownerName}
                      />
                      <Field
                        label="Business name"
                        value={billingCustomer.businessName}
                      />
                      <Field
                        label="Customer email"
                        value={billingCustomer.email}
                        full
                      />
                      <Field
                        label="Information status"
                        value={billingInfo.informationStatusLabel}
                      />
                      <Field
                        label="Bill status"
                        value={billingInfo.billStatusLabel}
                      />
                    </div>

                    <div className="cl-drawer__bill-upload">
                      {/* <label className="cl-drawer__bill-drop">
                        <Icon name="upload" size={22} strokeWidth={1.8} />
                        <strong>
                          {billFile
                            ? billFile.name
                            : billingInfo.billUrl
                              ? 'Choose a replacement bill file'
                              : 'Choose a bill file'}
                        </strong>
                        <span>PDF, DOC, DOCX, image or video</span>
                        <input
                          ref={billInputRef}
                          type="file"
                          accept={BILL_FILE_ACCEPT}
                          disabled={billUploading}
                          onChange={handleBillFileChange}
                        />
                      </label> */}

                      <label className={`cl-drawer__bill-drop${billFile ? ' has-file' : ''}${billUploading ? ' is-disabled' : ''}`}>
                        <Icon name="upload" size={20} strokeWidth={1.8} />
                        <span className="cl-drawer__bill-drop-text">
                          <strong title={billFile?.name}>
                            {billFile ? billFile.name : 'Upload document here'}
                          </strong>
                          <span>
                            {billFile
                              ? 'Click to choose a different file'
                              : billingInfo.billUrl
                                ? 'Choose a replacement · PDF, DOC, DOCX, image or video'
                                : 'PDF, DOC, DOCX, image or video'}
                          </span>
                        </span>
                        <span className="cl-drawer__bill-drop-btn">Browse</span>
                        <input
                          ref={billInputRef}
                          type="file"
                          accept={BILL_FILE_ACCEPT}
                          disabled={billUploading}
                          onChange={handleBillFileChange}
                        />
                      </label>
                      {billUploading && (
                        <div className="cl-drawer__bill-progress" role="status">
                          <span className="cl-drawer__bill-progress-track">
                            <span />
                          </span>
                          <span className="cl-drawer__card-meta">
                            Uploading bill…
                          </span>
                        </div>
                      )}

                      {billError && (
                        <p
                          className="cl-drawer__bill-notice cl-drawer__bill-notice--error"
                          role="alert"
                        >
                          {billError}
                        </p>
                      )}
                      {billSuccess && (
                        <p
                          className="cl-drawer__bill-notice cl-drawer__bill-notice--success"
                          role="status"
                        >
                          {billSuccess}
                        </p>
                      )}

                      <div className="cl-drawer__bill-actions">
                        <Button
                          disabled={!billFile || billUploading}
                          onClick={handleBillUpload}
                        >
                          <Icon name="upload" size={14} strokeWidth={2} />
                          {billUploading
                            ? 'Uploading…'
                            : billingInfo.billUrl
                              ? 'Re-upload Bill'
                              : 'Upload Bill'}
                        </Button>
                        {billingInfo.billUrl && (
                          <button
                            type="button"
                            className="cl-drawer__outline-btn"
                            onClick={() =>
                              window.open(
                                billingInfo.billUrl,
                                '_blank',
                                'noopener,noreferrer',
                              )
                            }
                          >
                            <Icon
                              name="eye"
                              d={EXTERNAL_ICON}
                              size={13}
                              strokeWidth={2}
                            />
                            View Bill
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {billingCustomer && (
                <>
                  {/* Invoices — editable */}
                  <div className="cl-drawer__card">
                    <div className="cl-drawer__card-head">
                      <div>
                        <h3 className="cl-drawer__card-title">
                          <Icon name="fileText" size={15} strokeWidth={2} />
                          Invoices
                        </h3>
                        <p className="cl-drawer__card-meta">
                          Invoice details are saved in the customer's billing
                          details.
                        </p>
                      </div>
                    </div>

                    <div className="cl-drawer__bill-form">
                      <label className="cl-drawer__bill-field">
                        <span>Invoice No</span>
                        <input
                          value={invoice.invoiceNo}
                          onChange={(event) =>
                            setInvoice((value) => ({
                              ...value,
                              invoiceNo: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="cl-drawer__bill-field">
                        <span>Date</span>
                        <input
                          type="date"
                          value={invoice.date}
                          onChange={(event) =>
                            setInvoice((value) => ({
                              ...value,
                              date: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="cl-drawer__bill-field">
                        <span>Amount</span>
                        <input
                          value={invoice.amount}
                          onChange={(event) =>
                            setInvoice((value) => ({
                              ...value,
                              amount: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="cl-drawer__bill-field">
                        <span>Status</span>
                        <select
                          value={invoice.status}
                          onChange={(event) =>
                            setInvoice((value) => ({
                              ...value,
                              status: event.target.value,
                            }))
                          }
                        >
                          <option value="PENDING">Pending</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="GENERATED">Generated</option>
                        </select>
                      </label>
                      <label className="cl-drawer__bill-field cl-drawer__bill-field--full">
                        <span>Invoice / Bill Link</span>
                        <input
                          value={invoice.billingLink}
                          placeholder="https://..."
                          onChange={(event) =>
                            setInvoice((value) => ({
                              ...value,
                              billingLink: event.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>

                    {invoiceError && (
                      <p
                        className="cl-drawer__bill-notice cl-drawer__bill-notice--error"
                        role="alert"
                      >
                        {invoiceError}
                      </p>
                    )}
                    {invoiceSuccess && (
                      <p
                        className="cl-drawer__bill-notice cl-drawer__bill-notice--success"
                        role="status"
                      >
                        {invoiceSuccess}
                      </p>
                    )}

                    <div className="cl-drawer__bill-actions">
                      <Button
                        disabled={invoiceSaving}
                        onClick={handleSaveInvoice}
                      >
                        <Icon name="check" size={14} strokeWidth={2} />
                        {invoiceSaving ? 'Saving…' : 'Save Invoice'}
                      </Button>
                    </div>
                  </div>

                  {/* Payment & GST */}
                  <div className="cl-drawer__card">
                    <div className="cl-drawer__card-head">
                      <h3 className="cl-drawer__card-title">
                        <Icon name="wallet" size={15} strokeWidth={2} />
                        Payment &amp; GST
                      </h3>
                    </div>
                    <div className="cl-drawer__fields">
                      <Field
                        label="GST Number"
                        value={billingCustomer.gstNumber ?? ''}
                      />
                      <Field
                        label="Total Paid"
                        value={formatCurrency(billingCustomer.amountPaid)}
                      />
                      <Field
                        label="Outstanding"
                        value={formatCurrency(billingCustomer.amountPending)}
                      />
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'deliverables' && (
            <motion.div
              className="cl-drawer__deliverables"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <p className="cl-drawer__deliverables-intro">
                Everything we must deliver for this package, grouped by service.
              </p>
              <div className="cl-drawer__progress-card">
                <div className="cl-drawer__card-head">
                  <strong>
                    {apiDetails.serviceRowsLoading
                      ? 'Loading services...'
                      : hasDepartmentServiceSummary
                        ? `${doneCount} of ${services.length} services completed`
                        : 'Service summary unavailable'}
                  </strong>
                  <strong>
                    {apiDetails.serviceRowsLoading
                      ? '—'
                      : hasDepartmentServiceSummary
                        ? `${services.length ? Math.round((doneCount / services.length) * 100) : 0}%`
                        : '—'}
                  </strong>
                </div>
                <div className="cl-drawer__progress-track">
                  <span
                    style={{
                      width: `${services.length && hasDepartmentServiceSummary && !apiDetails.serviceRowsLoading ? (doneCount / services.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              {apiDetails.serviceRowsLoading || !hasDepartmentServiceSummary ? null : services.length > 0 ? (
                <ul className="cl-drawer__deliverable-grid">
                  {services.map((service, index) => (
                    <li
                      key={`${service.name}-${index}`}
                      className="cl-drawer__deliverable"
                    >
                      <div className="cl-drawer__deliverable-head">
                        <span
                          className="cl-drawer__service-dot"
                          style={{
                            background:
                              SERVICE_DOT_COLORS[index % SERVICE_DOT_COLORS.length],
                          }}
                        />
                        <strong>{service.name}</strong>
                        {service.status ? (
                          <span
                            className={`cl-drawer__service-pill cl-drawer__service-pill--${service.status}`}
                          >
                            {service.status === 'pending' && (
                              <Icon
                                name="clock"
                                d={HOURGLASS_ICON}
                                size={14}
                              />
                            )}
                            {STATUS_LABEL[service.status]}
                          </span>
                        ) : (
                          <span className="cl-drawer__service-pill cl-drawer__service-pill--unavailable">
                            Status unavailable
                          </span>
                        )}
                      </div>
                      <p className="cl-drawer__deliverable-status">
                        {service.row
                          ? getDeliverySummary(service.row)
                          : 'No service status returned by backend.'}
                      </p>
                      {service.row && (
                        <details className="cl-drawer__deliverable-details">
                          <summary>View service details</summary>
                          <DetailGrid
                            data={getServiceRowFields(service.row)}
                            exclude={['customerId', 'serviceType', 'status', 'onboardingStatus', 'createdAt', 'updatedAt', 'customerDetails', 'departmentStatuses', 'deliveryStatus', 'callStatus']}
                          />
                          {service.row.customerDetails && (
                            <DetailGrid
                              title="Customer service data"
                              data={service.row.customerDetails}
                            />
                          )}
                          {service.row.departmentStatuses && (
                            <DetailGrid
                              title="Department statuses"
                              data={service.row.departmentStatuses}
                            />
                          )}
                          {service.row.deliveryStatus && (
                            <DetailGrid
                              title="Delivery"
                              data={service.row.deliveryStatus}
                            />
                          )}
                          {service.row.callStatus && (
                            <DetailGrid
                              title="Call details"
                              data={service.row.callStatus}
                            />
                          )}
                          {service.row.updatedAt && (
                            <p className="cl-drawer__deliverable-updated">
                              Updated {formatTimestamp(service.row.updatedAt)}
                            </p>
                          )}
                        </details>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="cl-drawer__empty">
                  No customer service rows found.
                </p>
              )}
            </motion.div>
          )}

          {activeTab === 'activity' && (
            <motion.div
              className="cl-drawer__card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="cl-drawer__card-head">
                <div>
                  <h3>All updates</h3>
                  <p className="cl-drawer__card-meta">
                    Status changes and remarks recorded for {contactName}.
                  </p>
                </div>
              </div>
              {updates.length > 0 ? (
                <ol className="cl-drawer__timeline">
                  {updates.map((update, index) => (
                    <li
                      key={`${update.title}-${update.timestamp}-${index}`}
                      className={`cl-drawer__timeline-item ${updateToneClass(update)}`}
                    >
                      <span className="cl-drawer__timeline-icon">
                        <Icon name={updateIcon(update)} size={16} strokeWidth={1.8} />
                      </span>
                      <div>
                        <strong>{update.title}</strong>
                        {update.detail && <p>{update.detail}</p>}
                        {update.timestamp && (
                          <time dateTime={update.timestamp}>
                            {formatTimestamp(update.timestamp)}
                          </time>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="cl-drawer__empty">No updates have been recorded.</p>
              )}
            </motion.div>
          )}

          {activeTab === 'recurring' && (
            <motion.div
              className="cl-drawer__card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="cl-drawer__card-head">
                <div>
                  <h3>Recurring lifecycle</h3>
                  <p className="cl-drawer__card-meta">
                    Complete department history from creation through expiration for {businessName}.
                  </p>
                </div>
                <button
                  type="button"
                  className="cl-drawer__outline-btn"
                  onClick={() => recurringQuery.refetch()}
                  disabled={recurringQuery.isFetching}
                >
                  {recurringQuery.isFetching ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>

              {recurringQuery.isLoading ? (
                <p className="cl-drawer__empty">Loading recurring updates…</p>
              ) : recurringQuery.isError ? (
                <div>
                  <p className="cl-drawer__empty">
                    {recurringQuery.error instanceof Error
                      ? recurringQuery.error.message
                      : 'Unable to load recurring updates.'}
                  </p>
                  <button
                    type="button"
                    className="cl-drawer__outline-btn"
                    onClick={() => recurringQuery.refetch()}
                  >
                    Try again
                  </button>
                </div>
              ) : recurringQuery.data ? (
                <>
                  <DetailGrid
                    title="Current recurring summary"
                    data={{
                      createdAt: recurringQuery.data.createdAt,
                      updatedAt: recurringQuery.data.updatedAt,
                      expirationAt: recurringQuery.data.expirationAt,
                      currentStatus: recurringQuery.data.currentStatus,
                      assignedTo: recurringQuery.data.currentAssignedUser,
                      department: recurringQuery.data.departmentType,
                    }}
                  />
                  {recurringQuery.data.services.length > 0 && (
                    <DetailGrid
                      title="Department services"
                      data={Object.fromEntries(
                        recurringQuery.data.services.map((service, index) => [
                          service.serviceType || `Service ${index + 1}`,
                          [service.status, service.assignedUser, service.expirationAt ? `Expires ${formatTimestamp(service.expirationAt)}` : '']
                            .filter(Boolean)
                            .join(' · '),
                        ]),
                      )}
                    />
                  )}
                  {recurringQuery.data.events.length > 0 ? (
                    <ol className="cl-drawer__timeline">
                  {recurringQuery.data.events.map((entry, index) => {
                    const eventLabel: Record<string, string> = {
                      CUSTOMER_CREATED: 'Customer created',
                      SERVICE_CREATED: 'Service created',
                      USER_ASSIGNED: 'User assigned',
                      USER_REASSIGNED: 'User reassigned',
                      STATUS_CHANGED: 'Status changed',
                      SERVICE_EXPIRATION: 'Service expiration',
                    }
                    return (
                      <li
                        key={`${entry.id ?? entry.occurredAt ?? index}-${index}`}
                        className="cl-drawer__timeline-item"
                      >
                        <span className="cl-drawer__timeline-icon">
                          <Icon name="history" size={16} strokeWidth={1.8} />
                        </span>
                        <div>
                          <strong>
                            {eventLabel[entry.type] || entry.type.replaceAll('_', ' ')}
                          </strong>
                          <p>
                            {[
                              entry.serviceType,
                              entry.phaseName,
                              entry.fromUser && entry.toUser
                                ? `${entry.fromUser} → ${entry.toUser}`
                                : entry.toUser,
                              entry.oldValue && entry.newValue
                                ? `${entry.oldValue} → ${entry.newValue}`
                                : entry.newValue,
                              entry.performedBy ? `By ${entry.performedBy}` : '',
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                          {entry.remarks ? <p>{entry.remarks}</p> : null}
                          <time dateTime={entry.occurredAt}>
                            {formatTimestamp(entry.occurredAt)}
                          </time>
                        </div>
                      </li>
                    )
                  })}
                    </ol>
                  ) : (
                    <p className="cl-drawer__empty">No lifecycle events have been recorded.</p>
                  )}
                </>
              ) : (
                <p className="cl-drawer__empty">
                  No recurring lifecycle has been recorded for this customer.
                </p>
              )}
            </motion.div>
          )}

          {/* Duplicate businesses */}
          {activeTab === 'duplicates' && (
            <motion.div
              className="cl-drawer__stack"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="cl-drawer__card">
                <div className="cl-drawer__card-head">
                  <div>
                    <h3>Duplicate businesses ({duplicateItems.length})</h3>
                    <p className="cl-drawer__card-meta">
                      Other businesses registered under the same founder or phone number.
                    </p>
                  </div>
                </div>

                <div className="cl-drawer__dup-list">
                  {duplicateItems.map((duplicate: any, dupIndex: number) => {
                    const dupId = String(
                      duplicate?.duplicateCustomerId ||
                        duplicate?.customerId ||
                        duplicate?.id ||
                        `${customer.id}-dup-${dupIndex}`,
                    )
                    const name =
                      duplicate?.businessName ||
                      duplicate?.customerDetails?.businessName ||
                      duplicate?.brandName ||
                      'Business'
                    const owner =
                      duplicate?.ownerName ||
                      duplicate?.customerDetails?.ownerName ||
                      customer.contactName ||
                      '—'
                    const email =
                      duplicate?.email ||
                      duplicate?.customerDetails?.email ||
                      '—'
                    const phone =
                      duplicate?.phoneNumber ||
                      duplicate?.contact ||
                      duplicate?.phone ||
                      duplicate?.customerDetails?.phoneNumber ||
                      '—'
                    const gst =
                      duplicate?.gstNumber ||
                      duplicate?.customerDetails?.gstNumber ||
                      '—'
                    const address =
                      duplicate?.address ||
                      duplicate?.customerDetails?.address ||
                      [
                        duplicate?.customerDetails?.area,
                        duplicate?.customerDetails?.city,
                        duplicate?.customerDetails?.state,
                      ]
                        .filter(Boolean)
                        .join(', ') ||
                      '—'
                    const rawStatus =
                      duplicate?.completeServiceStatus ||
                      duplicate?.onboardingStatus ||
                      duplicate?.status ||
                      'pending'
                    const status = toOnboardingStatus(rawStatus) || 'pending'
                    const services = Array.isArray(duplicate?.services)
                      ? duplicate.services
                      : duplicate?.serviceType
                        ? [
                            {
                              serviceType: duplicate.serviceType,
                              status: rawStatus,
                            },
                          ]
                        : []

                    const isCurrentlyActive =
                      String(activeCustomer?.id) === dupId

                    return (
                      <div key={dupId} className="cl-drawer__dup-card">
                        <div className="cl-drawer__dup-card-head">
                          <div className="cl-drawer__dup-card-badges">
                            <span className="cl-drawer__dup-badge">
                              Other Business {dupIndex + 1}
                            </span>
                            <span
                              className={`cl-drawer__service-pill cl-drawer__service-pill--${status}`}
                            >
                              {STATUS_LABEL[status]}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="cl-drawer__outline-btn"
                            onClick={() => {
                              const matched = allBusinesses.find(
                                (b) => String(b.id) === dupId,
                              )
                              if (matched) {
                                setActiveCustomer(matched as any)
                                setActiveTab('overview')
                              }
                            }}
                          >
                            <Icon
                              name="eye"
                              d={EXTERNAL_ICON}
                              size={13}
                              strokeWidth={2}
                            />
                            {isCurrentlyActive ? 'Viewing now' : 'View details'}
                          </button>
                        </div>

                        <h4 className="cl-drawer__dup-card-name">{name}</h4>

                        <div className="cl-drawer__dup-card-rows">
                          <div className="cl-drawer__dup-card-row">
                            <span className="cl-drawer__dup-card-label">
                              Owner
                            </span>
                            <span className="cl-drawer__dup-card-value">
                              {owner}
                            </span>
                          </div>
                          <div className="cl-drawer__dup-card-row">
                            <span className="cl-drawer__dup-card-label">
                              Phone
                            </span>
                            <span className="cl-drawer__dup-card-value">
                              {phone}
                            </span>
                          </div>
                          <div className="cl-drawer__dup-card-row">
                            <span className="cl-drawer__dup-card-label">
                              Email
                            </span>
                            <span className="cl-drawer__dup-card-value">
                              {email}
                            </span>
                          </div>
                          <div className="cl-drawer__dup-card-row">
                            <span className="cl-drawer__dup-card-label">
                              GST
                            </span>
                            <span className="cl-drawer__dup-card-value">
                              {gst}
                            </span>
                          </div>
                          <div className="cl-drawer__dup-card-row">
                            <span className="cl-drawer__dup-card-label">
                              Address
                            </span>
                            <span className="cl-drawer__dup-card-value">
                              {address}
                            </span>
                          </div>
                        </div>

                        {services.length > 0 && (
                          <div className="cl-drawer__dup-services">
                            <span className="cl-drawer__dup-services-title">
                              Services
                            </span>
                            <div className="cl-drawer__dup-services-list">
                              {services.map((s: any, sIdx: number) => {
                                const sName = formatServiceName(
                                  s?.serviceType || s?.name,
                                )
                                const sStatus =
                                  toOnboardingStatus(s?.status) || 'pending'
                                return (
                                  <span
                                    key={`${sName}-${sIdx}`}
                                    className={`cl-drawer__service-pill cl-drawer__service-pill--${sStatus}`}
                                  >
                                    {sName} · {STATUS_LABEL[sStatus]}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </>
  )
}

function toOnboardingStatus(status?: string): OnboardingStatus | undefined {
  const normalized = status?.toLowerCase().replaceAll('_', '-')
  if (normalized === 'completed') return 'completed'
  if (normalized === 'in-progress') return 'in-progress'
  if (normalized === 'pending') return 'pending'
  return undefined
}

const DEPARTMENT_SERVICE_ORDER = [
  'SUPPORT_DEPARTMENT',
  'RECURRING_DEPARTMENT',
  'BILLING_DEPARTMENT',
  'SMO_DEPARTMENT',
  'SEO_DEPARTMENT',
  'WEBSITE_DEPARTMENT',
  'AUTOMATION_DEPARTMENT',
  'ADVERTISEMENT_DEPARTMENT',
  'ONBOARDING_DEPARTMENT',
  'GOOGLE_DEPARTMENT',
]

const DEPARTMENT_SERVICE_LABELS: Record<string, string> = {
  SUPPORT_DEPARTMENT: 'Support',
  RECURRING_DEPARTMENT: 'Support',
  BILLING_DEPARTMENT: 'Billing',
  SMO_DEPARTMENT: 'SMO',
  SEO_DEPARTMENT: 'SEO',
  WEBSITE_DEPARTMENT: 'Website',
  AUTOMATION_DEPARTMENT: 'Automation',
  ADVERTISEMENT_DEPARTMENT: 'Advertisement',
  ONBOARDING_DEPARTMENT: 'Onboarding',
  GOOGLE_DEPARTMENT: 'Google',
  AUTOWEBSION_DEPARTMENT: 'Website & Automation',
}

interface DrawerUpdate {
  title: string
  detail: string
  timestamp: string
  tone?: 'completed'
}

function isCompletedUpdate(update: { title: string; tone?: 'completed' }) {
  return update.tone === 'completed' || /\bcompleted\b/i.test(update.title)
}

function updateIcon(update: { title: string; tone?: 'completed' }) {
  if (isCompletedUpdate(update)) return 'done' as const
  if (/\bcall\b/i.test(update.title)) return 'phone' as const
  if (/\b(email|mail|acknowledgement)\b/i.test(update.title)) {
    return 'messageSquare' as const
  }
  return 'clock' as const
}

function updateToneClass(update: { title: string; tone?: 'completed' }) {
  if (isCompletedUpdate(update)) return 'is-completed'
  if (/\bcall\b/i.test(update.title)) return 'is-call'
  if (/\b(email|mail|acknowledgement)\b/i.test(update.title)) return 'is-email'
  return ''
}

function buildServiceStatusUpdates(rows: CustomerServiceRow[]): DrawerUpdate[] {
  const updates: DrawerUpdate[] = []
  const seen = new Set<string>()

  const add = (key: string, update: DrawerUpdate) => {
    if (seen.has(key)) return
    seen.add(key)
    updates.push(update)
  }

  rows.forEach((row) => {
    const rowDepartment = formatServiceName(
      row.serviceType || row.callStatus?.departmentType || 'Department',
    )
    const rowTimestamp = row.updatedAt || row.createdAt || ''

    Object.entries(row.departmentStatuses ?? {}).forEach(([department, details]) => {
      const departmentName =
        DEPARTMENT_SERVICE_LABELS[department.toUpperCase()] ??
        formatServiceName(department.replace(/_DEPARTMENT$/i, ''))
      const rawStatus = details?.status || (details?.onboarded ? 'COMPLETED' : 'PENDING')
      const status = formatServiceName(rawStatus)
      add(`status:${department}:${rawStatus}`, {
        title: `${departmentName} ${status.toLowerCase()}`,
        detail: `${departmentName} service status changed to ${status}.`,
        timestamp:
          details?.completedAt || details?.updatedAt || details?.timestamp || rowTimestamp,
        tone: rawStatus.toUpperCase() === 'COMPLETED' || details?.onboarded
          ? 'completed'
          : undefined,
      })
    })

    const rawCallStatus = row.callStatus as
      | CustomerServiceRow['callStatus']
      | string
      | undefined
    if (rawCallStatus) {
      const call = typeof rawCallStatus === 'string'
        ? { status: rawCallStatus }
        : rawCallStatus
      const callLabel = call.status || (call.connected === true ? 'Connected' : call.connected === false ? 'Not answered' : 'Updated')
      add(`call:${rowDepartment}:${callLabel}:${call.lastCallDate || ''}`, {
        title: `${rowDepartment} call ${formatServiceName(callLabel).toLowerCase()}`,
        detail: call.callNotes || `Call status: ${formatServiceName(callLabel)}.`,
        timestamp: call.lastCallDate || call.updatedAt || rowTimestamp,
      })
    }

    if (row.isMailSent) {
      add(`mail:${rowDepartment}:draft`, {
        title: `${rowDepartment} email sent`,
        detail: 'The department email was sent to the customer.',
        timestamp: rowTimestamp,
      })
    }
    if (row.serviceDeliverySent) {
      add(`mail:${rowDepartment}:delivery`, {
        title: `${rowDepartment} acknowledgement sent`,
        detail: 'The service delivery acknowledgement was sent to the customer.',
        timestamp: rowTimestamp,
      })
    }
  })

  return updates
}

function getDepartmentServices(
  departmentStatuses: CustomerServiceRow['departmentStatuses'],
  serviceRow: CustomerServiceRow | undefined,
  currentDepartment: string,
) {
  if (!departmentStatuses) return []

  const normalizedCurrentDepartment = currentDepartment.toUpperCase()
  return Object.entries(departmentStatuses)
    .sort(([a], [b]) => {
      const aOrder = DEPARTMENT_SERVICE_ORDER.indexOf(a.toUpperCase())
      const bOrder = DEPARTMENT_SERVICE_ORDER.indexOf(b.toUpperCase())
      return (aOrder < 0 ? Number.MAX_SAFE_INTEGER : aOrder) -
        (bOrder < 0 ? Number.MAX_SAFE_INTEGER : bOrder)
    })
    .map(([department, details]) => {
      const normalizedDepartment = department.toUpperCase()
      const isCurrentDepartment =
        normalizedDepartment === normalizedCurrentDepartment ||
        (normalizedDepartment === 'RECURRING_DEPARTMENT' &&
          normalizedCurrentDepartment === 'SUPPORT_DEPARTMENT') ||
        (normalizedDepartment === 'AUTOWEBSION_DEPARTMENT' &&
          ['WEBSITE_DEPARTMENT', 'AUTOMATION_DEPARTMENT'].includes(
            normalizedCurrentDepartment,
          ))

      return {
        name:
          DEPARTMENT_SERVICE_LABELS[normalizedDepartment] ??
          formatServiceName(department.replace(/_DEPARTMENT$/i, '')),
        status: toOnboardingStatus(
          details?.status || (details?.onboarded ? 'COMPLETED' : undefined),
        ),
        row: isCurrentDepartment ? serviceRow : undefined,
      }
    })
}

export function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function formatServiceName(value?: string): string {
  if (!value) return 'Customer service'
  return value
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .toLowerCase()
    .replace(/\b\w+/g, (word) =>
      ['smo', 'seo', 'smm', 'crm', 'gmb', 'ai'].includes(word)
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
}

function formatTimestamp(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
}

function formatValue(value: unknown): string {
      if (typeof value === 'string') return value
      if (Array.isArray(value)) {
        return value.map((item) => formatValue(item)).filter(Boolean).join(', ')
      }
      if (value && typeof value === 'object') {
        return formatRecord(value as Record<string, unknown>)
      }
      if (value === null || value === undefined) return ''
      return String(value)
}

function formatRecord(record: Record<string, unknown>): string {
      return Object.entries(record)
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([key, value]) => `${formatFieldLabel(key)}: ${formatValue(value)}`)
        .join(' · ')
}

function formatFieldLabel(key: string): string {
      return key
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatProfileValue(
  key: keyof CustomerProfileDetails,
  value: CustomerProfileDetails[keyof CustomerProfileDetails] | unknown,
): string {
  if (key !== 'generatedBillInfo') return formatValue(value)

  let details: Record<string, unknown> = {}
  if (value && typeof value === 'object') {
    details = value as Record<string, unknown>
  } else if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown
      if (parsed && typeof parsed === 'object') details = parsed as Record<string, unknown>
    } catch {
      return value
    }
  }

  const labels: Record<string, string> = {
    status: 'Status',
    generatedBillInfo: 'Bill link',
    billingLink: 'Bill link',
    billUrl: 'Bill link',
    invoiceNo: 'Invoice no',
    invoiceDate: 'Invoice date',
    invoiceAmount: 'Invoice amount',
    updatedAt: 'Updated',
  }
  const entries = Object.entries(details).filter(([, item]) => item !== null && item !== undefined && String(item).trim())
  if (entries.length === 0) return 'No billing details available'
  return entries
    .map(([entryKey, item]) => {
      const formatted = entryKey === 'updatedAt' ? formatDateOnly(String(item)) : formatValue(item)
      return `${labels[entryKey] || formatFieldLabel(entryKey)}: ${formatted}`
    })
    .join(' · ')
}

function formatDateOnly(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.split('T')[0] || value
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getProfileSections(profile: CustomerProfileDetails) {
      type ProfileEntry = [
        keyof CustomerProfileDetails,
        CustomerProfileDetails[keyof CustomerProfileDetails],
      ]
      const entries = (Object.entries(profile) as ProfileEntry[]).filter(
        ([key]) => key !== 'planIds',
      )
      const seen = new Set<keyof CustomerProfileDetails>()
      const sections: {
        title: string
        entries: [keyof CustomerProfileDetails, unknown][]
      }[] = []

      for (const group of PROFILE_FIELD_GROUPS) {
        const groupEntries = entries.filter(
          ([key, value]) =>
            group.keys.includes(key) &&
            value !== undefined &&
            value !== null &&
            formatProfileValue(key, value).trim() !== '',
        )
        for (const [key] of groupEntries) seen.add(key)
        if (groupEntries.length > 0) {
          sections.push({ title: group.title, entries: groupEntries })
        }
      }

      const otherEntries = entries.filter(
        ([key, value]) =>
          !seen.has(key) &&
          value !== undefined &&
          value !== null &&
          formatProfileValue(key, value).trim() !== '',
      )
      if (otherEntries.length > 0) {
        sections.push({ title: 'Other details', entries: otherEntries })
      }
      return sections
}

function getServiceRowFields(row: CustomerServiceRow): Record<string, unknown> {
      return {
        customerId: row.customerId,
        serviceType: row.serviceType,
        status: row.status,
        onboardingStatus: row.onboardingStatus,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        serviceExpiration: row.serviceExpiration,
        isServiceActive: row.isServiceActive,
        isMailSent: row.isMailSent,
        serviceDeliverySent: row.serviceDeliverySent,
        hasDuplicateCustomer: row.hasDuplicateCustomer,
        duplicateCount: row.duplicateCount,
        assignedUserEmail: row.assignedUserEmail,
        assignedUserName: row.assignedUserName,
        internalRemark: row.internalRemark,
      }
}

function getDeliverySummary(row: CustomerServiceRow | undefined): string {
      if (!row) return 'Service details unavailable.'

      const serviceStatus = toOnboardingStatus(row.status || row.onboardingStatus)
      const serviceProgress =
        row.deliveryStatus?.hasServiceHistory === false
          ? 'Not started yet'
          : row.deliveryStatus?.hasServiceHistory === true
            ? 'Service history available'
            : serviceStatus === 'completed'
              ? 'Completed'
              : serviceStatus === 'in-progress'
                ? 'In progress'
                : ''
      const onboarding = Object.entries(row.departmentStatuses ?? {}).find(
        ([department]) => department.toLowerCase().includes('onboarding'),
      )?.[1]
      const onboardingStatus =
        typeof onboarding?.onboarded === 'boolean'
          ? onboarding.onboarded
            ? 'Onboarded'
            : 'Not onboarded'
          : ''
      const summary = [serviceProgress, onboardingStatus].filter(Boolean).join(' · ')
      return summary || (serviceStatus ? STATUS_LABEL[serviceStatus] : 'Status unavailable')
}

function DetailGrid({
      title,
      data,
      exclude = [],
}: {
      title?: string
      data: Record<string, unknown>
      exclude?: string[]
}) {
      const entries = Object.entries(data).filter(
        ([key, value]) =>
          key !== 'planIds' &&
          !exclude.includes(key) &&
          value !== undefined &&
          value !== null &&
          formatValue(value).trim() !== '',
      )
      if (entries.length === 0) return null

      return (
        <section className="cl-drawer__detail-grid">
          {title && <h5>{title}</h5>}
          <div>
            {entries.map(([key, value]) => (
              <FormRow key={key} label={formatFieldLabel(key)} value={formatProfileValue(key as keyof CustomerProfileDetails, value)} />
            ))}
          </div>
        </section>
      )
}

function FormRow({ label, value }: { label: string; value?: string }) {
      if (!value?.trim()) return null
      return (
        <div className="cl-drawer__form-row">
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      )
}

function RemarkGroup({
  title,
  emptyMessage,
  entries,
  fallback,
  internal = false,
  badge,
  editable = false,
  editingRemark,
  editingRemarkText = '',
  onEdit,
  onEditTextChange,
  onCancelEdit,
  onSaveEdit,
  isSavingRemark = false,
}: {
  title: string
  emptyMessage: string
  entries: { category: string; remark: CustomerRemark }[]
  fallback?: string
  internal?: boolean
  badge?: string
  editable?: boolean
  editingRemark?: string | null
  editingRemarkText?: string
  onEdit?: (remark: CustomerRemark) => void
  onEditTextChange?: (value: string) => void
  onCancelEdit?: () => void
  onSaveEdit?: () => void
  isSavingRemark?: boolean
  pageSize?: number
}) {
  return (
    <section className="cl-drawer__remark-group">
      <div className="cl-drawer__card-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3>{title}</h3>
          <span className="cl-drawer__remark-count-badge">({entries.length})</span>
        </div>
        {badge ? (
          <span className="cl-drawer__card-meta">{badge}</span>
        ) : internal ? (
          <span className="cl-drawer__card-meta">Team only</span>
        ) : null}
      </div>
      {entries.length > 0 ? (
        <ul className="cl-drawer__remark-list">
          {entries.map(({ remark }, index) => (
            <li key={`${remark.timestamp || index}-${remark.staffName || ''}-${index}`}>
              {editable && editingRemark === (remark.timestamp || remark.remark || 'remark') ? (
                <div className="cl-remark-edit">
                  <textarea value={editingRemarkText} onChange={(event) => onEditTextChange?.(event.target.value)} rows={3} />
                  <div><button type="button" onClick={onCancelEdit}>Cancel</button><button type="button" onClick={onSaveEdit} disabled={isSavingRemark}>{isSavingRemark ? 'Saving...' : 'Save'}</button></div>
                </div>
              ) : <p>{remark.remark || '—'}</p>}
              {editable && editingRemark !== (remark.timestamp || remark.remark || 'remark') ? <button type="button" className="cl-remark-edit-trigger" onClick={() => onEdit?.(remark)}>Edit</button> : null}
              <span>
                {[remark.staffName, remark.type, remark.timestamp]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </li>
          ))}
        </ul>
      ) : fallback ? (
        <div className="cl-drawer__remark-fallback">
          <p>{fallback}</p>
          <span>Latest noted remark</span>
        </div>
      ) : (
        <p className="cl-drawer__remark-empty">{emptyMessage}</p>
      )}
    </section>
  )
}
