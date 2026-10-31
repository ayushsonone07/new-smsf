import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Check,
  ClipboardList,
  Eye,
  EyeOff,
  Hash,
  Lock,
  MapPin,
  Package,
  Wallet,
  X,
} from 'lucide-react'
import {
  fetchPlanAmounts,
  fetchPlansWithDepartments,
  registerCustomer,
  verifyPayment,
} from '../../../api/register-business.api'
import type {
  PlanAmount,
  PlanWithDepartments,
} from '../types/register-business.types'
import { normalizeAmountToRupees } from '../../../utils/paymentUtils'
import { RefreshButton } from '../../../components/ui/RefreshButton'

/* ─────────────────────────────────────────────────────────────────
   Single-page "Register Your Business" form.
   UI: step-wizard layout (left stepper rail, one step card at a time,
   docked features panel, Previous / Continue footer).
   Logic: unchanged — step-locking, payment verification, GST toggle,
   package selection, validation and passkey submission.
   ───────────────────────────────────────────────────────────────── */

const INDIAN_CITIES = Object.freeze([
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Jaipur', 'Jabalpur',
  'Ahmedabad', 'Lucknow', 'Kanpur', 'Nagpur', 'Visakhapatnam', 'Bhopal', 'Indore',
  'Thane', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad',
  'Meerut', 'Rajkot', 'Varanasi', 'Srinagar', 'Amritsar', 'Aurangabad', 'Ranchi',
])

const INITIAL_FORM_DATA = {
  ownerName: '',
  businessName: '',
  email: '',
  phoneNumber: '',
  expirationInMonths: '12',
  city: '',
  zipCode: '',
  websiteRequired: 'yes',
  remark: '',
  selectedPackages: [] as string[],
  paymentType: '',
  totalAmount: '',
  amountPaid: '',
  amountRemaining: '',
  remainingAmountDueDate: '',
  gstinForInvoice: '',
  completeAddress: '',
  invoiceOption: '',
  groupLink: '',
  salesPersonName: '',
  leadType: '',
  paymentId: '',
  isWebinarClient: 'NO',
  onboardingCity: 'Jabalpur',
}

/* Cities where onboarding is currently done. */
const ONBOARDING_CITIES = ['Jabalpur', 'Delhi']

/* Result of verifying a payment ID, tied to the exact phone + payment ID it was checked for. */
type PaymentCheck = {
  status: 'verifying' | 'verified' | 'failed'
  phone: string
  paymentId: string
  message?: string
  amount?: number | null
  paidAt?: string | null
}

const INITIAL_VALIDATION_ERRORS = {
  email: '',
  phoneNumber: '',
  gstin: '',
  city: '',
}

const REGISTRATION_PASSKEY =
  import.meta.env.VITE_REGISTRATION_PASSKEY || 'MBG@1234'

type SectionId = 'business' | 'packages' | 'financial' | 'final'
type ToastVariant = 'default' | 'success' | 'destructive'

interface ToastMessage {
  title: string
  description?: string
  variant: ToastVariant
}

interface RegistrationSuccess {
  businessName: string
  registrationId: string
  plan: string
  total: number
  paid: number
  balance: number
}

const SECTIONS: {
  id: SectionId
  label: string
  title: string
  icon: typeof Building2
}[] = [
  { id: 'business', label: 'Business', title: 'Business Details', icon: Building2 },
  { id: 'packages', label: 'Packages', title: 'Select Packages', icon: Package },
  { id: 'financial', label: 'Financial', title: 'Financial Information', icon: Wallet },
  { id: 'final', label: 'Final', title: 'Final Details', icon: ClipboardList },
]

/* UI only: steps that move on by themselves a moment after they become complete. */
const AUTO_ADVANCE: Record<SectionId, boolean> = {
  business: true,
  packages: false,
  financial: true,
  final: false,
}
const AUTO_ADVANCE_DELAY_MS = 1400

const validateEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

const validatePhoneNumber = (phone: string): boolean =>
  /^\+?[1-9]\d{9,14}$/.test(phone.replace(/[\s-]/g, ''))

const validateGSTNumber = (gst: string): boolean =>
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
    gst.toUpperCase(),
  )

/* Service Months must be a whole number from 1 to 60. */
const isValidServiceMonths = (value: string) =>
  /^\d+$/.test(value.trim()) && Number(value) >= 1 && Number(value) <= 60

export const monthsLabel = (months: number) =>
  `${months} month${months === 1 ? '' : 's'}`

/**
 * Standard duration filter chips always available on the registration page:
 * 1 Month, 3 Months, 6 Months, 12 Months.
 */
export const DEFAULT_DURATION_OPTIONS = [1, 3, 6, 12]

/**
 * Extracts a plan's duration in months.
 * Prefers explicit `durationMonths` from backend planAmounts if > 0.
 * Otherwise parses plan name & description for month/year keywords and numbers
 * (e.g. "1 Month", "3 Months", "6 Month", "12 Months", "12 moth", "1 Year", "quarterly", "annual", etc.).
 */
export function extractPlanDurationMonths(
  name?: string | null,
  description?: string | null,
  backendMonths?: number | null,
): number {
  if (backendMonths != null && Number(backendMonths) > 0) {
    return Number(backendMonths)
  }

  const text = `${name || ''} ${description || ''}`.trim()
  if (!text) return 0

  // 1. Half-yearly / semi-annual (check before yearly to avoid substring match)
  if (/\b(?:half[- ]yearly|semi[- ]annual)\b/i.test(text)) {
    return 6
  }

  // 2. Quarterly (3 months)
  if (/\b(?:quarterly|quarter)\b/i.test(text)) {
    return 3
  }

  // 3. Year matching (e.g., "1 year", "2 years", "1 yr", "1yr", "1-year")
  const yearMatch = text.match(/\b(\d+)\s*(?:years?|yrs?)\b/i)
  if (yearMatch) {
    return parseInt(yearMatch[1], 10) * 12
  }

  // 4. Named annual / yearly
  if (/\b(?:annual|yearly|per year)\b/i.test(text)) {
    return 12
  }

  // 5. Month matching (e.g. "1 month", "3 months", "6 month", "12 month", "12 moth", "3mo", etc.)
  const monthMatch = text.match(/\b(\d+)\s*(?:months?|moths?|mths?|mo)\b/i)
  if (monthMatch) {
    return parseInt(monthMatch[1], 10)
  }

  // Shorthand with 'm' (e.g. "1m", "3m", "6m", "12m", case-insensitive)
  const shortMatch = text.match(/\b(1|3|6|12)\s*m\b/i)
  if (shortMatch) {
    return parseInt(shortMatch[1], 10)
  }

  // 6. Named monthly
  if (/\b(?:monthly|per month)\b/i.test(text)) {
    return 1
  }

  return 0
}

/* Plans of this duration are shown first in the plan filter. */
const DEFAULT_PLAN_MONTHS = 15

/* GST rate applied on a plan's price (shown as "+18%" on plan cards). */
const GST_RATE = 0.18

/** "GOOGLE_DEPARTMENT" -> "Google", "SERVICE_DELIVERY_DEPARTMENT" -> "Service Delivery". */
function departmentLabel(raw: string) {
  return (raw || '')
    .replace(/_?DEPARTMENT$/i, '')
    .split('_')
    .filter(Boolean)
    .map((word) =>
      word.length <= 3
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(' ')
}

const DOT_COLORS = [
  'bg-red-500', 'bg-violet-500', 'bg-indigo-600', 'bg-blue-500', 'bg-orange-400',
  'bg-emerald-600', 'bg-green-500', 'bg-pink-500', 'bg-cyan-500', 'bg-amber-500',
]

function departmentDot(label: string) {
  let hash = 0
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0
  }
  return DOT_COLORS[hash % DOT_COLORS.length]
}

/* Keyframes used by the wizard UI (step card, docked panel, completed-step pop). */
const WIZARD_STYLES = `
@keyframes rbStepIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes rbPanelIn{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}
@keyframes rbPop{0%{transform:scale(.5)}60%{transform:scale(1.2)}100%{transform:scale(1)}}
.rb-step-in{animation:rbStepIn .35s cubic-bezier(.2,.7,.2,1) both}
.rb-panel-in{animation:rbPanelIn .3s cubic-bezier(.2,.7,.2,1) both}
.rb-pop{animation:rbPop .4s}
.rb-registration{font-family:var(--app-font-family);background:#f4f6fb}
.rb-registration input,.rb-registration textarea,.rb-registration select{font-weight:var(--app-font-weight-body)}
.rb-registration input::placeholder,.rb-registration textarea::placeholder{color:#94a3b8}
.rb-registration ::selection{background:#ffe08a}
@media (prefers-reduced-motion:reduce){.rb-step-in,.rb-panel-in,.rb-pop{animation:none!important}}
`

export function RegisterBusinessPage() {
  const navigate = useNavigate()

  // Queries for plans and pricing
  const plansQuery = useQuery({
    queryKey: ['register-business', 'plans-with-departments'],
    queryFn: fetchPlansWithDepartments,
    staleTime: 30_000,
  })

  const amountsQuery = useQuery({
    queryKey: ['register-business', 'plan-amounts'],
    queryFn: fetchPlanAmounts,
    staleTime: 30_000,
  })

  const plans: PlanWithDepartments[] = plansQuery.data ?? []
  const isLoadingPlans = plansQuery.isLoading
  const planAmounts: PlanAmount[] = amountsQuery.data ?? []
  // Background refetch (refresh button) — keep showing packages but dim them.
  const plansRefreshing =
    (plansQuery.isFetching && !plansQuery.isLoading) ||
    (amountsQuery.isFetching && !amountsQuery.isLoading)

  const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA })
  const [validationErrors, setValidationErrors] = useState({
    ...INITIAL_VALIDATION_ERRORS,
  })
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set())

  const [cityInput, setCityInput] = useState('')
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const cityDropdownRef = useRef<HTMLDivElement>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPasskeyModal, setShowPasskeyModal] = useState(false)
  const [passkey, setPasskey] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [paymentCheck, setPaymentCheck] = useState<PaymentCheck | null>(null)

  /* Wizard: which step card is currently shown */
  const [activeStep, setActiveStep] = useState<SectionId>('business')

  /* Plan duration filter. null = default 15-months plans if exist. */
  const [durationFilter, setDurationFilter] = useState<number | 'all' | null>(null)
  /* Toggle 18% GST addition on packages */
  const [includeGst, setIncludeGst] = useState(true)

  /* Plan whose features are shown in the docked side panel */
  const [viewingPlanId, setViewingPlanId] = useState<string | null>(null)

  const featuresPanelRef = useRef<HTMLElement>(null)

  /* Escape closes the panel; on narrow screens (panel is an overlay) clicking outside closes it too. */
  useEffect(() => {
    if (!viewingPlanId) return
    const handleClickOutside = (e: MouseEvent) => {
      if (window.innerWidth > 1100) return
      if (
        featuresPanelRef.current &&
        !featuresPanelRef.current.contains(e.target as Node)
      ) {
        setViewingPlanId(null)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewingPlanId(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [viewingPlanId])

  // Internal toast notification
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [registrationSuccess, setRegistrationSuccess] =
    useState<RegistrationSuccess | null>(null)
  const toastTimer = useRef<number | null>(null)

  const showToast = useCallback(
    ({ title, description, variant }: ToastMessage) => {
      setToast({ title, description, variant })
      if (toastTimer.current) {
        window.clearTimeout(toastTimer.current)
      }
      toastTimer.current = window.setTimeout(() => setToast(null), 4500)
    },
    [],
  )

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        window.clearTimeout(toastTimer.current)
      }
    }
  }, [])

  /* ─── Wizard navigation ─── */
  const skipAutoAdvanceRef = useRef(true)
  const autoAdvanceArmed = useRef<Record<SectionId, boolean>>({
    business: true,
    packages: true,
    financial: true,
    final: true,
  })
  const autoAdvanceTimer = useRef<number | null>(null)

  const goToStep = useCallback((id: SectionId) => {
    skipAutoAdvanceRef.current = true
    setActiveStep(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  /* Kept under its old name so validation code below reads the same. */
  const scrollToSection = goToStep

  const shouldShowError = (field: string): boolean =>
    touchedFields.has(field) &&
    !!validationErrors[field as keyof typeof validationErrors]

  const filteredCities = useMemo(() => {
    if (!cityInput.trim()) return []
    const term = cityInput.toLowerCase()
    return INDIAN_CITIES.filter((city) => city.toLowerCase().includes(term))
  }, [cityInput])

  const calculatedRemaining = useMemo(() => {
    const total = parseInt(formData.totalAmount) || 0
    const paid = parseInt(formData.amountPaid) || 0
    const remaining = total - paid
    return remaining > 0 ? remaining : 0
  }, [formData.totalAmount, formData.amountPaid])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        cityDropdownRef.current &&
        !cityDropdownRef.current.contains(event.target as Node)
      ) {
        setShowCityDropdown(false)
      }
    }
    if (showCityDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCityDropdown])

  const handleInputChange = useCallback(
    (field: string, value: string) => {
      const limits: Record<string, number> = {
        ownerName: 200,
        businessName: 500,
        email: 300,
        city: 200,
        remark: 1000,
        totalAmount: 12,
        gstinForInvoice: 20,
        completeAddress: 500,
        salesPersonName: 100,
        leadType: 50,
        groupLink: 300,
        paymentId: 50,
        passkey: 300,
      }

      if (limits[field] && value.length > limits[field]) {
        showToast({
          title: 'Character Limit Exceeded',
          description: `${field
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (s) => s.toUpperCase())} cannot exceed ${limits[field]} characters`,
          variant: 'destructive',
        })
        return
      }

      setFormData((prev) => ({ ...prev, [field]: value }))

      if (field in INITIAL_VALIDATION_ERRORS) {
        setValidationErrors((prev) => ({ ...prev, [field]: '' }))
      }
    },
    [showToast],
  )

  const handleFieldBlur = useCallback(
    (field: string, value: string) => {
      let error = ''
      setTouchedFields((prev) => new Set(prev).add(field))

      switch (field) {
        case 'email':
          if (!value) error = 'Email field is required'
          else if (!validateEmail(value))
            error = 'Email field: Please enter a valid email address'
          break
        case 'phoneNumber':
          if (!value) error = 'Phone Number field is required'
          else if (!validatePhoneNumber(value))
            error =
              'Phone Number field: Please enter a valid 10-digit phone number'
          break
        case 'gstinForInvoice':
          if (formData.invoiceOption === 'gstin' && !value)
            error = 'GSTIN field is required for invoicing'
          else if (
            formData.invoiceOption === 'gstin' &&
            value &&
            !validateGSTNumber(value)
          )
            error =
              'GSTIN field: Please enter a valid GSTIN number (typically 15 characters)'
          else if (value && value.length > 20)
            error = 'GSTIN field: Maximum 20 characters allowed'
          break
      }

      if (error) setValidationErrors((prev) => ({ ...prev, [field]: error }))
    },
    [formData.invoiceOption],
  )

  const handleCityChange = useCallback(
    (value: string) => {
      setCityInput(value)
      setShowCityDropdown(!!value)
      handleInputChange('city', value.trim())
    },
    [handleInputChange],
  )

  const handleCitySelect = useCallback(
    (city: string) => {
      setCityInput(city)
      setShowCityDropdown(false)
      handleInputChange('city', city)
    },
    [handleInputChange],
  )

  const resetForm = useCallback(() => {
    setRegistrationSuccess(null)
    setFormData({ ...INITIAL_FORM_DATA })
    setValidationErrors({ ...INITIAL_VALIDATION_ERRORS })
    setTouchedFields(new Set())
    setCityInput('')
    setPasskey('')
    setDurationFilter(null)
    setIncludeGst(true)
    setViewingPlanId(null)
    setPaymentCheck(null)
    autoAdvanceArmed.current = {
      business: true,
      packages: true,
      financial: true,
      final: true,
    }
    goToStep('business')
  }, [goToStep])

  /* ─── Payment ID verification. Tied to exact phone + payment ID checked. ─── */
  const paymentPhone = formData.phoneNumber.trim()
  const paymentIdInput = formData.paymentId.trim()
  const canEnterPaymentId = validatePhoneNumber(paymentPhone)
  const currentPaymentCheck =
    paymentCheck &&
    paymentCheck.phone === paymentPhone &&
    paymentCheck.paymentId === paymentIdInput
      ? paymentCheck
      : null
  const isVerifyingPayment = currentPaymentCheck?.status === 'verifying'
  const paymentVerified =
    canEnterPaymentId && currentPaymentCheck?.status === 'verified'
  const verifiedPaymentAmount =
    paymentVerified && currentPaymentCheck?.amount != null
      ? Number(currentPaymentCheck.amount)
      : null

  const handleVerifyPayment = useCallback(async () => {
    const phone = formData.phoneNumber.trim()
    const paymentId = formData.paymentId.trim()
    if (!validatePhoneNumber(phone) || !paymentId) return

    const isSameCheck = (prev: PaymentCheck | null) =>
      !!prev && prev.phone === phone && prev.paymentId === paymentId
    setPaymentCheck({ status: 'verifying', phone, paymentId })

    try {
      const res = await verifyPayment(phone, paymentId)
      setPaymentCheck((prev) => {
        if (!isSameCheck(prev)) return prev
        return res.success
          ? {
              status: 'verified',
              phone,
              paymentId,
              amount: res.data?.amount ?? null,
              paidAt: res.data?.paidAt ?? null,
            }
          : {
              status: 'failed',
              phone,
              paymentId,
              message: res.message || 'Payment could not be verified',
            }
      })

      if (res.success && res.data?.amount != null) {
        const verifiedAmt = Number(res.data.amount)
        setFormData((prev) => {
          const total = parseInt(prev.totalAmount) || 0
          const remaining = total - verifiedAmt
          return {
            ...prev,
            amountPaid: String(verifiedAmt),
            amountRemaining: remaining > 0 ? String(remaining) : '',
          }
        })
      }
    } catch (error: any) {
      setPaymentCheck((prev) =>
        isSameCheck(prev)
          ? {
              status: 'failed',
              phone,
              paymentId,
              message: error?.message || 'Payment could not be verified',
            }
          : prev,
      )
    }
  }, [formData.phoneNumber, formData.paymentId])

  /* ─── Plan pricing from planAmounts ─── */
  const priceOf = useCallback(
    (planName: string) => {
      const row = planAmounts.find((a) => a.planName === planName)
      const pkg = plans.find((p) => p.name === planName)
      const amount =
        (Number(row?.amount) || 0) + (Number(row?.additionalAmount) || 0)
      const months = extractPlanDurationMonths(
        planName,
        pkg?.description,
        row?.durationMonths,
      )
      return {
        amount,
        withGst: Math.round(amount * (1 + GST_RATE)),
        hasPrice: row?.amount != null || row?.additionalAmount != null,
        months,
        featureList: row?.featureList ?? [],
      }
    },
    [planAmounts, plans],
  )

  /* What the selected plans add up to. */
  const selectedPlans = plans.filter((p) =>
    formData.selectedPackages?.includes(p.id),
  )
  const autoTotal = selectedPlans.reduce(
    (sum, p) =>
      sum + (includeGst ? priceOf(p.name).withGst : priceOf(p.name).amount),
    0,
  )
  const autoMonths = selectedPlans.reduce(
    (max, p) => Math.max(max, priceOf(p.name).months),
    0,
  )
  const hasUnpricedSelection = selectedPlans.some(
    (p) => !priceOf(p.name).hasPrice,
  )
  const totalLocked = autoTotal > 0 && !hasUnpricedSelection
  const monthsLocked = autoMonths > 0

  /* Handle package selection with verified payment amount restriction */
  const handlePackageToggle = useCallback(
    (packageId: string, checked?: boolean) => {
      const pkg = plans.find((p) => p.id === packageId)
      const isCurrentlySelected =
        formData.selectedPackages?.includes(packageId)
      const willSelect =
        checked !== undefined ? checked : !isCurrentlySelected

      if (willSelect && verifiedPaymentAmount != null && pkg) {
        const pkgPrice = includeGst
          ? priceOf(pkg.name).withGst
          : priceOf(pkg.name).amount
        if (pkgPrice > verifiedPaymentAmount) {
          const extra = pkgPrice - verifiedPaymentAmount
          showToast({
            title: 'Package Exceeds Verified Payment',
            description: `"${pkg.name}" costs ₹${pkgPrice.toLocaleString('en-IN')}, which exceeds your verified payment of ₹${verifiedPaymentAmount.toLocaleString('en-IN')} by ₹${extra.toLocaleString('en-IN')}. Please choose a package within ₹${verifiedPaymentAmount.toLocaleString('en-IN')}.`,
            variant: 'destructive',
          })
          return
        }

        const otherSelectedCost = (formData.selectedPackages || [])
          .filter((id) => id !== packageId)
          .reduce((sum, id) => {
            const p = plans.find((pl) => pl.id === id)
            return (
              sum +
              (p
                ? includeGst
                  ? priceOf(p.name).withGst
                  : priceOf(p.name).amount
                : 0)
            )
          }, 0)

        const totalSelected = otherSelectedCost + pkgPrice
        if (totalSelected > verifiedPaymentAmount) {
          const extra = totalSelected - verifiedPaymentAmount
          showToast({
            title: 'Total Exceeds Verified Payment',
            description: `Selected packages total ₹${totalSelected.toLocaleString('en-IN')}, which exceeds your verified payment of ₹${verifiedPaymentAmount.toLocaleString('en-IN')} by ₹${extra.toLocaleString('en-IN')}. Please choose packages within ₹${verifiedPaymentAmount.toLocaleString('en-IN')}.`,
            variant: 'destructive',
          })
          return
        }
      }

      setFormData((prev) => {
        const selected = prev.selectedPackages || []
        let updated: string[]
        if (checked !== undefined) {
          updated = checked
            ? [...selected, packageId]
            : selected.filter((id) => id !== packageId)
        } else {
          updated = selected.includes(packageId)
            ? selected.filter((id) => id !== packageId)
            : [...selected, packageId]
        }
        return { ...prev, selectedPackages: updated }
      })
    },
    [
      formData.selectedPackages,
      plans,
      priceOf,
      includeGst,
      verifiedPaymentAmount,
      showToast,
    ],
  )

  /* Total Amount follows the selected plans */
  const lastAutoTotal = useRef(0)
  useEffect(() => {
    if (autoTotal === lastAutoTotal.current) return
    const hadAutoTotal = lastAutoTotal.current > 0
    lastAutoTotal.current = autoTotal
    if (autoTotal <= 0 && !hadAutoTotal) return
    const value = autoTotal > 0 ? String(autoTotal) : ''
    setFormData((prev) => {
      if (verifiedPaymentAmount != null) {
        const currentPaid =
          prev.paymentType === 'part-time' && prev.amountPaid
            ? parseInt(prev.amountPaid) || 0
            : verifiedPaymentAmount
        const remaining = autoTotal - currentPaid
        return {
          ...prev,
          totalAmount: value,
          amountPaid: String(currentPaid),
          amountRemaining: remaining > 0 ? String(remaining) : '',
          paymentType: remaining > 0 ? 'part-time' : prev.paymentType,
        }
      }
      if (prev.paymentType === 'full-time') {
        return {
          ...prev,
          totalAmount: value,
          amountPaid: value,
          amountRemaining: '',
        }
      }
      const remaining = autoTotal - (parseInt(prev.amountPaid) || 0)
      return {
        ...prev,
        totalAmount: value,
        amountRemaining: remaining > 0 ? String(remaining) : '',
      }
    })
  }, [autoTotal, verifiedPaymentAmount])

  /* Service Months follows the longest selected plan */
  useEffect(() => {
    if (autoMonths <= 0) return
    const value = String(autoMonths)
    setFormData((prev) =>
      prev.expirationInMonths === value
        ? prev
        : { ...prev, expirationInMonths: value },
    )
  }, [autoMonths])

  /* Duration filter for the plan cards: includes 1, 3, 6, 12 and any durations from loaded plans */
  const durationOptions = useMemo(() => {
    const fromPlans = plans
      .map((p) => priceOf(p.name).months)
      .filter((m) => m > 0)
    return Array.from(
      new Set([...DEFAULT_DURATION_OPTIONS, ...fromPlans]),
    ).sort((x, y) => x - y)
  }, [plans, priceOf])

  const chosenDuration =
    durationFilter === 'all' ||
    (durationFilter !== null && durationOptions.includes(durationFilter))
      ? durationFilter
      : null
  const activeDuration: number | 'all' = chosenDuration ?? 'all'
  const visiblePlans =
    activeDuration === 'all'
      ? plans
      : plans.filter(
          (p) =>
            priceOf(p.name).months === activeDuration ||
            formData.selectedPackages?.includes(p.id),
        )

  const paymentError =
    canEnterPaymentId && currentPaymentCheck?.status === 'failed'
      ? currentPaymentCheck.message || ''
      : ''
  const paidOn =
    paymentVerified && currentPaymentCheck?.paidAt
      ? new Date(currentPaymentCheck.paidAt)
      : null

  /* ─── Section completion (drives stepper checkmarks & locking) ─── */
  const businessComplete =
    !!formData.ownerName &&
    !!formData.businessName &&
    !!formData.email &&
    validateEmail(formData.email) &&
    !!formData.phoneNumber &&
    validatePhoneNumber(formData.phoneNumber) &&
    !!(formData.city || cityInput).trim() &&
    !!formData.onboardingCity

  const packagesComplete =
    paymentVerified && (formData.selectedPackages?.length || 0) > 0

  const financialComplete = (() => {
    if (!formData.paymentType || !formData.totalAmount || !formData.amountPaid)
      return false
    if (!isValidServiceMonths(formData.expirationInMonths)) return false
    if (formData.paymentType === 'part-time') {
      if (!formData.amountRemaining || !formData.remainingAmountDueDate)
        return false
      const paid = parseInt(formData.amountPaid) || 0
      const remaining = parseInt(formData.amountRemaining) || 0
      if (paid > remaining) return false
    }
    if (!formData.invoiceOption) return false
    if (formData.invoiceOption === 'gstin' && !formData.gstinForInvoice)
      return false
    if (formData.invoiceOption === 'address' && !formData.completeAddress)
      return false
    return true
  })()

  const finalComplete = !!formData.salesPersonName && !!formData.leadType

  const sectionStatus: Record<SectionId, boolean> = {
    business: businessComplete,
    packages: packagesComplete,
    financial: financialComplete,
    final: finalComplete,
  }

  /* A step opens only once the one before it is complete. */
  const unlocked: Record<SectionId, boolean> = {
    business: true,
    packages: businessComplete,
    financial: packagesComplete,
    final: financialComplete,
  }

  const lockedMessages: Record<SectionId, string> = {
    business: '',
    packages: 'Please complete Business Details in Step 1 first.',
    financial: 'Please verify payment and select your package in Step 2 first.',
    final: 'Please complete Financial Information in Step 3 first.',
  }

  const completedCount = Object.values(sectionStatus).filter(Boolean).length
  const progressPct = Math.round((completedCount / SECTIONS.length) * 100)
  const selectedCount = formData.selectedPackages?.length || 0

  const activeIndex = SECTIONS.findIndex((s) => s.id === activeStep)
  const isLastStep = activeIndex === SECTIONS.length - 1
  const activeComplete = sectionStatus[activeStep]
  const isFirstPage = activeIndex < 2
  const pageNumber = isFirstPage ? 1 : 2
  const pageComplete = isFirstPage
    ? businessComplete && packagesComplete
    : financialComplete && finalComplete
  const pageTitle = isFirstPage ? 'Business & package' : 'Payment & final details'
  const pageSubtitle = isFirstPage
    ? 'Customer details, payment verification and plan'
    : 'Amounts, invoice, sales info and review'
  const requiredFieldsLeft = isFirstPage
    ? [
        !formData.ownerName.trim(),
        !formData.businessName.trim(),
        !validateEmail(formData.email),
        !validatePhoneNumber(formData.phoneNumber),
        !(formData.city || cityInput).trim(),
        !paymentVerified,
        selectedCount === 0,
      ].filter(Boolean).length
    : [!financialComplete, !formData.salesPersonName, !formData.leadType].filter(Boolean).length

  const handleStepClick = useCallback(
    (id: SectionId) => {
      if (!unlocked[id]) {
        showToast({
          title: 'Step locked',
          description: 'Finish the previous step to open this one.',
          variant: 'default',
        })
        return
      }
      goToStep(id)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [businessComplete, packagesComplete, financialComplete, goToStep, showToast],
  )

  /* Auto-advance (UI only): once a step becomes complete and the user has been
     typing in it, move on after a short pause. Re-arms when the step is incomplete again. */
  useEffect(() => {
    if (autoAdvanceTimer.current) {
      window.clearTimeout(autoAdvanceTimer.current)
      autoAdvanceTimer.current = null
    }
    if (!activeComplete) {
      autoAdvanceArmed.current[activeStep] = true
      return
    }
    if (
      !skipAutoAdvanceRef.current &&
      AUTO_ADVANCE[activeStep] &&
      !isLastStep &&
      autoAdvanceArmed.current[activeStep]
    ) {
      const nextId = SECTIONS[activeIndex + 1].id
      autoAdvanceTimer.current = window.setTimeout(() => {
        autoAdvanceArmed.current[activeStep] = false
        goToStep(nextId)
      }, AUTO_ADVANCE_DELAY_MS)
    }
    return () => {
      if (autoAdvanceTimer.current) {
        window.clearTimeout(autoAdvanceTimer.current)
        autoAdvanceTimer.current = null
      }
    }
  }, [
    activeStep,
    activeIndex,
    activeComplete,
    isLastStep,
    formData,
    cityInput,
    goToStep,
  ])

  /* ─── Combined validation — same rules/order/messages as before ─── */
  const handleFinalSubmit = useCallback(() => {
    // 1. Business details
    const errors = { ...INITIAL_VALIDATION_ERRORS }
    let hasErrors = false
    const requiredStep1Fields = [
      'ownerName',
      'businessName',
      'email',
      'phoneNumber',
      'city',
      'websiteRequired',
    ]
    const missingFields: string[] = []
    const fieldNames: Record<string, string> = {
      ownerName: 'Client Name',
      businessName: 'Business Name',
      email: 'Email',
      phoneNumber: 'Phone Number',
      city: 'City',
      expirationInMonths: 'Service Months',
      websiteRequired: 'Website Included',
      remark: 'Remark',
    }

    requiredStep1Fields.forEach((field) => {
      if (field === 'city') {
        if (!(formData.city || cityInput || '').trim()) {
          hasErrors = true
          missingFields.push('City')
        }
      } else if (!(formData[field as keyof typeof formData] as string)) {
        hasErrors = true
        missingFields.push(fieldNames[field] || field)
      }
    })

    if (!formData.email || !validateEmail(formData.email)) {
      errors.email = formData.email
        ? 'Email field: Please enter a valid email address'
        : 'Email field is required'
      hasErrors = true
    }
    if (!formData.phoneNumber || !validatePhoneNumber(formData.phoneNumber)) {
      errors.phoneNumber = formData.phoneNumber
        ? 'Phone Number field: Please enter a valid 10-digit phone number'
        : 'Phone Number field is required'
      hasErrors = true
    }
    if (!formData.city || !formData.city.trim()) {
      errors.city = 'City field is required'
      hasErrors = true
    }
    if (!formData.onboardingCity) {
      hasErrors = true
      missingFields.push('Onboarding City')
    }

    if (hasErrors) {
      setValidationErrors(errors)
      setTouchedFields(new Set(requiredStep1Fields))
      showToast({
        title: 'Validation Error',
        description:
          missingFields.length > 0
            ? `Missing or invalid fields: ${missingFields.join(', ')}`
            : 'Please fill all required fields correctly.',
        variant: 'destructive',
      })
      scrollToSection('business')
      return
    }

    if (cityInput.trim() && cityInput.trim() !== formData.city) {
      handleInputChange('city', cityInput.trim())
    }

    // 2. Packages
    if (!formData.selectedPackages || formData.selectedPackages.length === 0) {
      showToast({
        title: 'Selection Required',
        description: 'Please select at least one package',
        variant: 'destructive',
      })
      scrollToSection('packages')
      return
    }

    if (paymentVerified && verifiedPaymentAmount != null) {
      const currentTotal = parseInt(formData.totalAmount) || autoTotal
      if (currentTotal > verifiedPaymentAmount) {
        const extra = currentTotal - verifiedPaymentAmount
        showToast({
          title: 'Total Exceeds Verified Payment',
          description: `Total amount (₹${currentTotal.toLocaleString('en-IN')}) exceeds your verified payment of ₹${verifiedPaymentAmount.toLocaleString('en-IN')} by ₹${extra.toLocaleString('en-IN')}. Please adjust your packages to match the paid amount.`,
          variant: 'destructive',
        })
        scrollToSection('packages')
        return
      }
    }

    // 3. Financial info
    if (!isValidServiceMonths(formData.expirationInMonths)) {
      showToast({
        title: 'Service Months Required',
        description: 'Please enter service months between 1 and 60',
        variant: 'destructive',
      })
      scrollToSection('financial')
      return
    }

    if (formData.paymentType === 'part-time') {
      if (!formData.amountRemaining || !formData.remainingAmountDueDate) {
        showToast({
          title: 'Validation Error',
          description: 'Please fill all financial fields for part-time payment',
          variant: 'destructive',
        })
        scrollToSection('financial')
        return
      }
      const paid = parseInt(formData.amountPaid) || 0
      const total = parseInt(formData.totalAmount) || 0
      const remaining = total - paid
      if (paid > remaining) {
        showToast({
          title: 'Validation Error',
          description: `Amount Paid (₹${paid.toLocaleString('en-IN')}) must be less than or equal to Amount Remaining (₹${remaining.toLocaleString('en-IN')}) for part-time payment.`,
          variant: 'destructive',
        })
        scrollToSection('financial')
        return
      }
    }

    if (!formData.invoiceOption) {
      showToast({
        title: 'Invoice Required',
        description: 'Please provide either GSTIN or Complete Address',
        variant: 'destructive',
      })
      scrollToSection('financial')
      return
    }
    if (formData.invoiceOption === 'gstin' && !formData.gstinForInvoice) {
      showToast({
        title: 'GSTIN Required',
        description: 'Please enter GSTIN number',
        variant: 'destructive',
      })
      scrollToSection('financial')
      return
    }
    if (formData.invoiceOption === 'address' && !formData.completeAddress) {
      showToast({
        title: 'Address Required',
        description: 'Please enter complete address',
        variant: 'destructive',
      })
      scrollToSection('financial')
      return
    }

    const missingFinancial = [
      'paymentType',
      'totalAmount',
      'amountPaid',
    ].some((field) => !(formData[field as keyof typeof formData] as string))
    if (missingFinancial) {
      showToast({
        title: 'Validation Error',
        description: 'Please fill all required fields correctly',
        variant: 'destructive',
      })
      scrollToSection('financial')
      return
    }
    if (!paymentVerified) {
      showToast({
        title: 'Payment Not Verified',
        description: 'Please enter the payment ID and verify it',
        variant: 'destructive',
      })
      // The Payment ID field lives in the Packages step.
      scrollToSection('packages')
      return
    }

    // 4. Final details
    if (!formData.salesPersonName) {
      showToast({
        title: 'Sales Person Name Required',
        description: "Please enter the sales person's name",
        variant: 'destructive',
      })
      scrollToSection('final')
      return
    }
    if (!formData.leadType) {
      showToast({
        title: 'Lead Type Required',
        description: 'Please enter the lead type',
        variant: 'destructive',
      })
      scrollToSection('final')
      return
    }

    setShowPasskeyModal(true)
  }, [
    formData,
    cityInput,
    handleInputChange,
    showToast,
    scrollToSection,
    paymentVerified,
    verifiedPaymentAmount,
    autoTotal,
  ])

  /* ─── Passkey submit & registration ─── */
  const handlePasskeySubmit = useCallback(async () => {
    if (!passkey.trim()) {
      showToast({
        title: 'Passkey Required',
        description: 'Please enter the registration passkey',
        variant: 'destructive',
      })
      return
    }
    if (passkey !== REGISTRATION_PASSKEY) {
      showToast({
        title: 'Invalid Passkey',
        description:
          'The passkey you entered is incorrect. Please try again.',
        variant: 'destructive',
      })
      return
    }
    if (!paymentVerified) {
      showToast({
        title: 'Payment Not Verified',
        description: 'Please verify the payment ID before registering',
        variant: 'destructive',
      })
      setShowPasskeyModal(false)
      scrollToSection('packages')
      return
    }

    setIsSubmitting(true)

    try {
      const packageNames =
        formData.selectedPackages
          ?.map((pkgId) => {
            const pkg = plans.find((p) => p.id === pkgId)
            return pkg ? pkg.name.trim() : pkgId.trim()
          })
          .join(', ') || ''

      const isWebsiteIncluded = [
        'yes',
        '1',
        'true',
        '✓',
      ].includes(formData.websiteRequired.toLowerCase())
        ? 'yes'
        : 'no'
      const gstinOrAddress =
        formData.invoiceOption === 'gstin'
          ? formData.gstinForInvoice
          : formData.completeAddress

      const customerData = {
        clientName: formData.ownerName,
        businessName: formData.businessName,
        clientEmail: formData.email,
        clientNumber: formData.phoneNumber,
        city: formData.city,
        packageNames,
        serviceMonth: formData.expirationInMonths,
        salesPersonName: formData.salesPersonName,
        amountPaid:
          formData.paymentType === 'part-time'
            ? formData.amountPaid || '0'
            : verifiedPaymentAmount != null
              ? String(verifiedPaymentAmount)
              : formData.amountPaid || '0',
        totalAmountToBeTaken: formData.totalAmount || '0',
        leadType: formData.leadType,
        remark: formData.remark,
        isWebsiteIncluded,
        gstinOrAddress: gstinOrAddress || '',
        remainingAmountDueDate: formData.remainingAmountDueDate || '',
        whatsappGroupInviteLink: formData.groupLink,
        source: 'root',
        isWebinarClient: formData.isWebinarClient,
        onboardingCity: formData.onboardingCity,
        paymentId: formData.paymentId.trim(),
      }

      await registerCustomer(customerData)

      const submittedTotal = Number(formData.totalAmount) || autoTotal
      const submittedPaid =
        formData.paymentType === 'part-time'
          ? Number(formData.amountPaid) || 0
          : (verifiedPaymentAmount ?? Number(formData.amountPaid)) || 0
      setRegistrationSuccess({
        businessName: formData.businessName,
        registrationId: `MBG-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
        plan: packageNames || 'Selected plan',
        total: submittedTotal,
        paid: submittedPaid,
        balance: Math.max(0, submittedTotal - submittedPaid),
      })

      showToast({
        title: 'Registration Successful',
        description: 'Customer has been registered successfully!',
        variant: 'success',
      })
      setIsSubmitting(false)
      setShowPasskeyModal(false)
    } catch (error: any) {
      const errorMessage =
        error?.message ||
        'Failed to register customer. Please try again.'
      showToast({
        title: 'Registration Failed',
        description: errorMessage,
        variant: 'destructive',
      })
      setIsSubmitting(false)
    }
  }, [
    passkey,
    formData,
    plans,
    showToast,
    resetForm,
    paymentVerified,
    verifiedPaymentAmount,
    autoTotal,
    scrollToSection,
  ])

  const inputClass = (hasError?: boolean) =>
    `h-10 w-full rounded-[10px] border bg-white px-3 py-1 text-[13px] font-semibold text-slate-900 transition-all placeholder:text-slate-400 focus:outline-none focus:ring-[3px] disabled:cursor-not-allowed disabled:bg-slate-100 ${
      hasError
        ? 'border-red-400 bg-red-50/30 ring-1 ring-red-100 focus:ring-red-100'
        : 'border-[#e2e6ee] hover:border-slate-300 focus:border-[#2459e0] focus:ring-[#dde7ff]'
    }`

  const textareaClass =
    'w-full resize-none rounded-[10px] border border-[#e2e6ee] bg-white p-3 text-[13px] font-semibold text-slate-900 transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2459e0] focus:outline-none focus:ring-[3px] focus:ring-[#dde7ff]'

  /* Footer hint text */
  const footerHint = requiredFieldsLeft > 0
    ? `${requiredFieldsLeft} required field${requiredFieldsLeft === 1 ? '' : 's'} left`
    : isLastStep
    ? 'By registering, you agree to our Terms of Service and Privacy Policy.'
    : activeStep === 'packages' && selectedCount > 0
      ? `${selectedCount} selected · ₹${autoTotal.toLocaleString('en-IN')}${includeGst ? ' incl. GST' : ''}`
      : activeComplete
        ? 'All details filled'
        : 'Fill all required fields to continue'

  /* Plan shown in the docked features panel (derived live so it follows selection / GST changes) */
  const viewingPlan = viewingPlanId
    ? (plans.find((p) => p.id === viewingPlanId) ?? null)
    : null
  const panelOpen = activeStep === 'packages' && !!viewingPlan

  if (registrationSuccess) {
    const facts = [
      ['Plan', registrationSuccess.plan],
      ['Total', `₹${registrationSuccess.total.toLocaleString('en-IN')}`],
      ['Paid', `₹${registrationSuccess.paid.toLocaleString('en-IN')}`],
      [
        'Balance',
        registrationSuccess.balance
          ? `₹${registrationSuccess.balance.toLocaleString('en-IN')}`
          : 'Nil',
      ],
    ]

    return (
      <div className="rb-registration grid min-h-screen place-items-center bg-[#f4f6fb] p-4 text-slate-900">
        <style>{WIZARD_STYLES}</style>
        <section className="rb-step-in w-full max-w-[840px] rounded-[22px] border border-[#dfe4ed] bg-white px-6 py-10 sm:px-8 sm:py-11">
          <div className="mx-auto grid h-[108px] w-[108px] place-items-center rounded-full bg-[#dcfce7] text-[#16a34a]">
            <Check className="h-12 w-12 stroke-[2.4]" />
          </div>
          <div className="mt-5 text-center leading-tight">
            <h1 className="break-words text-[26px] font-bold text-slate-950">
              {registrationSuccess.businessName} is registered
            </h1>
            <p className="mt-1 text-base font-semibold text-slate-500">
              Registration ID{' '}
              <strong className="font-bold text-slate-950">
                {registrationSuccess.registrationId}
              </strong>
            </p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {facts.map(([label, value]) => (
              <div key={label} className="min-h-[78px] rounded-2xl bg-[#f7f9fd] px-5 py-3.5 leading-tight">
                <p className="text-sm font-semibold text-slate-500">{label}</p>
                <p className="mt-1 break-words text-lg font-bold text-slate-950">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-[#ffe19a] bg-[#fffbea] px-5 py-4 text-base font-semibold leading-relaxed text-[#8a5a00]">
            Assigned to an onboarding executive by round robin. The customer gets the confirmation link on WhatsApp and email.
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={resetForm} className="h-[62px] rounded-2xl border border-[#dfe4ed] bg-white px-6 text-base font-bold text-slate-900 transition-colors hover:bg-[#f7f9fd]">
              Register another business
            </button>
            <button type="button" onClick={() => navigate({ to: '/onboarding-head/customers' as never })} className="h-[62px] rounded-2xl bg-[#2459e0] px-6 text-base font-bold text-white transition-colors hover:bg-[#1a45b8]">
              Go to Customer List
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="rb-registration flex min-h-screen flex-col text-sm text-slate-900">
      <style>{WIZARD_STYLES}</style>

      {/* ─── Sticky header: back, title, progress ─── */}
      <header className="sticky top-0 z-30 border-b border-[#e6e9f0] bg-white/95 backdrop-blur">
        <div className="flex min-h-[58px] items-center gap-2.5 px-3 py-2 sm:px-4">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back()
              } else {
                navigate({ to: '/login' as never })
              }
            }}
            className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] border border-[#e6e9f0] text-slate-500 transition-colors hover:bg-[#f4f6fb] hover:text-slate-900"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div
            aria-label="MBG"
            className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[10px] bg-[#2459e0] text-[12px] font-bold text-white shadow-[inset_0_-3px_0_#ffc629]"
          >
            <span aria-hidden="true">M<span className="text-[#ffc629]">B</span>G</span>
          </div>
          <div className="mr-auto min-w-0 leading-tight">
            <h1 className="truncate text-base font-bold text-slate-900">Register your business</h1>
            <p className="truncate text-xs font-semibold text-slate-500">MBG Card · New customer</p>
          </div>
          <div className="hidden items-center gap-2 rounded-full bg-[#f4f6fb] px-2.5 py-1.5 sm:flex">
            <span className="h-1.5 w-[60px] overflow-hidden rounded-full bg-[#e2e6ee]">
              <span className="block h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </span>
            <span className="whitespace-nowrap text-xs font-bold tabular-nums text-[#1a45b8]">{completedCount}/{SECTIONS.length} done</span>
          </div>
          <button
            type="button"
            onClick={() => {
              window.location.href = '/hrm/login'
            }}
            className="hidden h-[34px] cursor-pointer items-center rounded-[10px] border border-[#e2e6ee] bg-white px-3 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-[#f4f6fb] md:inline-flex"
          >
            HRM Login
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: '/login' as never })}
            className="inline-flex h-[34px] cursor-pointer items-center rounded-[10px] bg-[#2459e0] px-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#1a45b8] sm:px-4"
          >
            Login
          </button>
        </div>
        <div className="h-0.5 bg-[#eef1f6] sm:hidden">
          <div
            className="h-full bg-[#2459e0] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1120px] flex-1 p-2.5 sm:p-4 lg:py-5">
        {/* ─── Left stepper rail ─── */}
        <aside className="hidden">
          {SECTIONS.map((s, k) => {
            const done = sectionStatus[s.id]
            const isActive = activeStep === s.id
            const isLocked = !unlocked[s.id]
            const Icon = s.icon
            return (
              <div key={s.id} className="flex min-w-[118px] flex-1 items-center lg:min-w-0 lg:flex-none lg:flex-col">
                <button
                  type="button"
                  title={s.title}
                  onClick={() => handleStepClick(s.id)}
                  aria-current={isActive ? 'step' : undefined}
                  className={`group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${
                    isLocked ? 'cursor-not-allowed' : 'cursor-pointer'
                  } ${isActive ? 'bg-[#eaf0ff]' : 'hover:bg-[#f7f9fd]'}`}
                >
                  <span
                    className={`grid h-[30px] w-[30px] flex-none place-items-center rounded-full border-[1.5px] transition-all duration-200 ${
                      done
                        ? `rb-pop border-emerald-500 bg-emerald-500 text-white ${
                            isActive ? 'shadow-[0_0_0_4px_#d1fae5]' : ''
                          }`
                        : isActive
                          ? 'border-[#2459e0] bg-[#2459e0] text-white shadow-[0_0_0_4px_#dde7ff]'
                          : isLocked
                            ? 'border-slate-200 bg-slate-50 text-slate-300'
                            : 'border-slate-300 bg-white text-slate-500 group-hover:border-blue-400 group-hover:text-blue-600'
                    }`}
                  >
                    {done ? (
                      <Check className="h-4 w-4 stroke-[3]" />
                    ) : isLocked ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </span>
                  <span
                    className={`min-w-0 truncate text-[13px] font-semibold leading-tight ${
                      isActive
                        ? 'text-slate-900'
                        : isLocked
                          ? 'text-slate-300'
                          : 'text-slate-500'
                    }`}
                  >
                    {s.title}
                  </span>
                </button>
                {k < SECTIONS.length - 1 && (
                  <span
                    className={`mx-1 h-0.5 flex-1 rounded-sm transition-colors duration-500 lg:my-0.5 lg:ml-[24px] lg:h-3 lg:w-0.5 lg:flex-none ${
                      done ? 'bg-emerald-400' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </aside>

        {/* ─── Step card ─── */}
        <main className="min-w-0 flex-1">
          <div
            key={activeStep}
            onInputCapture={() => {
              skipAutoAdvanceRef.current = false
            }}
            onChangeCapture={() => {
              skipAutoAdvanceRef.current = false
            }}
            className="rb-step-in flex min-h-[calc(100vh-100px)] flex-col overflow-hidden rounded-2xl border border-[#e6e9f0] bg-white"
          >
            {/* Card header */}
            <div className="relative flex items-center gap-3 border-b border-[#eef1f6] px-4 pb-5 pt-3.5 sm:px-[18px]">
              <span
                className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl text-base font-bold text-white ${
                  pageComplete ? 'bg-emerald-500' : 'bg-[#2459e0]'
                }`}
              >
                {pageComplete ? (
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                ) : (
                  pageNumber
                )}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-[19px] font-bold text-slate-900">
                  {pageTitle}
                </h2>
                <p className="text-xs font-semibold text-slate-500">
                  Page {pageNumber} of 2 · {pageSubtitle}
                </p>
              </div>
              {isFirstPage && unlocked.packages && (
                <span className="ml-auto flex items-center gap-2">
                  {selectedCount > 0 && (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                      {selectedCount} selected
                    </span>
                  )}
                  <RefreshButton
                    onRefresh={() =>
                      Promise.all([
                        plansQuery.refetch(),
                        amountsQuery.refetch(),
                      ])
                    }
                    isRefreshing={
                      plansQuery.isFetching || amountsQuery.isFetching
                    }
                    label="packages"
                  />
                </span>
              )}
              <div className="absolute bottom-2 left-[18px] right-[18px] grid grid-cols-2 gap-1.5">
                <span className="h-1 rounded-full bg-[#2459e0]" />
                <span className={`h-1 rounded-full ${pageNumber === 2 ? 'bg-[#2459e0]' : 'bg-[#e6e9f0]'}`} />
              </div>
            </div>

            {/* Card body */}
            <div className="flex-1 p-4 sm:p-[18px]">
              {!unlocked[activeStep] ? (
                <LockedNotice message={lockedMessages[activeStep]} />
              ) : (
                <>
                  {/* ═══ 1 — Business Details ═══ */}
                  {isFirstPage && (
                    <section className="space-y-4 pt-2">
                      <SectionHeading number={1} title="Business details" subtitle="Who the customer is" />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Client Name" htmlFor="ownerName" required>
                        <input
                          id="ownerName"
                          value={formData.ownerName}
                          onChange={(e) =>
                            handleInputChange('ownerName', e.target.value)
                          }
                          placeholder="Enter client name"
                          className={inputClass()}
                        />
                      </Field>
                      <Field label="Business Name" htmlFor="businessName" required>
                        <input
                          id="businessName"
                          value={formData.businessName}
                          onChange={(e) =>
                            handleInputChange('businessName', e.target.value)
                          }
                          placeholder="Enter business name"
                          className={inputClass()}
                        />
                      </Field>
                      <div className="sm:col-span-2">
                        <Field
                          label="Email"
                          htmlFor="email"
                          required
                          error={
                            shouldShowError('email')
                              ? validationErrors.email
                              : formData.email && !validateEmail(formData.email)
                                ? 'This email looks incomplete'
                                : ''
                          }
                        >
                          <input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) =>
                              handleInputChange('email', e.target.value)
                            }
                            onBlur={(e) => handleFieldBlur('email', e.target.value)}
                            placeholder="name@company.com"
                            className={inputClass(
                              shouldShowError('email') ||
                                (!!formData.email && !validateEmail(formData.email)),
                            )}
                          />
                        </Field>
                      </div>
                      <Field
                        label="Phone Number"
                        htmlFor="phoneNumber"
                        required
                        error={
                          shouldShowError('phoneNumber')
                            ? validationErrors.phoneNumber
                            : ''
                        }
                      >
                        <input
                          id="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={(e) =>
                            handleInputChange('phoneNumber', e.target.value)
                          }
                          onBlur={(e) =>
                            handleFieldBlur('phoneNumber', e.target.value)
                          }
                          placeholder="10-digit mobile number"
                          className={inputClass(shouldShowError('phoneNumber'))}
                        />
                      </Field>
                      <Field
                        label="City"
                        htmlFor="city"
                        required
                        error={
                          shouldShowError('city')
                            ? validationErrors.city || 'City field is required'
                            : ''
                        }
                      >
                        <div className="relative" ref={cityDropdownRef}>
                          <input
                            id="city"
                            value={cityInput}
                            onChange={(e) => handleCityChange(e.target.value)}
                            onBlur={() => {
                              setTouchedFields((prev) => new Set(prev).add('city'))
                              setValidationErrors((prev) => ({
                                ...prev,
                                city:
                                  !formData.city || !formData.city.trim()
                                    ? 'City field is required'
                                    : '',
                              }))
                            }}
                            onFocus={() => setShowCityDropdown(!!cityInput)}
                            placeholder="Search or enter city"
                            className={inputClass(shouldShowError('city'))}
                          />
                          {showCityDropdown && filteredCities.length > 0 && (
                            <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                              {filteredCities.slice(0, 10).map((city) => (
                                <div
                                  key={city}
                                  onClick={() => handleCitySelect(city)}
                                  className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-blue-50"
                                >
                                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                  {city}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </Field>
                      <div>
                        <span className="mb-1 block text-xs font-semibold text-slate-600">
                          Onboarding City <span className="text-red-500">*</span>
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {ONBOARDING_CITIES.map((city) => (
                            <ChoiceCard
                              key={city}
                              id={`onboarding-city-${city}`}
                              value={city}
                              selected={formData.onboardingCity === city}
                              label={city}
                              onSelect={(val) =>
                                handleInputChange('onboardingCity', val)
                              }
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="mb-1 block text-xs font-semibold text-slate-600">
                          Website Included <span className="text-red-500">*</span>
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <ChoiceCard
                            id="website-yes"
                            value="yes"
                            selected={formData.websiteRequired === 'yes'}
                            label="Yes"
                            onSelect={(val) =>
                              handleInputChange('websiteRequired', val)
                            }
                          />
                          <ChoiceCard
                            id="website-no"
                            value="no"
                            selected={formData.websiteRequired === 'no'}
                            label="No"
                            onSelect={(val) =>
                              handleInputChange('websiteRequired', val)
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <span className="mb-1 block text-xs font-semibold text-slate-600">
                          Is Webinar Client?
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <ChoiceCard
                            id="webinar-yes"
                            value="yes"
                            selected={formData.isWebinarClient.toLowerCase() === 'yes'}
                            label="Yes"
                            onSelect={(val) =>
                              handleInputChange('isWebinarClient', val.toUpperCase())
                            }
                          />
                          <ChoiceCard
                            id="webinar-no"
                            value="no"
                            selected={formData.isWebinarClient.toLowerCase() === 'no'}
                            label="No"
                            onSelect={(val) =>
                              handleInputChange('isWebinarClient', val.toUpperCase())
                            }
                          />
                        </div>
                      </div>
                      <div className="sm:col-span-2 min-[1100px]:col-span-4">
                        <Field
                          label="Remark (optional)"
                          htmlFor="remark"
                          hint={`${formData.remark.length}/1000`}
                        >
                          <textarea
                            id="remark"
                            value={formData.remark}
                            onChange={(e) =>
                              handleInputChange('remark', e.target.value)
                            }
                            placeholder="Any additional information"
                            rows={3}
                            className={textareaClass}
                          />
                        </Field>
                      </div>
                    </div></section>
                  )}

                  {/* ═══ 2 — Select Packages & Verify Payment ═══ */}
                  {isFirstPage && (
                    <section className="mt-5 border-t border-[#eef1f6] pt-5">
                      <SectionHeading number={2} title="Payment & package" subtitle="Verify the customer's payment ID first — only plans within the verified amount can be selected." />
                    <div className="mt-4 flex items-start gap-6">
                      <div className="min-w-0 flex-1">
                        <div className="mb-5 grid grid-cols-1 gap-4 min-[1100px]:grid-cols-2">
                          {/* Note: First verify payment, then select package */}
                          <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/90 p-3.5 text-xs text-blue-900">
                            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                            <div className="space-y-0.5">
                              <p className="font-bold text-blue-950">
                                Note: Firstly verify payment, then select package
                              </p>
                              <p className="leading-relaxed text-blue-700">
                                Please enter and verify the customer's payment ID
                                first. Once verified, you will be able to select
                                packages within your verified payment amount.
                              </p>
                            </div>
                          </div>

                          {/* Payment Verification Box */}
                          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                            <Field
                              label="Payment ID"
                              htmlFor="paymentId"
                              required
                              error={paymentError}
                              hint={
                                !canEnterPaymentId
                                  ? 'A valid 10-digit phone number in Step 1 is required to verify payment'
                                  : paymentVerified
                                    ? undefined
                                    : isVerifyingPayment
                                      ? 'Verifying payment with payment gateway…'
                                      : `Enter payment ID (e.g. pay_…) for phone number ${paymentPhone}`
                              }
                            >
                              <div className="flex gap-2">
                                <input
                                  id="paymentId"
                                  value={formData.paymentId}
                                  disabled={!canEnterPaymentId || isVerifyingPayment}
                                  onChange={(e) =>
                                    handleInputChange(
                                      'paymentId',
                                      e.target.value.replace(/\s/g, ''),
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault()
                                      void handleVerifyPayment()
                                    }
                                  }}
                                  placeholder={
                                    canEnterPaymentId
                                      ? 'Enter payment ID (e.g. pay_...)'
                                      : 'Enter phone number in Step 1 first'
                                  }
                                  className={`${inputClass(!!paymentError)} min-w-0 flex-1 ${
                                    paymentVerified
                                      ? 'border-emerald-400 bg-emerald-50/40'
                                      : ''
                                  }`}
                                />
                                <button
                                  type="button"
                                  onClick={() => void handleVerifyPayment()}
                                  disabled={
                                    !canEnterPaymentId ||
                                    !paymentIdInput ||
                                    isVerifyingPayment ||
                                    paymentVerified
                                  }
                                  className={`h-9 shrink-0 whitespace-nowrap rounded-md px-4 text-sm font-semibold transition-colors ${
                                    paymentVerified
                                      ? 'bg-emerald-600 text-white disabled:opacity-100'
                                      : 'bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400'
                                  }`}
                                >
                                  {paymentVerified ? (
                                    <span className="inline-flex items-center gap-1.5">
                                      <Check className="h-4 w-4" />
                                      Verified
                                    </span>
                                  ) : isVerifyingPayment ? (
                                    'Verifying…'
                                  ) : (
                                    'Verify Payment'
                                  )}
                                </button>
                              </div>
                              {paymentVerified && (
                                <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                                  <Check className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                                  <span>
                                    Payment Verified:{' '}
                                    <strong>
                                      ₹
                                      {verifiedPaymentAmount != null &&
                                        formatVerifiedRupees(verifiedPaymentAmount)}
                                    </strong>{' '}
                                    paid
                                    {paidOn &&
                                      !isNaN(paidOn.getTime()) &&
                                      ` on ${paidOn.toLocaleDateString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                      })}`}
                                  </span>
                                </div>
                              )}
                            </Field>
                          </div>
                        </div>

                        {!paymentVerified ? (
                          <div className="rounded-xl border-[1.5px] border-dashed border-slate-300 bg-slate-50/60 p-10 text-center text-sm text-slate-500">
                            <Lock className="mx-auto mb-2 h-5 w-5 text-slate-400" />
                            <p className="font-semibold text-slate-700">
                              Packages are locked
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              Please enter and verify the Payment ID above to view
                              and select available packages.
                            </p>
                          </div>
                        ) : isLoadingPlans && plans.length === 0 ? (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {[0, 1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className="h-[76px] animate-pulse rounded-xl border border-slate-200 bg-slate-50"
                              />
                            ))}
                          </div>
                        ) : plans.length === 0 ? (
                          <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                            <AlertCircle className="h-4 w-4 flex-shrink-0 text-slate-400" />
                            No packages available. Please contact administrator.
                          </div>
                        ) : (
                          <div
                            className={`transition-opacity ${plansRefreshing ? 'pointer-events-none opacity-60' : ''}`}
                            aria-busy={plansRefreshing}
                          >
                            {verifiedPaymentAmount != null && (
                              <div className="mb-3 flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                                <Check className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                                <span>
                                  Verified Payment:{' '}
                                  <strong>
                                    ₹{formatVerifiedRupees(verifiedPaymentAmount)}
                                  </strong>
                                  . Only packages within this amount can be selected.
                                </span>
                              </div>
                            )}
                            {durationOptions.length > 0 && (
                              <div className="my-3 flex flex-wrap items-center gap-1.5">
                                <span className="mr-1 text-xs font-semibold text-slate-500">
                                  Duration
                                </span>
                                {durationOptions.map((months) => (
                                  <FilterChip
                                    key={months}
                                    active={activeDuration === months}
                                    label={monthsLabel(months)}
                                    onClick={() => setDurationFilter(months)}
                                  />
                                ))}
                                <FilterChip
                                  active={activeDuration === 'all'}
                                  label="All plans"
                                  onClick={() => setDurationFilter('all')}
                                />
                              </div>
                            )}
                            <div
                              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                            >
                              {visiblePlans.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center text-sm text-slate-500 sm:col-span-2 min-[1100px]:col-span-full">
                                  No packages found for{' '}
                                  <span className="font-semibold text-slate-700">
                                    {typeof activeDuration === 'number'
                                      ? monthsLabel(activeDuration)
                                      : 'this selection'}
                                  </span>
                                  .
                                </div>
                              ) : (
                                visiblePlans.map((pkg) => {
                                  const isSelected =
                                    !!formData.selectedPackages?.includes(pkg.id)
                                  const price = priceOf(pkg.name)
                                  const pkgCost = includeGst
                                    ? price.withGst
                                    : price.amount
                                  const isExceedingPayment =
                                    verifiedPaymentAmount != null &&
                                    pkgCost > verifiedPaymentAmount
                                  const isViewingFeatures = viewingPlanId === pkg.id
                                  return (
                                    <div
                                      key={pkg.id}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onClick={() => {
                                        // Always open the feature list for review
                                        setViewingPlanId(pkg.id)

                                        if (isExceedingPayment) {
                                          showToast({
                                            title: 'Reviewing Package Features',
                                            description: `${pkg.name} (₹${pkgCost.toLocaleString('en-IN')}) exceeds verified payment of ₹${formatVerifiedRupees(verifiedPaymentAmount)}. Viewing features in the side panel.`,
                                            variant: 'default',
                                          })
                                          return
                                        }

                                        handlePackageToggle(pkg.id)
                                      }}
                                      className={`flex items-start gap-3 rounded-xl border p-3.5 transition-all ${
                                        isExceedingPayment
                                          ? 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-65'
                                          : isSelected
                                            ? 'cursor-pointer border-blue-500 bg-blue-50/50 shadow-[0_0_0_1px_#3b82f6]'
                                            : 'cursor-pointer border-slate-200 bg-slate-50/60 hover:border-blue-300 hover:bg-white'
                                      } ${
                                        isViewingFeatures
                                          ? 'shadow-[0_0_0_2px_#60a5fa,0_4px_10px_rgba(15,23,42,0.1)]'
                                          : ''
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        role="checkbox"
                                        aria-checked={isSelected}
                                        disabled={isExceedingPayment}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setViewingPlanId(pkg.id)
                                          if (!isExceedingPayment) {
                                            handlePackageToggle(pkg.id)
                                          }
                                        }}
                                        className={`mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
                                          isSelected
                                            ? 'border-blue-600 bg-blue-600 text-white'
                                            : 'border-slate-300 bg-white hover:border-blue-400'
                                        }`}
                                        aria-label={`Select ${pkg.name}`}
                                      >
                                        {isSelected && (
                                          <Check className="h-[11px] w-[11px] stroke-[3]" />
                                        )}
                                      </button>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                          <h3 className="break-words text-sm font-bold leading-snug text-slate-900">
                                            {pkg.name}
                                          </h3>
                                          {isSelected ? (
                                            <span className="flex-shrink-0 rounded-full bg-[#2459e0] px-3 py-1 text-xs font-bold text-white">
                                              Selected
                                            </span>
                                          ) : isExceedingPayment ? (
                                            <span className="flex-shrink-0 rounded border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                                              Exceeds payment
                                            </span>
                                          ) : (
                                            <span className="flex-shrink-0 rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-bold text-[#15803d]">
                                              Fits payment
                                            </span>
                                          )}
                                        </div>
                                        {(price.hasPrice || price.months > 0) && (
                                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tabular-nums text-slate-400">
                                            {price.hasPrice && (
                                              <span className="flex flex-wrap items-baseline gap-2">
                                                <span className="text-2xl font-bold text-slate-950">
                                                  ₹{price.withGst.toLocaleString('en-IN')}
                                                </span>
                                                <span className="text-xs font-semibold text-slate-400">
                                                  ₹{price.amount.toLocaleString('en-IN')} + 18% GST
                                                </span>
                                              </span>
                                            )}
                                            {price.months > 0 && (
                                              <span className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                                                {monthsLabel(price.months)}
                                              </span>
                                            )}
                                          </p>
                                        )}
                                        {(pkg.departments?.length || 0) > 0 && (
                                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                                            {pkg.departments.map((dept) => {
                                              const label = departmentLabel(dept)
                                              return (
                                                <span
                                                  key={dept}
                                                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-px text-xs font-semibold text-slate-700"
                                                >
                                                  <span
                                                    className={`h-1.5 w-1.5 rounded-full ${departmentDot(label)}`}
                                                  />
                                                  {label}
                                                </span>
                                              )
                                            })}
                                          </div>
                                        )}
                                        {price.featureList &&
                                          price.featureList.length > 0 && (
                                            <div
                                              className="mt-2.5"
                                              onClick={(e) => e.stopPropagation()}
                                              onMouseDown={(e) => e.stopPropagation()}
                                            >
                                              <button
                                                type="button"
                                                onClick={() => setViewingPlanId(pkg.id)}
                                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 transition-colors hover:border-emerald-400 hover:bg-emerald-100"
                                              >
                                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                <span>
                                                  Features ({price.featureList.length})
                                                </span>
                                              </button>
                                            </div>
                                          )}
                                      </div>
                                    </div>
                                  )
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ─── Docked features panel (overlay on narrow screens) ─── */}
                      {panelOpen && viewingPlan && (
                        <FeaturesPanel
                          panelRef={featuresPanelRef}
                          name={viewingPlan.name}
                          departments={viewingPlan.departments || []}
                          features={priceOf(viewingPlan.name).featureList || []}
                          amount={priceOf(viewingPlan.name).amount}
                          withGst={priceOf(viewingPlan.name).withGst}
                          hasPrice={priceOf(viewingPlan.name).hasPrice}
                          months={priceOf(viewingPlan.name).months}
                          cost={
                            includeGst
                              ? priceOf(viewingPlan.name).withGst
                              : priceOf(viewingPlan.name).amount
                          }
                          verifiedAmount={verifiedPaymentAmount}
                          selected={!!formData.selectedPackages?.includes(viewingPlan.id)}
                          onToggle={() => handlePackageToggle(viewingPlan.id)}
                          onClose={() => setViewingPlanId(null)}
                        />
                      )}
                    </div></section>
                  )}

                  {/* ═══ 3 — Financial Information ═══ */}
                  {!isFirstPage && (
                    <section className="space-y-4 pt-2">
                      <SectionHeading number={3} title="Payment details" subtitle="Amounts, payment type and invoice information" />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label
                          htmlFor="expirationInMonths"
                          className="block text-xs font-semibold text-slate-600"
                        >
                          Service Months <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="expirationInMonths"
                          type="number"
                          min="1"
                          max="60"
                          value={formData.expirationInMonths}
                          disabled={monthsLocked}
                          onChange={(e) =>
                            handleInputChange('expirationInMonths', e.target.value)
                          }
                          placeholder="1 to 60"
                          className={inputClass()}
                        />
                        <p className="text-[11px] text-slate-400">
                          {monthsLocked
                            ? selectedPlans.length > 1
                              ? 'Longest duration among the selected plans'
                              : "From the selected plan's duration"
                            : 'Fills automatically when the selected plan has a duration'}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <label
                            htmlFor="totalAmount"
                            className="block text-xs font-semibold text-slate-600"
                          >
                            Total Amount (₹) <span className="text-red-500">*</span>
                          </label>
                          <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-2 py-px text-xs font-semibold text-slate-600">
                            <span className="select-none">18% GST</span>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={includeGst}
                              aria-label="Toggle 18% GST"
                              onClick={() => setIncludeGst(!includeGst)}
                              className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-0 transition-colors duration-200 focus:outline-none ${
                                includeGst ? 'bg-blue-600' : 'bg-slate-300'
                              }`}
                            >
                              <span
                                className={`pointer-events-none absolute left-0.5 top-0.5 inline-block h-3 w-3 rounded-full bg-white shadow transition-transform duration-200 ${
                                  includeGst ? 'translate-x-3' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <span
                              className={`select-none text-[10px] font-bold ${
                                includeGst ? 'text-emerald-600' : 'text-slate-400'
                              }`}
                            >
                              {includeGst ? 'ON' : 'OFF'}
                            </span>
                          </div>
                        </div>
                        <input
                          id="totalAmount"
                          type="number"
                          min="0"
                          value={formData.totalAmount}
                          disabled={totalLocked}
                          onChange={(e) => {
                            const value = e.target.value
                            if (
                              value === '' ||
                              (/^\d+$/.test(value) && value.length <= 12)
                            ) {
                              handleInputChange('totalAmount', value)
                              const total = parseInt(value) || 0
                              const paid =
                                verifiedPaymentAmount != null
                                  ? verifiedPaymentAmount
                                  : parseInt(formData.amountPaid) || 0
                              const remaining = total - paid
                              handleInputChange(
                                'amountRemaining',
                                remaining > 0 ? remaining.toString() : '',
                              )
                              if (
                                formData.paymentType === 'full-time' &&
                                verifiedPaymentAmount == null
                              )
                                handleInputChange('amountPaid', value)
                            } else if (value.length > 12) {
                              showToast({
                                title: 'Amount Limit Exceeded',
                                description: 'Total amount cannot exceed 12 digits',
                                variant: 'destructive',
                              })
                            }
                          }}
                          placeholder={
                            selectedPlans.length === 0
                              ? 'Select a package'
                              : 'Enter total amount'
                          }
                          className={inputClass()}
                        />
                        <p className="text-[11px] text-slate-400">
                          {totalLocked
                            ? includeGst
                              ? 'Auto-calculated from the selected plans (incl. 18% GST)'
                              : 'Auto-calculated from the selected plans (excl. GST)'
                            : hasUnpricedSelection && selectedPlans.length > 0
                              ? 'A selected plan has no price set — enter the total'
                              : undefined}
                        </p>
                      </div>

                      <div>
                        <span className="mb-1 block text-xs font-semibold text-slate-600">
                          Payment Type <span className="text-red-500">*</span>
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <ChoiceCard
                            id="payment-full"
                            value="full-time"
                            selected={formData.paymentType === 'full-time'}
                            label="Full Time"
                            onSelect={(value) => {
                              handleInputChange('paymentType', value)
                              const fullPaid =
                                verifiedPaymentAmount != null
                                  ? String(verifiedPaymentAmount)
                                  : formData.totalAmount || ''
                              handleInputChange('amountPaid', fullPaid)
                              handleInputChange('amountRemaining', '')
                              handleInputChange('remainingAmountDueDate', '')
                            }}
                          />
                          <ChoiceCard
                            id="payment-part"
                            value="part-time"
                            selected={formData.paymentType === 'part-time'}
                            label="Part Time"
                            onSelect={(value) => {
                              handleInputChange('paymentType', value)
                              const initialPaid =
                                formData.amountPaid ||
                                (verifiedPaymentAmount != null
                                  ? String(verifiedPaymentAmount)
                                  : '')
                              handleInputChange('amountPaid', initialPaid)
                              const total = parseInt(formData.totalAmount) || 0
                              const remaining = total - (parseInt(initialPaid) || 0)
                              handleInputChange(
                                'amountRemaining',
                                remaining > 0 ? remaining.toString() : '',
                              )
                            }}
                          />
                        </div>
                      </div>

                      {(() => {
                        const isPartTime = formData.paymentType === 'part-time'
                        const paidNum = isPartTime
                          ? parseInt(formData.amountPaid) || 0
                          : verifiedPaymentAmount != null
                            ? verifiedPaymentAmount
                            : parseInt(formData.amountPaid) || 0
                        const remainingNum =
                          (parseInt(formData.totalAmount) || 0) - paidNum
                        const isPartTimeInvalid =
                          isPartTime &&
                          paidNum > 0 &&
                          remainingNum >= 0 &&
                          paidNum > remainingNum
                        const displayPaidValue = isPartTime
                          ? formData.amountPaid
                          : verifiedPaymentAmount != null
                            ? String(verifiedPaymentAmount)
                            : formData.totalAmount || ''
                        const isPaidDisabled = !isPartTime
                        return (
                          <Field
                            label="Amount Paid (₹)"
                            htmlFor="amountPaid"
                            required
                            error={
                              isPartTimeInvalid
                                ? `Amount Paid (₹${paidNum.toLocaleString('en-IN')}) must be ≤ Amount Remaining (₹${remainingNum.toLocaleString('en-IN')})`
                                : undefined
                            }
                            hint={
                              isPartTime
                                ? verifiedPaymentAmount != null
                                  ? `Editable for part-time (Verified: ₹${verifiedPaymentAmount.toLocaleString('en-IN')})`
                                  : undefined
                                : verifiedPaymentAmount != null
                                  ? 'Auto-filled from verified Payment ID'
                                  : 'Same as total for full payment'
                            }
                          >
                            <input
                              id="amountPaid"
                              type="number"
                              min="0"
                              value={displayPaidValue}
                              disabled={isPaidDisabled}
                              onChange={(e) => {
                                const value = e.target.value
                                if (value === '' || /^\d+$/.test(value)) {
                                  handleInputChange('amountPaid', value)
                                  const total = parseInt(formData.totalAmount) || 0
                                  const paid = parseInt(value) || 0
                                  const remaining = total - paid
                                  handleInputChange(
                                    'amountRemaining',
                                    remaining > 0 ? remaining.toString() : '',
                                  )
                                }
                              }}
                              placeholder="Enter paid amount"
                              className={inputClass(isPartTimeInvalid)}
                            />
                          </Field>
                        )
                      })()}

                      {formData.paymentType === 'part-time' && (
                        <>
                          <Field
                            label="Amount Remaining (₹)"
                            htmlFor="amountRemaining"
                            required
                            hint="Auto-calculated"
                          >
                            <input
                              id="amountRemaining"
                              type="number"
                              value={calculatedRemaining}
                              disabled
                              className={inputClass()}
                            />
                          </Field>
                          <Field
                            label="Remaining Amount Due Date"
                            htmlFor="remainingAmountDueDate"
                            required
                          >
                            <input
                              id="remainingAmountDueDate"
                              type="date"
                              value={formData.remainingAmountDueDate}
                              onChange={(e) =>
                                handleInputChange(
                                  'remainingAmountDueDate',
                                  e.target.value,
                                )
                              }
                              className={inputClass()}
                            />
                          </Field>
                        </>
                      )}

                      <div>
                        <span className="mb-1 block text-xs font-semibold text-slate-600">
                          Invoice Details <span className="text-red-500">*</span>
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <ChoiceCard
                            id="invoice-gstin"
                            value="gstin"
                            selected={formData.invoiceOption === 'gstin'}
                            label="GSTIN"
                            onSelect={(value) => {
                              handleInputChange('invoiceOption', value)
                              handleInputChange('completeAddress', '')
                            }}
                          />
                          <ChoiceCard
                            id="invoice-address"
                            value="address"
                            selected={formData.invoiceOption === 'address'}
                            label="Address"
                            onSelect={(value) => {
                              handleInputChange('invoiceOption', value)
                              handleInputChange('gstinForInvoice', '')
                            }}
                          />
                        </div>
                      </div>
                      {formData.invoiceOption === 'gstin' && (
                        <div className="sm:col-span-2">
                          <Field
                            label="GSTIN Number"
                            htmlFor="gstinForInvoice"
                            required
                            hint="15 characters, uppercase"
                            error={
                              shouldShowError('gstin') ? validationErrors.gstin : ''
                            }
                          >
                            <input
                              id="gstinForInvoice"
                              value={formData.gstinForInvoice}
                              onChange={(e) =>
                                handleInputChange('gstinForInvoice', e.target.value)
                              }
                              onBlur={(e) =>
                                handleFieldBlur('gstinForInvoice', e.target.value)
                              }
                              placeholder="e.g. 22AAAAA0000A1Z5"
                              className={inputClass(shouldShowError('gstin'))}
                            />
                          </Field>
                        </div>
                      )}
                      {formData.invoiceOption === 'address' && (
                        <div className="sm:col-span-2">
                          <Field
                            label="Complete Address"
                            htmlFor="completeAddress"
                            required
                          >
                            <textarea
                              id="completeAddress"
                              value={formData.completeAddress}
                              onChange={(e) =>
                                handleInputChange('completeAddress', e.target.value)
                              }
                              placeholder="Enter complete billing address"
                              rows={3}
                              className={textareaClass}
                            />
                          </Field>
                        </div>
                      )}
                    </div></section>
                  )}

                  {/* ═══ 4 — Final Details ═══ */}
                  {!isFirstPage && (
                    <section className="mt-5 border-t border-[#eef1f6] pt-5">
                      <SectionHeading number={4} title="Sales & handoff" subtitle="Final details before registration" />
                    <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 min-[1100px]:grid-cols-3">
                      <Field
                        label="Sales Person Name"
                        htmlFor="salesPersonName"
                        required
                      >
                        <input
                          id="salesPersonName"
                          value={formData.salesPersonName}
                          onChange={(e) =>
                            handleInputChange('salesPersonName', e.target.value)
                          }
                          placeholder="Enter sales person's name"
                          className={inputClass()}
                        />
                      </Field>
                      <Field label="Lead Type" htmlFor="leadType" required>
                        <input
                          id="leadType"
                          value={formData.leadType}
                          onChange={(e) =>
                            handleInputChange('leadType', e.target.value)
                          }
                          placeholder="e.g. 99, 699, 999"
                          className={inputClass()}
                        />
                      </Field>
                      <Field
                        label="WhatsApp Group Link (optional)"
                        htmlFor="groupLink"
                      >
                        <input
                          id="groupLink"
                          type="url"
                          value={formData.groupLink}
                          onChange={(e) =>
                            handleInputChange('groupLink', e.target.value)
                          }
                          placeholder="https://chat.whatsapp.com/…"
                          className={inputClass()}
                        />
                      </Field>
                    </div></section>
                  )}
                </>
              )}
            </div>

            {/* Card footer: Previous / hint / Continue (or Complete Registration) */}
            <div className="flex items-center justify-between gap-3 border-t border-[#eef1f6] px-4 py-3 sm:px-[18px]">
              <button
                type="button"
                onClick={() => goToStep('packages')}
                className={`h-10 cursor-pointer rounded-xl border border-[#e2e6ee] bg-white px-4 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-[#f4f6fb] ${
                  isFirstPage ? 'invisible' : ''
                }`}
              >
                ← Previous
              </button>
              <div className="flex items-center gap-4">
                <p className="hidden text-xs text-slate-400 sm:block">
                  {footerHint}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    !isFirstPage
                      ? handleFinalSubmit()
                      : goToStep('financial')
                  }
                  disabled={!pageComplete}
                  className="h-10 cursor-pointer rounded-xl bg-[#2459e0] px-[18px] text-[13px] font-semibold text-white transition-colors hover:bg-[#1a45b8] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-white"
                >
                  {!isFirstPage ? 'Complete Registration' : 'Continue →'}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ─── Passkey modal ─── */}
      {showPasskeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Hash className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Enter Passkey
                </h3>
                <p className="text-xs text-slate-500">
                  Required to complete the registration.
                </p>
              </div>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePasskeySubmit()}
                placeholder="Enter passkey"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowPasskeyModal(false)
                  setPasskey('')
                }}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePasskeySubmit}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                disabled={isSubmitting || !passkey.trim()}
              >
                {isSubmitting ? 'Registering...' : 'Register'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Toast notification ─── */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`rb-panel-in fixed right-4 top-4 z-[80] max-w-sm rounded-xl border px-4 py-3 shadow-lg ${
            toast.variant === 'destructive'
              ? 'border-red-200 bg-red-50 text-red-900'
              : toast.variant === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-slate-200 bg-white text-slate-900'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {toast.variant === 'destructive' ? (
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
            ) : toast.variant === 'success' ? (
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 text-xs opacity-90">{toast.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Presentational subcomponents
   ───────────────────────────────────────────────────────────────── */

function SectionHeading({
  number,
  title,
  subtitle,
}: {
  number: number
  title: string
  subtitle: string
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-[#e8efff] text-[13px] font-bold text-[#1a45b8]">
        {number}
      </span>
      <div className="min-w-0 leading-tight">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <p className="text-xs font-semibold text-slate-500">{subtitle}</p>
      </div>
    </div>
  )
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
        active
          ? 'border-blue-600 bg-blue-600 text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
      }`}
    >
      {label}
    </button>
  )
}

function LockedNotice({ message }: { message: string }) {
  return (
    <div className="rounded-xl border-[1.5px] border-dashed border-slate-300 bg-slate-50/60 p-10 text-center text-sm text-slate-500">
      <Lock className="mx-auto mb-2 h-5 w-5 text-slate-400" />
      <p className="font-semibold text-slate-700">
        {message || 'Please complete the previous step first.'}
      </p>
      <p className="mt-1 text-xs text-slate-400">
        This step will unlock automatically once previous step details are
        filled.
      </p>
    </div>
  )
}

function FeaturesPanel({
  panelRef,
  name,
  departments,
  features,
  amount,
  withGst,
  hasPrice,
  months,
  cost,
  verifiedAmount,
  selected,
  onToggle,
  onClose,
}: {
  panelRef: React.RefObject<HTMLElement | null>
  name: string
  departments: string[]
  features: string[]
  amount: number
  withGst: number
  hasPrice: boolean
  months: number
  cost: number
  verifiedAmount: number | null
  selected: boolean
  onToggle: () => void
  onClose: () => void
}) {
  const exceeding = verifiedAmount != null && cost > verifiedAmount
  return (
    <aside
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label="Included Features"
      className="rb-panel-in sticky top-[82px] z-10 flex h-[calc(100vh-120px)] w-[380px] flex-none flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_25px_rgba(15,23,42,0.1)] max-[1100px]:fixed max-[1100px]:inset-y-0 max-[1100px]:right-0 max-[1100px]:top-0 max-[1100px]:z-50 max-[1100px]:h-auto max-[1100px]:w-[88vw] max-[1100px]:max-w-[400px] max-[1100px]:rounded-none"
    >
      {/* Header */}
      <div className="flex justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3.5">
        <div className="min-w-0">
          <h3 className="break-words text-sm font-bold text-slate-900">{name}</h3>
          {(hasPrice || months > 0) && (
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tabular-nums text-slate-400">
              {hasPrice && (
                <span>
                  <span className="text-sm font-bold text-emerald-600">
                    ₹{amount.toLocaleString('en-IN')}
                  </span>{' '}
                  +18% = ₹{withGst.toLocaleString('en-IN')}
                </span>
              )}
              {months > 0 && (
                <span className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                  {monthsLabel(months)}
                </span>
              )}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close features"
          className="flex h-7 w-7 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-4 select-text [scrollbar-width:thin]">
        {exceeding && verifiedAmount != null && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/90 p-2.5 text-xs text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-amber-950">
                Package exceeds verified payment
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800">
                Price: ₹{cost.toLocaleString('en-IN')} (verified: ₹
                {formatVerifiedRupees(verifiedAmount)}). Review only.
              </p>
            </div>
          </div>
        )}

        {departments.length > 0 && (
          <>
            <p className="mb-1.5 text-[11px] font-semibold text-slate-500">
              Departments
            </p>
            <div className="mb-3.5 flex flex-wrap gap-1.5">
              {departments.map((dept) => {
                const label = departmentLabel(dept)
                return (
                  <span
                    key={dept}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-px text-xs font-semibold text-slate-700"
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${departmentDot(label)}`}
                    />
                    {label}
                  </span>
                )
              })}
            </div>
          </>
        )}

        <p className="mb-1.5 text-[11px] font-semibold text-slate-500">
          {features.length} features included
        </p>
        {features.length > 0 ? (
          features.map((feature, idx) => (
            <div
              key={idx}
              className="mb-1.5 flex items-start gap-2 rounded-lg border border-slate-200/70 bg-slate-50/70 p-2.5 text-xs font-semibold text-slate-700"
            >
              <span className="mt-0.5 flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check className="h-2 w-2 stroke-[3.5]" />
              </span>
              <span className="break-words leading-relaxed">{feature}</span>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-2.5 text-xs text-slate-400">
            No features are listed for this plan.
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 bg-slate-50/80 p-3">
        <button
          type="button"
          onClick={onToggle}
          disabled={exceeding && !selected}
          className={`h-9 w-full cursor-pointer rounded-xl text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 ${
            selected
              ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {selected
            ? 'Remove from selection'
            : exceeding
              ? 'Exceeds verified payment'
              : 'Select this plan'}
        </button>
      </div>
    </aside>
  )
}

function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={htmlFor}
        className="block text-xs font-semibold text-slate-600"
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-slate-400">{hint}</p>
      ) : null}
    </div>
  )
}

function ChoiceCard({
  id,
  value,
  selected,
  label,
  onSelect,
}: {
  id: string
  value: string
  selected: boolean
  label: string
  onSelect: (val: string) => void
}) {
  return (
    <label
      htmlFor={id}
      onClick={() => onSelect(value)}
      className={`flex h-10 cursor-pointer items-center gap-2 rounded-[10px] border px-3 text-[13px] font-semibold transition-all ${
        selected
          ? 'border-[#2459e0] bg-[#f4f7ff] text-[#1a45b8] shadow-[0_0_0_3px_#e8efff]'
          : 'border-[#e2e6ee] bg-white text-slate-700 hover:border-blue-300'
      }`}
    >
      <input
        type="radio"
        id={id}
        name={id}
        value={value}
        checked={selected}
        onChange={() => onSelect(value)}
        className="m-0 h-4 w-4 accent-blue-600"
      />
      <span className="truncate">{label}</span>
    </label>
  )
}

// Payment verification returns rupees. Razorpay and payment_info store the same
// value in paise, so never render that database value directly in this form.
const formatVerifiedRupees = (amount: number): string =>
  amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
