import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  MapPin,
  Package,
  Wallet,
} from 'lucide-react'
import { LoginModal } from '../../auth/components/LoginModal'
import {
  fetchPlanAmounts,
  fetchPlansWithDepartments,
  registerCustomer,
  uploadPaymentScreenshot,
} from '../../../api/register-business.api'
import type {
  CustomerRegistrationRequest,
  PlanAmount,
  PlanWithDepartments,
  RegisteredCustomer,
} from '../types/register-business.types'

/* ─────────────────────────────────────────────────────────────────
   Single-page "Register Your Business" form ported from SMSF's
   RegisterBusiness.tsx. Same fields, validation rules and submit
   payload, laid out as one continuous page with four sections.
   Public page: submits to POST /api/auth/customers/register, gated by
   the REGISTRATION_PASSWORD passkey from .env.
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

/* Cities where onboarding is currently done. Add a city here to offer it on the form. */
const ONBOARDING_CITIES = ['Jabalpur', 'Delhi']

const INITIAL_VALIDATION_ERRORS = {
  email: '',
  phoneNumber: '',
  gstin: '',
  city: '',
}

const REGISTRATION_PASSWORD =
  import.meta.env.REGISTRATION_PASSWORD ?? ''

const GST_RATE = 0.18
/* Plans of this duration are shown first in the plan filter. */
const DEFAULT_PLAN_MONTHS = 15
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024

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

/** "GOOGLE_DEPARTMENT" -> "Google", "SERVICE_DELIVERY_DEPARTMENT" -> "Service Delivery", "SEO_DEPARTMENT" -> "SEO". */
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

function apiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  return fallback
}

export function RegisterBusinessPage() {
  const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA })
  const [validationErrors, setValidationErrors] = useState({
    ...INITIAL_VALIDATION_ERRORS,
  })
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set())
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set())

  const [cityInput, setCityInput] = useState('')
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const cityDropdownRef = useRef<HTMLDivElement>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPasskeyModal, setShowPasskeyModal] = useState(false)
  const [passkey, setPasskey] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  /* The login screen opens first; "Register your business" there reveals this form. */
  const [loginOpen, setLoginOpen] = useState(true)

  const [toast, setToast] = useState<ToastMessage | null>(null)
  const toastTimer = useRef<number | null>(null)

  /* Payment screenshot step, shown after a successful registration. */
  const [registered, setRegistered] = useState<RegisteredCustomer | null>(null)
  const [billingAddress, setBillingAddress] = useState('')
  const [screenshotUrl, setScreenshotUrl] = useState('')
  const [isUploadingSS, setIsUploadingSS] = useState(false)
  /* Payment screenshot picked in the form; uploaded right after the customer is registered. */
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)

  /* Plan duration filter. null = not chosen yet. */
  const [durationFilter, setDurationFilter] = useState<number | 'all' | null>(null)
  /* true once the user picks "Custom" to type Service Months. */
  const [customMonths, setCustomMonths] = useState(false)

  const businessRef = useRef<HTMLDivElement>(null)
  const packagesRef = useRef<HTMLDivElement>(null)
  const financialRef = useRef<HTMLDivElement>(null)
  const finalRef = useRef<HTMLDivElement>(null)

  const plansQuery = useQuery({
    queryKey: ['register-business', 'plans-with-departments'],
    queryFn: fetchPlansWithDepartments,
    staleTime: 30_000,
  })
  const plans = useMemo<PlanWithDepartments[]>(
    () => plansQuery.data ?? [],
    [plansQuery.data],
  )
  const isLoadingPlans = plansQuery.isPending

  const amountsQuery = useQuery({
    queryKey: ['register-business', 'plan-amounts'],
    queryFn: fetchPlanAmounts,
    staleTime: 30_000,
  })
  const planAmounts: PlanAmount[] = amountsQuery.data ?? []

  const showToast = useCallback(
    (
      title: string,
      description?: string,
      variant: ToastVariant = 'default',
    ) => {
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
      return () =>
        document.removeEventListener('mousedown', handleClickOutside)
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
        paymentId: 100,
      }

      if (limits[field] && value.length > limits[field]) {
        showToast(
          'Character Limit Exceeded',
          `${field
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (s) => s.toUpperCase())} cannot exceed ${limits[field]} characters`,
          'destructive',
        )
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

  const handlePackageToggle = useCallback(
    (packageId: string, checked?: boolean) => {
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
    [],
  )

  const handleToggleDepartments = useCallback(
    (packageId: string, event: React.MouseEvent) => {
      event.stopPropagation()
      setExpandedPlans((prev) => {
        const next = new Set(prev)
        if (next.has(packageId)) next.delete(packageId)
        else next.add(packageId)
        return next
      })
    },
    [],
  )

  const resetForm = useCallback(() => {
    setFormData({ ...INITIAL_FORM_DATA })
    setValidationErrors({ ...INITIAL_VALIDATION_ERRORS })
    setTouchedFields(new Set())
    setExpandedPlans(new Set())
    setCityInput('')
    setPasskey('')
    setDurationFilter(null)
    setCustomMonths(false)
  }, [])

  /* ─── Plan-derived values (price, totals, durations) ─── */
  const priceOf = (planName: string) => {
    const row = planAmounts.find((a) => a.planName === planName)
    const amount =
      (Number(row?.amount) || 0) + (Number(row?.additionalAmount) || 0)
    return {
      amount,
      withGst: Math.round(amount * (1 + GST_RATE)),
      hasPrice: row?.amount != null || row?.additionalAmount != null,
      months: Number(row?.durationMonths) || 0,
    }
  }

  const selectedPlans = plans.filter((p) =>
    formData.selectedPackages?.includes(p.id),
  )
  const autoTotal = selectedPlans.reduce(
    (sum, p) => sum + priceOf(p.name).withGst,
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
  const monthsLocked = autoMonths > 0 && !customMonths
  /* Service Months: the selected plan's duration unless the user chose Custom. */
  const effectiveMonths = monthsLocked
    ? String(autoMonths)
    : formData.expirationInMonths

  /* ─── Section completion (drives the sticky header progress) ─── */
  const businessComplete =
    !!formData.ownerName &&
    !!formData.businessName &&
    !!formData.email &&
    validateEmail(formData.email) &&
    !!formData.phoneNumber &&
    validatePhoneNumber(formData.phoneNumber) &&
    !!(formData.city || cityInput).trim() &&
    !!formData.onboardingCity

  const packagesComplete = (formData.selectedPackages?.length || 0) > 0

  const financialComplete = (() => {
    if (!formData.paymentType || !formData.totalAmount || !formData.amountPaid)
      return false
    if (!isValidServiceMonths(effectiveMonths)) return false
    if (!screenshotFile) return false
    if (
      formData.paymentType === 'part-time' &&
      (!formData.amountRemaining || !formData.remainingAmountDueDate)
    )
      return false
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

  /* ─── Combined validation — same rules/order/messages as the SMSF wizard. ─── */
  const handleFinalSubmit = useCallback(() => {
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
    const fieldNames: { [key: string]: string } = {
      ownerName: 'Owner Name',
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
      showToast(
        'Validation Error',
        missingFields.length > 0
          ? `Missing or invalid fields: ${missingFields.join(', ')}`
          : 'Please fill all required fields correctly.',
        'destructive',
      )
      scrollToSection('business')
      return
    }

    if (cityInput.trim() && cityInput.trim() !== formData.city) {
      handleInputChange('city', cityInput.trim())
    }

    if (!formData.selectedPackages || formData.selectedPackages.length === 0) {
      showToast(
        'Selection Required',
        'Please select at least one package',
        'destructive',
      )
      scrollToSection('packages')
      return
    }

    if (!isValidServiceMonths(effectiveMonths)) {
      showToast(
        'Service Months Required',
        'Please enter service months between 1 and 60',
        'destructive',
      )
      scrollToSection('financial')
      return
    }
    if (formData.paymentType === 'part-time') {
      if (!formData.amountRemaining || !formData.remainingAmountDueDate) {
        showToast(
          'Validation Error',
          'Please fill all financial fields for part-time payment',
          'destructive',
        )
        scrollToSection('financial')
        return
      }
    }
    if (!formData.invoiceOption) {
      showToast(
        'Invoice Required',
        'Please provide either GSTIN or Complete Address',
        'destructive',
      )
      scrollToSection('financial')
      return
    }
    if (formData.invoiceOption === 'gstin' && !formData.gstinForInvoice) {
      showToast('GSTIN Required', 'Please enter GSTIN number', 'destructive')
      scrollToSection('financial')
      return
    }
    if (formData.invoiceOption === 'address' && !formData.completeAddress) {
      showToast(
        'Address Required',
        'Please enter complete address',
        'destructive',
      )
      scrollToSection('financial')
      return
    }
    const missingFinancial = ['paymentType', 'totalAmount', 'amountPaid'].some(
      (field) => !(formData[field as keyof typeof formData] as string),
    )
    if (missingFinancial) {
      showToast(
        'Validation Error',
        'Please fill all required fields correctly',
        'destructive',
      )
      scrollToSection('financial')
      return
    }
    if (!screenshotFile) {
      showToast(
        'Payment Screenshot Required',
        'Please attach the payment screenshot',
        'destructive',
      )
      scrollToSection('financial')
      return
    }

    if (!formData.salesPersonName) {
      showToast(
        'Sales Person Name Required',
        "Please enter the sales person's name",
        'destructive',
      )
      scrollToSection('final')
      return
    }
    if (!formData.leadType) {
      showToast('Lead Type Required', 'Please enter the lead type', 'destructive')
      scrollToSection('final')
      return
    }

    setShowPasskeyModal(true)
  }, [formData, cityInput, effectiveMonths, handleInputChange, showToast, scrollToSection, screenshotFile])

  const handlePasskeySubmit = useCallback(async () => {
    if (!passkey.trim()) {
      showToast('Password Required', 'Please enter the registration password', 'destructive')
      return
    }
    if (!REGISTRATION_PASSWORD) {
      showToast(
        'Registration Unavailable',
        'Registration password is not configured.',
        'destructive',
      )
      return
    }
    if (passkey !== REGISTRATION_PASSWORD) {
      showToast(
        'Invalid Password',
        'The password you entered is incorrect. Please try again.',
        'destructive',
      )
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

      const isWebsiteIncluded = ['yes', '1', 'true', '✓'].includes(
        formData.websiteRequired.toLowerCase(),
      )
        ? 'yes'
        : 'no'
      const gstinOrAddress =
        formData.invoiceOption === 'gstin'
          ? formData.gstinForInvoice
          : formData.completeAddress

      const customerData: CustomerRegistrationRequest = {
        clientName: formData.ownerName,
        businessName: formData.businessName,
        clientEmail: formData.email,
        clientNumber: formData.phoneNumber,
        city: formData.city,
        packageNames,
        serviceMonth: effectiveMonths,
        salesPersonName: formData.salesPersonName,
        amountPaid: formData.amountPaid || '0',
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
        ...(formData.paymentId?.trim()
          ? { paymentId: formData.paymentId.trim() }
          : {}),
      }

      await registerCustomer(customerData)

      showToast(
        'Registration Successful',
        'Customer has been registered successfully!',
        'success',
      )

      // The customer now exists — upload the picked screenshot and save it.
      if (screenshotFile) {
        const customer: RegisteredCustomer = {
          phone: formData.phoneNumber.trim(),
          email: formData.email.trim(),
          businessName: formData.businessName.trim(),
          ownerName: formData.ownerName.trim(),
          gstNumber:
            formData.invoiceOption === 'gstin'
              ? formData.gstinForInvoice.trim()
              : '',
        }
        const address =
          formData.invoiceOption === 'address'
            ? formData.completeAddress.trim()
            : ''
        try {
          await uploadPaymentScreenshot(screenshotFile, customer, address)
          showToast(
            'Screenshot Saved',
            'Payment screenshot uploaded and saved for this customer.',
            'success',
          )
        } catch (uploadError: unknown) {
          showToast(
            'Screenshot Not Saved',
            `Customer is registered, but the screenshot failed: ${apiErrorMessage(
              uploadError,
              'upload error',
            )}. Please try again.`,
            'destructive',
          )
          setRegistered(customer)
          setBillingAddress(address)
          setScreenshotUrl('')
        }
        setScreenshotFile(null)
      }

      resetForm()
      setIsSubmitting(false)
      setShowPasskeyModal(false)
    } catch (error: unknown) {
      showToast(
        'Registration Failed',
        error instanceof Error
          ? error.message
          : 'Failed to register customer. Please try again.',
        'destructive',
      )
      setIsSubmitting(false)
    }
  }, [passkey, formData, effectiveMonths, plans, showToast, resetForm, screenshotFile])

  const completedCount = Object.values(sectionStatus).filter(Boolean).length
  const progressPct = Math.round((completedCount / SECTIONS.length) * 100)
  const selectedCount = formData.selectedPackages?.length || 0

  /* Total Amount follows the selected plans, and clears when the last priced plan is removed. */
  const lastAutoTotal = useRef(0)
  useEffect(() => {
    if (autoTotal === lastAutoTotal.current) return
    const hadAutoTotal = lastAutoTotal.current > 0
    lastAutoTotal.current = autoTotal
    if (autoTotal <= 0 && !hadAutoTotal) return
    const value = autoTotal > 0 ? String(autoTotal) : ''
    setFormData((prev) => {
      if (prev.paymentType === 'full-time') {
        return { ...prev, totalAmount: value, amountPaid: value, amountRemaining: '' }
      }
      const remaining = autoTotal - (parseInt(prev.amountPaid) || 0)
      return {
        ...prev,
        totalAmount: value,
        amountRemaining: remaining > 0 ? String(remaining) : '',
      }
    })
  }, [autoTotal])

  const durationOptions = Array.from(
    new Set(
      plans.map((p) => priceOf(p.name).months).filter((m) => m > 0),
    ),
  ).sort((x, y) => x - y)
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

  /* Retry from the popup, used only when the automatic upload after registration failed. */
  const handleScreenshotRetry = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !registered) return
    setIsUploadingSS(true)
    try {
      setScreenshotUrl(
        await uploadPaymentScreenshot(file, registered, billingAddress),
      )
      showToast(
        'Upload & Save Successful',
        'Payment screenshot uploaded and details saved.',
        'success',
      )
    } catch (error: unknown) {
      showToast(
        'Upload Failed',
        apiErrorMessage(error, 'Failed to upload screenshot.'),
        'destructive',
      )
    } finally {
      setIsUploadingSS(false)
    }
  }

  const inputClass = (hasError?: boolean) =>
    `h-9 w-full rounded-md border bg-white px-3 text-sm text-slate-900 outline-none transition focus:ring-2 ${
      hasError
        ? 'border-red-500 ring-1 ring-red-200 focus:ring-red-100'
        : 'border-slate-200 focus:border-blue-400 focus:ring-blue-100'
    }`

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ─── Sticky header: back, brand, progress ─── */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto grid h-14 max-w-4xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setLoginOpen(true)}
            className="inline-flex items-center gap-1.5 justify-self-start py-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
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
          <span className="justify-self-end text-xs font-semibold tabular-nums text-slate-500">
            {completedCount}/{SECTIONS.length} done
          </span>
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
              error={shouldShowError('email') ? validationErrors.email : ''}
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
                      <button
                        key={city}
                        type="button"
                        onClick={() => handleCitySelect(city)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-blue-50"
                      >
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {city}
                      </button>
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
                    name="onboardingCity"
                    value={city}
                    checked={formData.onboardingCity === city}
                    label={city}
                    onChange={() => handleInputChange('onboardingCity', city)}
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
                  name="websiteRequired"
                  value="yes"
                  checked={formData.websiteRequired === 'yes'}
                  label="Yes"
                  onChange={() => handleInputChange('websiteRequired', 'yes')}
                />
                <ChoiceCard
                  id="website-no"
                  name="websiteRequired"
                  value="no"
                  checked={formData.websiteRequired === 'no'}
                  label="No"
                  onChange={() => handleInputChange('websiteRequired', 'no')}
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
                  name="isWebinarClient"
                  value="yes"
                  checked={formData.isWebinarClient.toLowerCase() === 'yes'}
                  label="Yes"
                  onChange={() =>
                    handleInputChange('isWebinarClient', 'YES')
                  }
                />
                <ChoiceCard
                  id="webinar-no"
                  name="isWebinarClient"
                  value="no"
                  checked={formData.isWebinarClient.toLowerCase() === 'no'}
                  label="No"
                  onChange={() => handleInputChange('isWebinarClient', 'NO')}
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
                  className="w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </Field>
            </div>
          </div>
        </Section>

        {/* ═══ 2 — Packages ═══ */}
        <Section
          innerRef={packagesRef}
          index={2}
          title="Select Packages"
          complete={packagesComplete}
          aside={
            selectedCount > 0 ? (
              <span className="text-xs font-semibold text-blue-600">
                {selectedCount} selected
              </span>
            ) : null
          }
        >
          {isLoadingPlans && plans.length === 0 ? (
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
                  const expanded = expandedPlans.has(pkg.id)
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => handlePackageToggle(pkg.id)}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                          : 'border-slate-200 bg-slate-50/60 hover:border-blue-300 hover:bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) =>
                          handlePackageToggle(pkg.id, e.target.checked)
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5 h-[18px] w-[18px] flex-shrink-0 cursor-pointer accent-blue-600"
                        aria-label={`Select ${pkg.name}`}
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-sm font-bold leading-snug text-slate-900">
                          {pkg.name}
                        </h3>
                        {(price.hasPrice || price.months > 0) && (
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tabular-nums text-slate-400">
                            {price.hasPrice && (
                              <span>
                                <span className="text-sm font-bold text-emerald-600">
                                  ₹{price.amount.toLocaleString('en-IN')}
                                </span>{' '}
                                +18% = ₹
                                {price.withGst.toLocaleString('en-IN')}
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
                            {(expanded
                              ? pkg.departments
                              : pkg.departments.slice(0, 4)
                            ).map((dept) => {
                              const label = departmentLabel(dept)
                              return (
                                <span
                                  key={dept}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700"
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${departmentDot(
                                      label,
                                    )}`}
                                  />
                                  {label}
                                </span>
                              )
                            })}
                            {pkg.departments.length > 4 && (
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleToggleDepartments(pkg.id, e)
                                }
                                className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-blue-600 hover:border-blue-300"
                              >
                                {expanded
                                  ? 'Show less'
                                  : `+${pkg.departments.length - 4} more`}
                              </button>
                            )}
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
                {autoMonths > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (customMonths) {
                        setCustomMonths(false)
                      } else {
                        handleInputChange(
                          'expirationInMonths',
                          String(autoMonths),
                        )
                        setCustomMonths(true)
                      }
                    }}
                    className="text-[11px] font-semibold text-blue-600 hover:underline"
                  >
                    {customMonths ? 'Use plan duration' : 'Custom'}
                  </button>
                )}
              </div>
              <input
                id="expirationInMonths"
                type="number"
                min="1"
                max="60"
                value={effectiveMonths}
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
                  : customMonths && autoMonths > 0
                    ? `Custom duration (plan duration is ${monthsLabel(
                        autoMonths,
                      )})`
                    : 'Fills automatically when the selected plan has a duration'}
              </p>
            </div>
            <Field
              label="Total Amount (₹)"
              htmlFor="totalAmount"
              required
              hint={
                totalLocked
                  ? 'Auto-calculated from the selected plans (incl. 18% GST)'
                  : hasUnpricedSelection && selectedPlans.length > 0
                    ? 'A selected plan has no price set — enter the total'
                    : undefined
              }
            >
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
                    const paid = parseInt(formData.amountPaid) || 0
                    const remaining = total - paid
                    handleInputChange(
                      'amountRemaining',
                      remaining > 0 ? remaining.toString() : '',
                    )
                    if (formData.paymentType === 'full-time') {
                      handleInputChange('amountPaid', value)
                    }
                  } else if (value.length > 12) {
                    showToast(
                      'Amount Limit Exceeded',
                      'Total amount cannot exceed 12 digits',
                      'destructive',
                    )
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
            </Field>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Payment Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <ChoiceCard
                  id="payment-full"
                  name="paymentType"
                  value="full-time"
                  checked={formData.paymentType === 'full-time'}
                  label="Full Time"
                  onChange={() => {
                    handleInputChange('paymentType', 'full-time')
                    handleInputChange(
                      'amountPaid',
                      formData.totalAmount || '',
                    )
                    handleInputChange('amountRemaining', '')
                    handleInputChange('remainingAmountDueDate', '')
                  }}
                />
                <ChoiceCard
                  id="payment-part"
                  name="paymentType"
                  value="part-time"
                  checked={formData.paymentType === 'part-time'}
                  label="Part Time"
                  onChange={() => {
                    handleInputChange('paymentType', 'part-time')
                    handleInputChange('amountPaid', '')
                  }}
                />
              </div>
            </div>
            <Field
              label="Amount Paid (₹)"
              htmlFor="amountPaid"
              required
              hint={
                formData.paymentType === 'full-time'
                  ? 'Same as total for full payment'
                  : undefined
              }
            >
              <input
                id="amountPaid"
                type="number"
                min="0"
                value={
                  formData.paymentType === 'full-time'
                    ? formData.totalAmount || ''
                    : formData.amountPaid
                }
                disabled={formData.paymentType === 'full-time'}
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
                className={`${inputClass()} ${
                  formData.paymentType === 'full-time'
                    ? 'cursor-not-allowed bg-slate-100'
                    : ''
                }`}
              />
            </Field>

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
                      handleInputChange(
                        'remainingAmountDueDate',
                        e.target.value,
                      )
                    }
                    className={`${inputClass()} w-full`}
                  />
                </Field>
              </>
            )}

            <div className="sm:col-span-2 lg:col-span-3">
              <Field
                label="Payment Screenshot"
                htmlFor="paymentScreenshot"
                required
                hint={
                  screenshotFile
                    ? undefined
                    : 'Image of the payment confirmation. It is uploaded and saved once the customer is registered.'
                }
              >
                {screenshotFile ? (
                  <div className="flex h-9 items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-sm">
                    <span className="truncate font-medium text-emerald-800">
                      {screenshotFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setScreenshotFile(null)}
                      className="flex-shrink-0 text-xs font-semibold text-slate-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <input
                    id="paymentScreenshot"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      e.target.value = ''
                      if (file && file.size > MAX_SCREENSHOT_BYTES) {
                        showToast(
                          'File Too Large',
                          'Payment screenshot must be 5 MB or smaller.',
                          'destructive',
                        )
                        return
                      }
                      setScreenshotFile(file)
                    }}
                    className={`${inputClass()} cursor-pointer`}
                  />
                )}
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:col-span-2 sm:grid-cols-3 lg:col-span-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Invoice Details <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <ChoiceCard
                    id="invoice-gstin"
                    name="invoiceOption"
                    value="gstin"
                    checked={formData.invoiceOption === 'gstin'}
                    label="GSTIN"
                    onChange={() => {
                      handleInputChange('invoiceOption', 'gstin')
                      handleInputChange('completeAddress', '')
                    }}
                  />
                  <ChoiceCard
                    id="invoice-address"
                    name="invoiceOption"
                    value="address"
                    checked={formData.invoiceOption === 'address'}
                    label="Address"
                    onChange={() => {
                      handleInputChange('invoiceOption', 'address')
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
                      className="w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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
        >
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            <Field label="Sales Person Name" htmlFor="salesPersonName" required>
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
            <Field label="WhatsApp Group Link (optional)" htmlFor="groupLink">
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
            <Field label="Payment Id (optional)" htmlFor="paymentId">
              <input
                id="paymentId"
                value={formData.paymentId}
                onChange={(e) => handleInputChange('paymentId', e.target.value)}
                placeholder="Enter payment id"
                className={inputClass()}
              />
            </Field>
          </div>
        </Section>

        {/* ─── Submit ─── */}
        <div className="pb-6">
          <button
            type="button"
            onClick={handleFinalSubmit}
            className="h-11 w-full rounded-xl bg-blue-600 font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Complete Registration
          </button>
          <p className="mt-2 text-center text-[11px] text-slate-400">
            By registering, you agree to our Terms of Service and Privacy
            Policy.
          </p>
        </div>
      </div>

      {/* ─── Payment screenshot step (after a successful registration) ─── */}
      {registered && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  Customer registered
                </h3>
                <p className="truncate text-xs text-slate-500">
                  {registered.businessName} · {registered.phone}
                </p>
              </div>
            </div>

            <Field
              label="Billing Address (optional)"
              htmlFor="ssBillingAddress"
            >
              <textarea
                id="ssBillingAddress"
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                placeholder="Enter billing address"
                rows={2}
                disabled={isUploadingSS || !!screenshotUrl}
                className="w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              />
            </Field>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Payment Screenshot
              </label>
              {screenshotUrl ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
                  <span className="font-medium text-emerald-700">
                    Screenshot uploaded
                  </span>
                  <a
                    href={screenshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-600 hover:underline"
                  >
                    View
                  </a>
                </div>
              ) : (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotRetry}
                    disabled={isUploadingSS}
                    className="h-10 w-full cursor-pointer rounded-md border border-slate-200 bg-white px-3 text-sm"
                  />
                  <p className="text-[11px] text-slate-500">
                    {isUploadingSS
                      ? 'Uploading…'
                      : 'The earlier upload failed. Choose the payment confirmation image again.'}
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setRegistered(null)}
              disabled={isUploadingSS}
              className={`w-full rounded-xl py-2.5 font-semibold transition-colors ${
                screenshotUrl
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'border border-slate-200 bg-white text-slate-700 hover:border-blue-300'
              }`}
            >
              {screenshotUrl ? 'Done' : 'Skip for now'}
            </button>
          </div>
        </div>
      )}

      {/* ─── Password (passkey) modal ─── */}
      {showPasskeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Hash className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Enter Password
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
                onKeyDown={(e) =>
                  e.key === 'Enter' && handlePasskeySubmit()
                }
                placeholder="Enter registration password"
                autoFocus
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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
                disabled={isSubmitting}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 font-semibold text-slate-700 transition-colors hover:border-blue-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePasskeySubmit}
                disabled={isSubmitting || !passkey.trim()}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Registering...' : 'Register'}
              </button>
            </div>
          </div>
        </div>
      )}

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />

      {/* ─── Toast ─── */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed right-4 top-4 z-[60] max-w-sm rounded-xl border px-4 py-3 shadow-lg ${
            toast.variant === 'destructive'
              ? 'border-red-200 bg-red-50 text-red-800'
              : toast.variant === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-slate-200 bg-white text-slate-800'
          }`}
        >
          <p className="text-sm font-semibold">{toast.title}</p>
          {toast.description && (
            <p className="mt-0.5 text-xs opacity-80">{toast.description}</p>
          )}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Presentational helpers — no state, no side effects.
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
  children,
}: {
  innerRef: React.RefObject<HTMLDivElement | null>
  index: number
  title: string
  complete: boolean
  aside?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section
      ref={innerRef}
      className="scroll-mt-20 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              complete
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {complete ? <Check className="h-3.5 w-3.5" /> : index}
          </span>
          <h2 className="truncate text-sm font-bold text-slate-900">{title}</h2>
        </div>
        {aside}
      </div>
      {children}
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
  name,
  value,
  checked,
  label,
  onChange,
}: {
  id: string
  name: string
  value: string
  checked: boolean
  label: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <label
      htmlFor={id}
      className={`flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 transition-colors ${
        checked
          ? 'border-blue-500 bg-blue-50 text-blue-900'
          : 'border-slate-200 text-slate-700 hover:border-blue-300'
      }`}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 flex-shrink-0 accent-blue-600"
      />
      <span className="truncate text-sm font-medium">{label}</span>
    </label>
  )
} 