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

/* ─────────────────────────────────────────────────────────────────
   Single-page version of the "Register Your Business" form from SMSF
   (RegisterBusiness.tsx). Exact copy of UI, layout, step-locking,
   payment verification, GST toggle, package selection, and passkey
   submission directly to backend.
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

const SECTIONS: { id: SectionId; label: string; icon: typeof Building2 }[] = [
  { id: 'business', label: 'Business Details', icon: Building2 },
  { id: 'packages', label: 'Packages', icon: Package },
  { id: 'financial', label: 'Financial Info', icon: Wallet },
  { id: 'final', label: 'Final Details', icon: ClipboardList },
]

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

const monthsLabel = (months: number) =>
  `${months} month${months === 1 ? '' : 's'}`

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

  /* Plan duration filter. null = default 15-months plans if exist. */
  const [durationFilter, setDurationFilter] = useState<number | 'all' | null>(null)
  /* Toggle 18% GST addition on packages */
  const [includeGst, setIncludeGst] = useState(true)

  /* Currently viewed plan's features in modal */
  const [viewingFeaturesPlan, setViewingFeaturesPlan] = useState<{
    name: string
    features: string[]
  } | null>(null)

  const featuresDrawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!viewingFeaturesPlan) return
    const handleClickOutside = (e: MouseEvent) => {
      if (featuresDrawerRef.current && !featuresDrawerRef.current.contains(e.target as Node)) {
        setViewingFeaturesPlan(null)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewingFeaturesPlan(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [viewingFeaturesPlan])

  // Internal toast notification
  const [toast, setToast] = useState<ToastMessage | null>(null)
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

  const businessRef = useRef<HTMLDivElement>(null)
  const packagesRef = useRef<HTMLDivElement>(null)
  const financialRef = useRef<HTMLDivElement>(null)
  const finalRef = useRef<HTMLDivElement>(null)

  const scrollToSection = useCallback((id: SectionId) => {
    const refs: Record<SectionId, React.RefObject<HTMLDivElement | null>> = {
      business: businessRef,
      packages: packagesRef,
      financial: financialRef,
      final: finalRef,
    }
    refs[id].current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

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
    setFormData({ ...INITIAL_FORM_DATA })
    setValidationErrors({ ...INITIAL_VALIDATION_ERRORS })
    setTouchedFields(new Set())
    setCityInput('')
    setPasskey('')
    setDurationFilter(null)
    setIncludeGst(true)
    setViewingFeaturesPlan(null)
    setPaymentCheck(null)
  }, [])

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
      const amount =
        (Number(row?.amount) || 0) + (Number(row?.additionalAmount) || 0)
      return {
        amount,
        withGst: Math.round(amount * (1 + GST_RATE)),
        hasPrice: row?.amount != null || row?.additionalAmount != null,
        months: Number(row?.durationMonths) || 0,
        featureList: row?.featureList ?? [],
      }
    },
    [planAmounts],
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
          showToast({
            title: 'Package Exceeds Verified Amount',
            description: `${pkg.name} price (₹${pkgPrice.toLocaleString('en-IN')}) exceeds verified payment of ₹${formatVerifiedRupees(verifiedPaymentAmount)}`,
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

        if (otherSelectedCost + pkgPrice > verifiedPaymentAmount) {
          showToast({
            title: 'Total Exceeds Verified Amount',
            description: `Total amount (₹${(otherSelectedCost + pkgPrice).toLocaleString('en-IN')}) cannot exceed verified payment of ₹${formatVerifiedRupees(verifiedPaymentAmount)}`,
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

  /* Duration filter for the plan cards */
  const durationOptions = useMemo(() => {
    return Array.from(
      new Set(plans.map((p) => priceOf(p.name).months).filter((m) => m > 0)),
    ).sort((x, y) => x - y)
  }, [plans, priceOf])

  const chosenDuration =
    durationFilter === 'all' ||
    (durationFilter !== null && durationOptions.includes(durationFilter))
      ? durationFilter
      : null
  const activeDuration: number | 'all' =
    chosenDuration ??
    (durationOptions.includes(DEFAULT_PLAN_MONTHS)
      ? DEFAULT_PLAN_MONTHS
      : 'all')
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

  /* ─── Section completion (drives sticky nav checkmarks & locking) ─── */
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

  const completedCount = Object.values(sectionStatus).filter(Boolean).length
  const progressPct = Math.round((completedCount / SECTIONS.length) * 100)
  const selectedCount = formData.selectedPackages?.length || 0

  /* ─── Combined validation — same rules/order/messages as SMSF ─── */
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
        showToast({
          title: 'Amount Exceeds Verified Payment',
          description: `Total amount (₹${currentTotal.toLocaleString('en-IN')}) cannot exceed your verified payment of ₹${formatVerifiedRupees(verifiedPaymentAmount)}.`,
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
      scrollToSection('financial')
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
      scrollToSection('financial')
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

      showToast({
        title: 'Registration Successful',
        description: 'Customer has been registered successfully!',
        variant: 'success',
      })
      resetForm()
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
    scrollToSection,
  ])

  const inputClass = (hasError?: boolean) =>
    `h-9 w-full rounded-md border bg-white px-3 py-1 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      hasError ? 'border-red-500 ring-1 ring-red-200' : 'border-slate-200 hover:border-slate-300'
    }`

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* ─── Sticky header: back, title, progress ─── */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back()
                } else {
                  navigate({ to: '/login' as never })
                }
              }}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="flex min-w-0 items-center gap-2">
              <img
                src="https://www.mbgcard.in/mbg_logo.png"
                alt="MBG logo"
                className="h-7 w-7 flex-shrink-0 rounded-lg"
              />
              <h1 className="truncate font-bold text-slate-900">
                Register Your Business
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            <span className="hidden sm:inline-block whitespace-nowrap rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-500">
              {completedCount}/{SECTIONS.length} done
            </span>
            <button
              type="button"
              onClick={() => { window.location.href = '/hrm/login' }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition-all hover:bg-blue-700 cursor-pointer"
            >
              HRM Login
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: '/login' as never })}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition-all hover:bg-blue-700 cursor-pointer"
            >
              Login
            </button>
          </div>
        </div>
        <div className="h-0.5 bg-slate-100">
          <div
            className="h-full bg-blue-600 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-4 px-4 py-5 sm:px-6">
        {/* ═══ 1 — Business Details ═══ */}
        <Section
          innerRef={businessRef}
          index={1}
          title="Business Details"
          complete={businessComplete}
        >
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Client Name" htmlFor="ownerName" required>
              <input
                id="ownerName"
                value={formData.ownerName}
                onChange={(e) => handleInputChange('ownerName', e.target.value)}
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
            <Field
              label="Email"
              htmlFor="email"
              required
              error={
                shouldShowError('email') ? validationErrors.email : ''
              }
            >
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onBlur={(e) => handleFieldBlur('email', e.target.value)}
                placeholder="name@company.com"
                className={inputClass(shouldShowError('email'))}
              />
            </Field>
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
                onBlur={(e) => handleFieldBlur('phoneNumber', e.target.value)}
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
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Onboarding City <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ONBOARDING_CITIES.map((city) => (
                  <ChoiceCard
                    key={city}
                    id={`onboarding-city-${city}`}
                    value={city}
                    selected={formData.onboardingCity === city}
                    label={city}
                    onSelect={(val) => handleInputChange('onboardingCity', val)}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Website Included <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <ChoiceCard
                  id="website-yes"
                  value="yes"
                  selected={formData.websiteRequired === 'yes'}
                  label="Yes"
                  onSelect={(val) => handleInputChange('websiteRequired', val)}
                />
                <ChoiceCard
                  id="website-no"
                  value="no"
                  selected={formData.websiteRequired === 'no'}
                  label="No"
                  onSelect={(val) => handleInputChange('websiteRequired', val)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Is Webinar Client?
              </label>
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
            <div className="sm:col-span-2 lg:col-span-3">
              <Field
                label="Remark (optional)"
                htmlFor="remark"
                hint={`${formData.remark.length}/1000`}
              >
                <textarea
                  id="remark"
                  value={formData.remark}
                  onChange={(e) => handleInputChange('remark', e.target.value)}
                  placeholder="Any additional information"
                  rows={2}
                  className="w-full resize-none rounded-md border border-slate-200 bg-white p-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>
            </div>
          </div>
        </Section>

        {/* ═══ 2 — Select Packages & Verify Payment ═══ */}
        <Section
          innerRef={packagesRef}
          index={2}
          title="Select Packages"
          complete={packagesComplete}
          locked={!businessComplete}
          lockedMessage="Please complete Business Details in Step 1 first."
          aside={
            selectedCount > 0 ? (
              <span className="text-xs font-semibold text-blue-600">
                {selectedCount} selected
              </span>
            ) : null
          }
        >
          {/* Note: First verify payment, then select package */}
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-blue-200/80 bg-blue-50/90 p-3.5 text-xs text-blue-900 shadow-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
            <div className="space-y-0.5">
              <p className="font-bold text-blue-950">
                Note: Firstly verify payment, then select package
              </p>
              <p className="leading-relaxed text-blue-700">
                Please enter and verify the customer's payment ID first. Once
                verified, you will be able to select packages within your
                verified payment amount.
              </p>
            </div>
          </div>

          {/* Payment Verification Box */}
          <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
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
                  className={`${inputClass(!!paymentError)} flex-1 ${
                    !canEnterPaymentId ? 'cursor-not-allowed bg-slate-100' : ''
                  } ${paymentVerified ? 'border-emerald-400 bg-emerald-50/40' : ''}`}
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
                  className={`h-9 shrink-0 rounded-md px-4 text-sm font-semibold transition-colors ${
                    paymentVerified
                      ? 'bg-emerald-600 text-white hover:bg-emerald-600 disabled:opacity-100'
                      : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
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
                      ₹{verifiedPaymentAmount != null && formatVerifiedRupees(verifiedPaymentAmount)}
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

          {!paymentVerified ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center text-sm text-slate-500">
              <Lock className="mx-auto mb-2 h-5 w-5 text-slate-400" />
              <p className="font-semibold text-slate-700">
                Packages are locked
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Please enter and verify the Payment ID above to view and select
                available packages.
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
            <>
              {verifiedPaymentAmount != null && (
                <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Check className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                    Verified Payment:{' '}
                    <strong>
                      ₹{formatVerifiedRupees(verifiedPaymentAmount)}
                    </strong>
                    . Only packages within this amount can be selected.
                  </span>
                </div>
              )}
              {durationOptions.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-xs font-medium text-slate-500">
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {visiblePlans.map((pkg) => {
                  const isSelected = !!formData.selectedPackages?.includes(
                    pkg.id,
                  )
                  const price = priceOf(pkg.name)
                  const pkgCost = includeGst ? price.withGst : price.amount
                  const isExceedingPayment =
                    verifiedPaymentAmount != null &&
                    pkgCost > verifiedPaymentAmount
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => {
                        if (isExceedingPayment) {
                          showToast({
                            title: 'Package Exceeds Verified Amount',
                            description: `${pkg.name} price (₹${pkgCost.toLocaleString('en-IN')}) exceeds verified payment of ₹${formatVerifiedRupees(verifiedPaymentAmount)}`,
                            variant: 'destructive',
                          })
                          return
                        }
                        handlePackageToggle(pkg.id)
                      }}
                      className={`flex items-start gap-3 rounded-xl border p-3.5 transition-all ${
                        isExceedingPayment
                          ? 'cursor-not-allowed border-slate-200 bg-slate-100/70 opacity-60'
                          : isSelected
                            ? 'cursor-pointer border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                            : 'cursor-pointer border-slate-200 bg-slate-50/60 hover:border-blue-300 hover:bg-white'
                      }`}
                    >
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isSelected}
                        disabled={isExceedingPayment}
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePackageToggle(pkg.id)
                        }}
                        className={`mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
                          isSelected
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-300 bg-white hover:border-blue-400'
                        }`}
                        aria-label={`Select ${pkg.name}`}
                      >
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="break-words text-sm font-bold leading-snug text-slate-900">
                            {pkg.name}
                          </h3>
                          {isExceedingPayment && (
                            <span className="flex-shrink-0 rounded border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                              Exceeds payment
                            </span>
                          )}
                        </div>
                        {(price.hasPrice || price.months > 0) && (
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tabular-nums text-slate-400">
                            {price.hasPrice && (
                              <span>
                                <span className="text-sm font-bold text-emerald-600">
                                  ₹{price.amount.toLocaleString('en-IN')}
                                </span>{' '}
                                +18% = ₹{price.withGst.toLocaleString('en-IN')}
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
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {pkg.departments.map((dept) => {
                              const label = departmentLabel(dept)
                              return (
                                <span
                                  key={dept}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700"
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
                        {price.featureList && price.featureList.length > 0 && (
                          <div
                            className="mt-2.5 border-t border-slate-200/60 pt-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setViewingFeaturesPlan({
                                  name: pkg.name,
                                  features: price.featureList,
                                })
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 shadow-sm transition-colors hover:border-emerald-400 hover:bg-emerald-100"
                            >
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Features ({price.featureList.length})</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </Section>

        {/* ═══ 3 — Financial Information ═══ */}
        <Section
          innerRef={financialRef}
          index={3}
          title="Financial Information"
          complete={financialComplete}
          locked={!packagesComplete}
          lockedMessage="Please verify payment and select your package in Step 2 first."
        >
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="expirationInMonths"
                  className="text-xs font-medium text-slate-600"
                >
                  Service Months <span className="text-red-500">*</span>
                </label>
              </div>
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
                className={`${inputClass()} ${
                  monthsLocked ? 'cursor-not-allowed bg-slate-100' : ''
                }`}
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
                  className="text-xs font-medium text-slate-600"
                >
                  Total Amount (₹) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 transition-colors hover:bg-slate-200/70">
                  <span className="cursor-pointer select-none text-[11px] font-medium text-slate-600">
                    18% GST
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={includeGst}
                    onClick={() => setIncludeGst(!includeGst)}
                    className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      includeGst ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
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
                className={`${inputClass()} ${
                  totalLocked ? 'cursor-not-allowed bg-slate-100' : ''
                }`}
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

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Payment Type <span className="text-red-500">*</span>
              </label>
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
                    className={`${inputClass(isPartTimeInvalid)} ${
                      isPaidDisabled
                        ? 'cursor-not-allowed bg-slate-100'
                        : ''
                    }`}
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
                    className={`${inputClass()} cursor-not-allowed bg-slate-100`}
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
                      handleInputChange('remainingAmountDueDate', e.target.value)
                    }
                    className={`${inputClass()} w-full`}
                  />
                </Field>
              </>
            )}

            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:col-span-2 sm:grid-cols-3 lg:col-span-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Invoice Details <span className="text-red-500">*</span>
                </label>
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
              <div className="sm:col-span-2">
                {formData.invoiceOption === 'gstin' && (
                  <Field
                    label="GSTIN Number"
                    htmlFor="gstinForInvoice"
                    required
                    hint="15 characters, uppercase"
                    error={
                      shouldShowError('gstin')
                        ? validationErrors.gstin
                        : ''
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
                )}
                {formData.invoiceOption === 'address' && (
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
                      rows={2}
                      className="w-full resize-none rounded-md border border-slate-200 bg-white p-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </Field>
                )}
              </div>
            </div>
          </div>
        </Section>

        {/* ═══ 4 — Final Details ═══ */}
        <Section
          innerRef={finalRef}
          index={4}
          title="Final Details"
          complete={finalComplete}
          locked={!financialComplete}
          lockedMessage="Please complete Financial Information in Step 3 first."
        >
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
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
                onChange={(e) => handleInputChange('leadType', e.target.value)}
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
                onChange={(e) => handleInputChange('groupLink', e.target.value)}
                placeholder="https://chat.whatsapp.com/…"
                className={inputClass()}
              />
            </Field>
          </div>
        </Section>

        {/* ─── Submit button ─── */}
        <div className="pb-6">
          <button
            type="button"
            onClick={handleFinalSubmit}
            className="h-11 w-full rounded-xl bg-blue-600 font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Complete Registration
          </button>
          <p className="mt-2 text-center text-[11px] text-slate-400">
            By registering, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
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
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* ─── Features Compact Right-Side Popup (No Background Hide) ─── */}
      {viewingFeaturesPlan && (
        <div
          ref={featuresDrawerRef}
          role="dialog"
          aria-modal="false"
          aria-label="Included Features"
          className="drawer-right-enter fixed right-4 top-20 z-50 flex max-h-[72vh] w-[320px] sm:w-[350px] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-2xl backdrop-blur-md"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 p-3.5 px-4 bg-slate-50/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 shadow-xs">
                <Check className="h-4 w-4 stroke-[2.5]" />
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-xs font-bold text-slate-900">
                  {viewingFeaturesPlan.name}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {viewingFeaturesPlan.features.length} Features Included
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setViewingFeaturesPlan(null)}
              aria-label="Close features"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Features List */}
          <div className="flex-1 space-y-1.5 overflow-y-auto p-3.5">
            {viewingFeaturesPlan.features.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 rounded-lg border border-slate-200/70 bg-slate-50/70 p-2 text-[11px] text-slate-700 transition-colors hover:bg-slate-100/80"
              >
                <span className="mt-0.5 flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs">
                  <Check className="h-2 w-2 stroke-[3]" />
                </span>
                <span className="break-words font-medium leading-relaxed">
                  {feature}
                </span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 p-2.5 px-4">
            <span className="text-[10px] text-slate-400 font-medium">
              Click anywhere outside to close
            </span>
            <button
              type="button"
              onClick={() => setViewingFeaturesPlan(null)}
              className="cursor-pointer rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ─── Toast notification ─── */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed right-4 top-4 z-[60] max-w-sm rounded-xl border px-4 py-3 shadow-lg transition-all ${
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
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
        active
          ? 'border-blue-600 bg-blue-600 text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
      }`}
    >
      {label}
    </button>
  )
}

function Section({
  innerRef,
  index,
  title,
  complete,
  aside,
  locked,
  lockedMessage,
  children,
}: {
  innerRef: React.RefObject<HTMLDivElement | null>
  index: number
  title: string
  complete: boolean
  aside?: React.ReactNode
  locked?: boolean
  lockedMessage?: string
  children: React.ReactNode
}) {
  return (
    <section
      ref={innerRef}
      className={`scroll-mt-20 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all sm:p-5 ${
        locked ? 'border-slate-200/70 bg-slate-50/60' : ''
      }`}
    >
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              complete
                ? 'bg-emerald-500 text-white'
                : locked
                  ? 'bg-slate-200 text-slate-400'
                  : 'bg-blue-600 text-white'
            }`}
          >
            {complete ? <Check className="h-3.5 w-3.5" /> : index}
          </span>
          <h2
            className={`truncate text-sm font-bold ${
              locked ? 'text-slate-400' : 'text-slate-900'
            }`}
          >
            {title}
          </h2>
          {locked && (
            <span className="flex select-none items-center gap-1 rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
              <Lock className="h-3 w-3 text-slate-400" /> Locked
            </span>
          )}
        </div>
        {aside}
      </div>
      {locked ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm text-slate-500">
          <Lock className="mx-auto mb-2 h-5 w-5 text-slate-400" />
          <p className="font-semibold text-slate-700">
            {lockedMessage || 'Please complete the previous step first.'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            This section will unlock automatically once previous step details
            are filled.
          </p>
        </div>
      ) : (
        children
      )}
    </section>
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
        className="block text-xs font-medium text-slate-600"
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
      className={`flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 transition-colors ${
        selected
          ? 'border-blue-500 bg-blue-50 text-blue-900'
          : 'border-slate-200 text-slate-700 hover:border-blue-300'
      }`}
    >
      <input
        type="radio"
        id={id}
        name={id}
        value={value}
        checked={selected}
        onChange={() => onSelect(value)}
        className="h-4 w-4 accent-blue-600"
      />
      <span className="truncate text-sm font-medium">{label}</span>
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
