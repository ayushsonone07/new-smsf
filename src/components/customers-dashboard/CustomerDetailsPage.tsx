import { useState, useEffect, useMemo, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { CustomerDashboardLayout } from './CustomerDashboardLayout'
import { Icon } from '../head/shared/Icon'
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
  X as CloseIcon,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'
import { useCustomerSession } from '../../features/customers/hooks/useCustomerSession'
import { decryptUrlParams, getCustomerFormUrl } from '../../utils/urlEncryption'
import { getCustomerProfileDetails, saveCustomerProfileDetails, type CustomerProfileDetails } from '../../api/customer-drawer.api'
import { getCitiesForState } from '../../constants/indianStateCities'

export interface OfferItem {
  id: string
  offerType: string
  discountValue: string
  description: string
}

interface WorkingHourItem {
  startDay: string
  endDay: string
  startTime: string
  endTime: string
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function WorkingHoursEditor({
  value,
  onChange,
}: {
  value: WorkingHourItem[]
  onChange: Dispatch<SetStateAction<WorkingHourItem[]>>
}) {
  const addRange = () => {
    onChange((items) => [...items, { startDay: 'Mon', endDay: 'Fri', startTime: '09:00', endTime: '18:00' }])
  }

  const updateRange = (index: number, field: keyof WorkingHourItem, fieldValue: string) => {
    onChange((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: fieldValue } : item))
  }

  return (
    <div className="cdb-working-hours-editor">
      <div className="cdb-working-hours-heading">
        <span>Working Hours (From ~ To)</span>
        <button type="button" className="cdb-working-hours-add" onClick={addRange}>+ Add</button>
      </div>
      {value.length === 0 ? <div className="cdb-empty-hours">No working hours added.</div> : (
        <div className="cdb-working-hours-list">
          {value.map((range, index) => (
            <div className="cdb-working-hours-card" key={index}>
              <button type="button" className="cdb-working-hours-remove" aria-label="Remove working hours" onClick={() => onChange((items) => items.filter((_, itemIndex) => itemIndex !== index))}><CloseIcon size={14} /></button>
              <span className="cdb-working-hours-card-label">Days</span>
              <div className="cdb-working-hours-range">
                <select className="cdb-select" value={range.startDay} onChange={(event) => updateRange(index, 'startDay', event.target.value)}>{WEEKDAYS.map((day) => <option key={day}>{day}</option>)}</select>
                <span>to</span>
                <select className="cdb-select" value={range.endDay} onChange={(event) => updateRange(index, 'endDay', event.target.value)}>{WEEKDAYS.map((day) => <option key={day}>{day}</option>)}</select>
              </div>
              <span className="cdb-working-hours-card-label">Hours</span>
              <div className="cdb-working-hours-range">
                <input type="time" className="cdb-input" value={range.startTime} onChange={(event) => updateRange(index, 'startTime', event.target.value)} />
                <span>to</span>
                <input type="time" className="cdb-input" value={range.endTime} onChange={(event) => updateRange(index, 'endTime', event.target.value)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const BUSINESS_CATEGORIES = [
  'Retail & Local Shops',
  'Grocery / Kirana Store',
  'Supermarket',
  'Clothing & Apparel Store',
  'Footwear Store',
  'Electronics & Mobile Shop',
  'Furniture Store',
  'Hardware Store',
  'Stationery & Book Store',
  'Gift & Toy Store',
  'Jewelry Store',
  'Restaurant',
  'Café / Coffee Shop',
  'Bakery',
  'Sweet Shop',
  'Fast Food / Street Food',
  'Cloud Kitchen',
  'Catering Service',
  'Salon / Beauty Parlour',
  'Spa & Wellness Center',
  'Laundry / Dry Cleaning',
  'Tailor / Boutique',
  'Repair & Maintenance Services',
  'Cleaning Services',
  'Event Management',
  'Clinic / Doctor',
  'Dental Clinic',
  'Pharmacy / Medical Store',
  'Diagnostic Center',
  'Gym / Fitness Center',
  'Yoga / Meditation Center',
  'Coaching / Tuition Center',
  'School / College',
  'Preschool / Daycare',
  'Skill Training Institute',
  'Online Educator / Trainer',
  'Automobile Dealer',
  'Car / Bike Repair Service',
  'Driving School',
  'Taxi / Cab Service',
  'Logistics / Courier Service',
  'Real Estate Agency',
  'Property Management',
  'Construction Company',
  'Interior Designer',
  'Home Services (Plumber, Electrician, Carpenter)',
  'IT Services / Software Company',
  'Digital Marketing Agency',
  'Photography / Videography',
  'Consultancy / Professional Services',
  'Freelancer / Self-Employed',
  'Other',
]

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Puducherry',
]

const COMMON_SERVICE_SUGGESTIONS = [
  'Website Development',
  'E-commerce Development',
  'Mobile App Development',
  'Digital Marketing',
  'Search Engine Optimization',
  'Google Business Profile Management',
  'Social Media Marketing',
  'Graphic Design',
  'Branding',
  'Content Writing',
  'Lead Generation',
  'Online Advertising',
  'Business Consulting',
  'Home Delivery',
  'Customer Support',
]

function parseFriendlyError(rawMsg: string): { title: string; message: string; field?: string } {
  if (!rawMsg) {
    return {
      title: 'Unable to Save Details',
      message: 'Something went wrong while saving your details. Please check the entered fields and try again.',
    }
  }

  // 1. Duplicate email entry
  const dupEmailMatch = rawMsg.match(/Duplicate entry '([^']+@[^']+)'/i)
  if (dupEmailMatch) {
    return {
      title: 'Email Address Already Registered',
      message: `The email address "${dupEmailMatch[1]}" is already registered with another customer account. Please enter a different email address.`,
      field: 'email',
    }
  }

  // 2. Duplicate phone entry
  const dupPhoneMatch = rawMsg.match(/Duplicate entry '([0-9+ -]{7,15})'/i)
  if (dupPhoneMatch) {
    return {
      title: 'Phone Number Already Registered',
      message: `The phone number "${dupPhoneMatch[1]}" is already registered with an existing customer. Please enter a unique phone number.`,
      field: 'phone',
    }
  }

  // 3. Generic duplicate entry
  const genericDupMatch = rawMsg.match(/Duplicate entry '([^']+)'/i)
  if (genericDupMatch) {
    return {
      title: 'Duplicate Record Found',
      message: `The value "${genericDupMatch[1]}" already exists in the system. Please provide unique information.`,
    }
  }

  // 4. Already exists message
  if (rawMsg.toLowerCase().includes('already exists')) {
    return {
      title: 'Account Conflict',
      message: 'A customer account already exists with this email address or phone number. Please verify the entered details.',
    }
  }

  // 5. Database constraint / SQL error
  if (/could not execute statement|constraint|SQL/i.test(rawMsg)) {
    return {
      title: 'Conflict with Existing Record',
      message: 'One of the unique fields (such as Email or Phone) is already assigned to another customer in the system. Please review your entries.',
    }
  }

  // 6. Transaction rollback error (Spring UnexpectedRollbackException)
  if (/Transaction rolled back|rollback-only|UnexpectedRollback|rollback/i.test(rawMsg)) {
    return {
      title: 'Account Details Conflict',
      message: 'Unable to save because the entered Email or Phone number is already assigned to another customer. Please enter a unique email/phone.',
    }
  }

  // 7. Network / connection error
  if (/Failed to fetch|NetworkError|status 500|status 502|status 504/i.test(rawMsg)) {
    return {
      title: 'Server Connection Issue',
      message: 'Could not communicate with the server. Please check your network connection and try again.',
    }
  }

  return {
    title: 'Validation Notice',
    message: rawMsg,
  }
}

export function CustomerDetailsPage() {
  const isSharedForm = typeof window !== 'undefined' && window.location.pathname === '/customer-details'
  const navigate = useNavigate()
  const { session } = useCustomerSession()

  // Active step state: 1: Basic Info, 2: Billing, 3: Website, 4: Google, 5: Automation, 6: Done
  const [activeStep, setActiveStep] = useState<number>(1) // Default to step 1 for onboarding
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(() => new Set())
  const [showCompletionConfirm, setShowCompletionConfirm] = useState(false)
  const [completionAcknowledged, setCompletionAcknowledged] = useState(false)

  const [phone, setPhone] = useState('')
  const [searchContact, setSearchContact] = useState('')
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [isDuplicate, setIsDuplicate] = useState(false)
  const [ownerName, setOwnerName] = useState('')
  const [clientRemark, setClientRemark] = useState('')
  const [additionalInformation, setAdditionalInformation] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null)
  const [copiedServiceKey, setCopiedServiceKey] = useState<string | null>(null)

  // Step 2: Billing Form State
  const [billingAddress, setBillingAddress] = useState('')
  const [noGstNumber, setNoGstNumber] = useState(false)
  const [gstNumber, setGstNumber] = useState('')

  // Step 1 & 3: Website & Basic Info State
  const [domainStatus, setDomainStatus] = useState('')
  const [domainName, setDomainName] = useState('')
  const [logoOption, setLogoOption] = useState('')
  const [imageOption, setImageOption] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [basicBrandName, setBasicBrandName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [yearStarted, setYearStarted] = useState('')
  const [happyCustomers, setHappyCustomers] = useState('')
  const [additionalNumber, setAdditionalNumber] = useState('')
  const [basicAddress, setBasicAddress] = useState('')
  const [basicArea, setBasicArea] = useState('')
  const [basicState, setBasicState] = useState('')
  const [basicCity, setBasicCity] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [country, setCountry] = useState('India')
  const [bookingLink, setBookingLink] = useState('')
  const [paymentLink, setPaymentLink] = useState('')
  const [businessCategory, setBusinessCategory] = useState('')
  const [customBusinessCategory, setCustomBusinessCategory] = useState('')
  const [businessTagline, setBusinessTagline] = useState('')
  const [email, setEmail] = useState(session?.email ?? '')
  const [servicesInput, setServicesInput] = useState('')
  const [mainServices, setMainServices] = useState<string[]>([])
  const [serviceSuggestionsOpen, setServiceSuggestionsOpen] = useState(false)
  const [websiteBusinessName, setWebsiteBusinessName] = useState('')
  const [websiteCategory, setWebsiteCategory] = useState('')
  const [websiteFullAddress, setWebsiteFullAddress] = useState('')
  const [websiteContactEmail, setWebsiteContactEmail] = useState('')
  const [mapLink, setMapLink] = useState('')
  const [socialLinkInput, setSocialLinkInput] = useState('')
  const [socialLinks, setSocialLinks] = useState<string[]>([])
  const [websiteWorkingHours, setWebsiteWorkingHours] = useState<WorkingHourItem[]>([])
  const isWebsiteNotInPackage = domainStatus === 'Website Not in Package'

  // Step 4: Google Step Specific Form State
  const [gmbProfileLink, setGmbProfileLink] = useState('')
  const [noGmbLink, setNoGmbLink] = useState(false)
  const [brandName, setBrandName] = useState('')
  const [googleBusinessCategory, setGoogleBusinessCategory] = useState('')
  const [googleReviewLink, setGoogleReviewLink] = useState('')
  const [appointmentLink, setAppointmentLink] = useState('')

  // Step 5: Automation Step Specific Form State
  const [automationBusinessName, setAutomationBusinessName] = useState('')
  const [automationCategory, setAutomationCategory] = useState('')
  const [mainGoal, setMainGoal] = useState('')
  const [offers, setOffers] = useState<OfferItem[]>([
    { id: 'off-1', offerType: '', discountValue: '', description: '' },
  ])
  const [area, setArea] = useState('')
  const [fullAddress, setFullAddress] = useState('')
  const [stateName, setStateName] = useState('')
  const [cityName, setCityName] = useState('')
  const [googleMapLink, setGoogleMapLink] = useState('')
  const [websiteLink, setWebsiteLink] = useState('')
  const [autoServicesInput, setAutoServicesInput] = useState('')
  const [autoServices, setAutoServices] = useState<string[]>([])
  const [aiChatbotEmail, setAiChatbotEmail] = useState('')
  const [aiChatbotLink, setAiChatbotLink] = useState('')

  const resolvedBusinessCategory = businessCategory === 'Other'
    ? customBusinessCategory.trim()
    : businessCategory.trim()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const search = new URLSearchParams(window.location.search)
    const decrypted = decryptUrlParams(search)

    // Older copied links carry the sending staff member's login token in `validation`. Never store it:
    // it is not the customer's, and a token-only session with no user breaks the login page.

    const contact = (decrypted.contact || search.get('contact') || search.get('phone') || '').trim()
    const rawCustId = (decrypted.customerId || search.get('customerId') || '').trim()
    const rawIsDup = decrypted.isDuplicate === 'true' || search.get('isDuplicate') === 'true'
    const hasUrlLookup = Boolean(contact || rawCustId || rawIsDup)
    const sessionCustomerId = (session?.customerId || '').trim()
    const sessionPhone = session?.phone && session.phone !== 'XXXXXXXXXX' ? session.phone.trim() : ''
    const sessionContact = sessionPhone || (session?.email || '').trim()
    const lookupContact = hasUrlLookup ? contact : sessionContact
    const lookupCustomerId = hasUrlLookup
      ? rawCustId
      : (/^\d+$/.test(sessionCustomerId) ? sessionCustomerId : '')

    if (lookupCustomerId) setCustomerId(lookupCustomerId)
    if (rawIsDup || rawCustId) setIsDuplicate(true)

    if (lookupContact || lookupCustomerId) {
      if (lookupContact) {
        setPhone(lookupContact)
        setSearchContact(lookupContact)
      }
      getCustomerProfileDetails(lookupContact, lookupCustomerId ? Number(lookupCustomerId) : undefined)
        .then((profile) => {
          if (!rawIsDup && profile.customerId) setCustomerId(String(profile.customerId))
          if (profile.phone) setPhone(profile.phone)
          if (profile.ownerName) setOwnerName(profile.ownerName)
          if (profile.businessName) setBusinessName(profile.businessName)
          if (profile.businessName) { setWebsiteBusinessName(profile.businessName); setAutomationBusinessName(profile.businessName) }
          if (profile.brandName) setBasicBrandName(profile.brandName)
          if (profile.businessType) setBusinessType(profile.businessType)
          if (profile.yearStarted) setYearStarted(profile.yearStarted)
          if (profile.happyCustomers) setHappyCustomers(profile.happyCustomers)
          if (profile.additionalNumber) setAdditionalNumber(profile.additionalNumber)
          if (profile.email) setEmail(profile.email)
          if (profile.billingAddress) setBillingAddress(profile.billingAddress)
          if (profile.gstNumber) setGstNumber(profile.gstNumber)
          if (profile.domain) setDomainName(profile.domain)
          if (profile.domainStatus) setDomainStatus(profile.domainStatus)
          if (profile.logoLink) setLogoOption(profile.logoLink)
          if (profile.imagesLink) setImageOption(profile.imagesLink)
          if (profile.tagline) setBusinessTagline(profile.tagline)
          if (profile.businessCategory) {
            if (BUSINESS_CATEGORIES.includes(profile.businessCategory)) {
              setBusinessCategory(profile.businessCategory)
            } else {
              setBusinessCategory('Other')
              setCustomBusinessCategory(profile.businessCategory)
            }
          }
          if (profile.businessCategory) {
            setWebsiteCategory(profile.businessCategory)
            setGoogleBusinessCategory(profile.businessCategory)
            setAutomationCategory(profile.businessCategory)
          }
          if (profile.bookingLink) setBookingLink(profile.bookingLink)
          if (profile.paymentLink) setPaymentLink(profile.paymentLink)
          if (profile.topProducts) {
            const list = profile.topProducts.split(',').map((s: string) => s.trim()).filter(Boolean)
            if (list.length) { setMainServices(list); setAutoServices(list) }
          }
          if (profile.gmbProfileLink) {
            setGmbProfileLink(profile.gmbProfileLink)
            setMapLink(profile.gmbProfileLink)
            setGoogleMapLink(profile.gmbProfileLink)
          }
          if (profile.googleReviewLink) setGoogleReviewLink(profile.googleReviewLink)
          if (profile.appointmentLink) setAppointmentLink(profile.appointmentLink)
          if (profile.brandName) setBrandName(profile.brandName)
          if (profile.websiteLink) setWebsiteLink(profile.websiteLink)
          if (profile.area) { setBasicArea(profile.area); setArea(profile.area) }
          if (profile.city) { setBasicCity(profile.city); setCityName(profile.city) }
          if (profile.state) { setBasicState(profile.state); setStateName(profile.state) }
          if (profile.address) { setBasicAddress(profile.address); setWebsiteFullAddress(profile.address); setFullAddress(profile.address) }
          if (profile.zipCode) setZipCode(profile.zipCode)
          if (profile.country) setCountry(profile.country)
          if (profile.remarks) setClientRemark(profile.remarks)
          if (profile.additionalInstructions) setAdditionalInformation(profile.additionalInstructions)
          if (profile.email) setWebsiteContactEmail(profile.email)
          if (profile.socialLinks) setSocialLinks(profile.socialLinks.split(',').map((item) => item.trim()).filter(Boolean))
          if (profile.workingHours) {
            try {
              const parsedHours = JSON.parse(profile.workingHours)
              if (Array.isArray(parsedHours)) {
                const hours = parsedHours.map((item) => {
                  const legacyFrom = String(item.from || item.f || '')
                  const legacyTo = String(item.to || item.t || '')
                  const fromDate = legacyFrom.includes('T') ? new Date(legacyFrom) : null
                  const toDate = legacyTo.includes('T') ? new Date(legacyTo) : null
                  return {
                    startDay: String(item.startDay || item.fromDay || item.day || item.d || (fromDate && !Number.isNaN(fromDate.getTime()) ? WEEKDAYS[(fromDate.getDay() + 6) % 7] : 'Mon')).slice(0, 3),
                    endDay: String(item.endDay || item.toDay || (toDate && !Number.isNaN(toDate.getTime()) ? WEEKDAYS[(toDate.getDay() + 6) % 7] : 'Fri')).slice(0, 3),
                    startTime: item.startTime || item.fromTime || item.f || (legacyFrom.includes('T') ? legacyFrom.split('T')[1].slice(0, 5) : legacyFrom) || '09:00',
                    endTime: item.endTime || item.toEndTime || item.fromEndTime || item.t || (legacyTo.includes('T') ? legacyTo.split('T')[1].slice(0, 5) : legacyTo) || '18:00',
                  }
                })
                setWebsiteWorkingHours(hours)
              }
            } catch {
              // Older records may contain free-text working hours.
            }
          }
          if (profile.mainGoal) setMainGoal(profile.mainGoal)
          if (profile.aiChatbotEmail) setAiChatbotEmail(profile.aiChatbotEmail)
          if (profile.aiChatbotLink) setAiChatbotLink(profile.aiChatbotLink)
          if (profile.offers) {
            try {
              const parsed = JSON.parse(profile.offers)
              if (Array.isArray(parsed) && parsed.length) {
                setOffers(parsed.map((o: any, idx: number) => ({
                  id: o.id || `off-${idx + 1}`,
                  offerType: o.offerType || o.type || '',
                  discountValue: o.discountValue || o.val || '',
                  description: o.description || o.desc || '',
                })))
              }
            } catch {}
          }
        })
        .catch(console.error)
    }
  }, [session?.customerId, session?.email, session?.phone])

  const allFormStepsCompleted = [1, 2, 3, 4, 5].every((step) => completedSteps.has(step))
  const progressPercent = Math.round((completedSteps.size / 5) * 100)

  const missingRecommendedFields = useMemo(() => {
    const fields = [
      { label: 'Brand Name', value: basicBrandName || brandName },
      { label: 'Business Category', value: resolvedBusinessCategory || googleBusinessCategory },
      { label: 'Area', value: basicArea || area },
      { label: 'State', value: basicState || stateName },
      { label: 'City', value: basicCity || cityName },
      { label: 'Google Review Link', value: googleReviewLink },
    ]
    return fields.filter((field) => !field.value.trim()).map((field) => field.label)
  }, [area, basicArea, basicBrandName, basicCity, basicState, brandName, cityName, googleBusinessCategory, googleReviewLink, resolvedBusinessCategory, stateName])

  const serviceSuggestions = useMemo(() => {
    const entered = servicesInput.trim()
    const input = entered.toLowerCase()
    if (!input || entered.includes(',')) return []
    const selected = new Set(mainServices.map((service) => service.toLowerCase()))
    const matches = COMMON_SERVICE_SUGGESTIONS
      .filter((service) => service.toLowerCase().includes(input) && !selected.has(service.toLowerCase()))
    const canAddEntered = !selected.has(input)
      && !matches.some((service) => service.toLowerCase() === input)
    return (canAddEntered ? [entered, ...matches] : matches).slice(0, 6)
  }, [mainServices, servicesInput])

  const basicCityOptions = useMemo(() => getCitiesForState(basicState, basicCity), [basicCity, basicState])
  const automationCityOptions = useMemo(() => getCitiesForState(stateName, cityName), [cityName, stateName])

  async function handleNextStep(e?: FormEvent, confirmedRecommendedFields = false) {
    if (e) e.preventDefault()
    if (isSaving) return

    if ((isSharedForm || activeStep === 5) && missingRecommendedFields.length > 0 && !confirmedRecommendedFields) {
      setCompletionAcknowledged(false)
      setShowCompletionConfirm(true)
      return
    }

    const effectivePhone = (phone || searchContact || session?.phone || '').trim()

    // Validation
    if (isSharedForm || activeStep === 1) {
      if (!businessName.trim()) {
        setToast({ type: 'error', title: 'Required Field', message: 'Business Name is required before proceeding.' })
        return
      }
      if (!effectivePhone) {
        setToast({ type: 'error', title: 'Required Field', message: 'Phone / WhatsApp Number is required before proceeding.' })
        return
      }
      if (!email.trim()) {
        setToast({ type: 'error', title: 'Required Field', message: 'Email address is required before proceeding.' })
        return
      }
    }

    if (!effectivePhone) {
      setToast({ type: 'error', title: 'Phone Required', message: 'Phone number is required to save customer details.' })
      return
    }

    const servicesForSave = mergeServices(mainServices, servicesInput.split(','))
    const autoServicesForSave = mergeServices(autoServices, autoServicesInput.split(','))
    if ((isSharedForm || activeStep === 3) && servicesForSave.length !== mainServices.length) {
      setMainServices(servicesForSave)
      setAutoServices((automationItems) => (
        automationItems.length === 0 || servicesMatch(automationItems, mainServices) ? [...servicesForSave] : automationItems
      ))
      setServicesInput('')
      setServiceSuggestionsOpen(false)
    }
    if ((isSharedForm || activeStep === 5) && autoServicesForSave.length !== autoServices.length) {
      setAutoServices(autoServicesForSave)
      setAutoServicesInput('')
    }

    const rawPayload: Record<string, any> = {
      phone: effectivePhone,
      customerId: customerId ? Number(customerId) : undefined,
      businessName: automationBusinessName.trim() || websiteBusinessName.trim() || businessName.trim() || undefined,
      ownerName: ownerName.trim() || undefined,
      email: email.trim() || undefined,
      brandName: brandName.trim() || basicBrandName.trim() || undefined,
      businessType: businessType.trim() || undefined,
      yearStarted: yearStarted.trim() || undefined,
      happyCustomers: happyCustomers.trim() || undefined,
      additionalNumber: additionalNumber.trim() || undefined,
      billingAddress: billingAddress.trim() || undefined,
      gstNumber: noGstNumber ? undefined : gstNumber.trim() || undefined,
      domain: domainName.trim() || undefined,
      domainStatus: domainStatus.trim() || undefined,
      logoLink: logoOption.trim() || undefined,
      imagesLink: imageOption.trim() || undefined,
      tagline: businessTagline.trim() || undefined,
      businessCategory: automationCategory.trim() || googleBusinessCategory.trim() || websiteCategory.trim() || resolvedBusinessCategory || undefined,
      bookingLink: bookingLink.trim() || undefined,
      paymentLink: paymentLink.trim() || undefined,
      topProducts: (autoServicesForSave.length ? autoServicesForSave : servicesForSave).join(', ') || undefined,
      gmbProfileLink: noGmbLink ? undefined : googleMapLink.trim() || gmbProfileLink.trim() || mapLink.trim() || undefined,
      googleReviewLink: googleReviewLink.trim() || undefined,
      appointmentLink: appointmentLink.trim() || undefined,
      address: fullAddress.trim() || websiteFullAddress.trim() || billingAddress.trim() || basicAddress.trim() || undefined,
      area: area.trim() || basicArea.trim() || undefined,
      city: cityName.trim() || basicCity.trim() || undefined,
      state: stateName.trim() || basicState.trim() || undefined,
      zipCode: zipCode.trim() || undefined,
      country: country.trim() || undefined,
      socialLinks: socialLinks.length ? socialLinks.join(', ') : undefined,
      workingHours: websiteWorkingHours.length ? JSON.stringify(websiteWorkingHours) : undefined,
      websiteLink: websiteLink.trim() || undefined,
      mainGoal: mainGoal.trim() || undefined,
      remarks: clientRemark.trim() || undefined,
      additionalInstructions: additionalInformation.trim() || undefined,
      offers: offers.filter(o => o.offerType || o.discountValue || o.description).length
        ? JSON.stringify(offers.filter(o => o.offerType || o.discountValue || o.description))
        : undefined,
      aiChatbotEmail: aiChatbotEmail.trim() || undefined,
      aiChatbotLink: aiChatbotLink.trim() || undefined,
      source: 'ONBOARDING_FORM',
    }

    // Filter out undefined and empty string values
    const payload: Partial<CustomerProfileDetails> = {}
    Object.entries(rawPayload).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        (payload as any)[k] = v
      }
    })

    setIsSaving(true)
    try {
      console.log('[CustomerDetails] Calling saveCustomerProfileDetails with:', payload)
      const res = await saveCustomerProfileDetails(payload, isDuplicate)
      console.log('[CustomerDetails] saveCustomerProfileDetails success:', res)

      setToast({
        type: 'success',
        title: 'Details Saved Successfully',
        message: isSharedForm || activeStep === 5 ? 'All customer details have been saved to your business profile.' : 'Step details saved. Proceeding to next step.',
      })
      setTimeout(() => setToast(null), 4000)

      setCompletedSteps((previous) => {
        const next = new Set(previous)
        next.add(activeStep)
        return next
      })

      if (isSharedForm) {
        setShowCompletionConfirm(false)
        setCompletionAcknowledged(false)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else if (activeStep < 5) {
        prefillRepeatedFields(activeStep + 1, servicesForSave)
        setActiveStep((prev) => prev + 1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else if (activeStep === 5) {
        setShowCompletionConfirm(false)
        setCompletionAcknowledged(false)
        setActiveStep(6)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (err: any) {
      console.error('[CustomerDetails] Failed to save customer details:', err)
      const friendly = parseFriendlyError(err?.message || err?.error || String(err))
      setToast({
        type: 'error',
        title: friendly.title,
        message: friendly.message,
      })
      // Stay on the current step so the user can fix the field!
    } finally {
      setIsSaving(false)
    }
  }

  function handlePrevStep() {
    if (activeStep > 1) {
      setActiveStep((prev) => prev - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function mergeServices(items: string[], values: string[]) {
    const merged = [...items]
    const selected = new Set(items.map((item) => item.toLowerCase()))
    for (const rawValue of values) {
      const service = rawValue.trim()
      const key = service.toLowerCase()
      if (!service || selected.has(key) || merged.length >= 15) continue
      merged.push(service)
      selected.add(key)
    }
    return merged
  }

  function servicesMatch(first: string[], second: string[]) {
    return first.length === second.length
      && first.every((service, index) => service.toLowerCase() === second[index]?.toLowerCase())
  }

  function addMainService(value: string) {
    const nextItems = mergeServices(mainServices, value.split(','))
    setMainServices(nextItems)
    setAutoServices((automationItems) => (
      automationItems.length === 0 || servicesMatch(automationItems, mainServices) ? [...nextItems] : automationItems
    ))
    setServicesInput('')
    setServiceSuggestionsOpen(false)
  }

  function handleAddService() {
    addMainService(servicesInput)
  }

  function removeMainService(index: number) {
    const nextItems = mainServices.filter((_, itemIndex) => itemIndex !== index)
    setMainServices(nextItems)
    setAutoServices((automationItems) => servicesMatch(automationItems, mainServices) ? [...nextItems] : automationItems)
  }

  function handleAddAutoService() {
    setAutoServices((items) => mergeServices(items, autoServicesInput.split(',')))
    setAutoServicesInput('')
  }

  async function copyServicesToClipboard(services: string[], copyAll = false, copyKey = '') {
    const text = copyAll ? services.join(', ') : services[0]
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopiedServiceKey(copyKey)
      window.setTimeout(() => setCopiedServiceKey((current) => current === copyKey ? null : current), 2000)
      setToast({
        type: 'success',
        title: copyAll ? 'Services Copied' : 'Service Copied',
        message: copyAll ? `${services.length} services copied to the clipboard.` : `“${text}” copied to the clipboard.`,
      })
      window.setTimeout(() => setToast(null), 2500)
    } catch {
      setToast({ type: 'error', title: 'Copy Failed', message: 'Clipboard access is unavailable. Please copy the text manually.' })
    }
  }

  function addSocialLink() {
    const link = socialLinkInput.trim()
    if (!link || socialLinks.length >= 10 || socialLinks.includes(link)) return
    setSocialLinks((items) => [...items, link])
    setSocialLinkInput('')
  }

  function canReplaceMappedValue(current: string, ...previousValues: string[]) {
    const normalizedCurrent = current.trim()
    return !normalizedCurrent || previousValues.some((value) => value.trim() && normalizedCurrent === value.trim())
  }

  function updateBasicAddress(nextValue: string) {
    const previousValue = basicAddress
    setBasicAddress(nextValue)
    setBillingAddress((current) => canReplaceMappedValue(current, previousValue) ? nextValue : current)
    setWebsiteFullAddress((current) => canReplaceMappedValue(current, previousValue) ? nextValue : current)
    setFullAddress((current) => canReplaceMappedValue(current, previousValue) ? nextValue : current)
  }

  function updateBillingAddress(nextValue: string) {
    const previousValue = billingAddress
    setBillingAddress(nextValue)
    setWebsiteFullAddress((current) => canReplaceMappedValue(current, previousValue, basicAddress) ? nextValue : current)
    setFullAddress((current) => canReplaceMappedValue(current, previousValue, basicAddress) ? nextValue : current)
  }

  function updateWebsiteFullAddress(nextValue: string) {
    const previousValue = websiteFullAddress
    setWebsiteFullAddress(nextValue)
    setFullAddress((current) => canReplaceMappedValue(current, previousValue, billingAddress, basicAddress) ? nextValue : current)
  }

  function updateBasicArea(nextValue: string) {
    const previousValue = basicArea
    setBasicArea(nextValue)
    setArea((current) => canReplaceMappedValue(current, previousValue) ? nextValue : current)
  }

  function updateBasicState(nextValue: string) {
    const previousValue = basicState
    const automationStateIsMapped = canReplaceMappedValue(stateName, previousValue)
    setBasicState(nextValue)
    if (!getCitiesForState(nextValue).includes(basicCity)) setBasicCity('')
    if (automationStateIsMapped) {
      setStateName(nextValue)
      if (!getCitiesForState(nextValue).includes(cityName)) setCityName('')
    }
  }

  function updateBasicCity(nextValue: string) {
    const previousValue = basicCity
    setBasicCity(nextValue)
    setCityName((current) => canReplaceMappedValue(current, previousValue) ? nextValue : current)
  }

  function updateBusinessName(nextValue: string) {
    const previousValue = businessName
    setBusinessName(nextValue)
    setWebsiteBusinessName((current) => canReplaceMappedValue(current, previousValue) ? nextValue : current)
    setAutomationBusinessName((current) => canReplaceMappedValue(current, previousValue) ? nextValue : current)
  }

  function updateWebsiteBusinessName(nextValue: string) {
    const previousValue = websiteBusinessName
    setWebsiteBusinessName(nextValue)
    setAutomationBusinessName((current) => canReplaceMappedValue(current, previousValue, businessName) ? nextValue : current)
  }

  function updateBasicBrandName(nextValue: string) {
    const previousValue = basicBrandName
    setBasicBrandName(nextValue)
    setBrandName((current) => canReplaceMappedValue(current, previousValue) ? nextValue : current)
  }

  function syncBusinessCategory(nextValue: string, previousValue: string) {
    setWebsiteCategory((current) => canReplaceMappedValue(current, previousValue) ? nextValue : current)
    setGoogleBusinessCategory((current) => canReplaceMappedValue(current, previousValue) ? nextValue : current)
    setAutomationCategory((current) => canReplaceMappedValue(current, previousValue) ? nextValue : current)
  }

  function updateBusinessCategory(nextValue: string) {
    const previousValue = resolvedBusinessCategory
    setBusinessCategory(nextValue)
    if (nextValue !== 'Other') {
      setCustomBusinessCategory('')
      syncBusinessCategory(nextValue, previousValue)
    } else {
      syncBusinessCategory('', previousValue)
    }
  }

  function updateCustomBusinessCategory(nextValue: string) {
    const previousValue = customBusinessCategory
    setCustomBusinessCategory(nextValue)
    syncBusinessCategory(nextValue, previousValue)
  }

  function updateWebsiteCategory(nextValue: string) {
    const previousValue = websiteCategory
    setWebsiteCategory(nextValue)
    setGoogleBusinessCategory((current) => canReplaceMappedValue(current, previousValue, resolvedBusinessCategory) ? nextValue : current)
    setAutomationCategory((current) => canReplaceMappedValue(current, previousValue, resolvedBusinessCategory) ? nextValue : current)
  }

  function updateGoogleBusinessCategory(nextValue: string) {
    const previousValue = googleBusinessCategory
    setGoogleBusinessCategory(nextValue)
    setAutomationCategory((current) => canReplaceMappedValue(current, previousValue, websiteCategory, resolvedBusinessCategory) ? nextValue : current)
  }

  function updateMapLink(nextValue: string) {
    const previousValue = mapLink
    setMapLink(nextValue)
    setGmbProfileLink((current) => canReplaceMappedValue(current, previousValue) ? nextValue : current)
    setGoogleMapLink((current) => canReplaceMappedValue(current, previousValue) ? nextValue : current)
  }

  function updateGmbProfileLink(nextValue: string) {
    const previousValue = gmbProfileLink
    setGmbProfileLink(nextValue)
    setGoogleMapLink((current) => canReplaceMappedValue(current, previousValue, mapLink) ? nextValue : current)
  }

  function prefillRepeatedFields(step: number, servicesOverride?: string[]) {
    if (step === 2) {
      setBillingAddress((value) => value.trim() ? value : basicAddress)
    }

    if (step === 3) {
      setWebsiteBusinessName((value) => value.trim() ? value : businessName)
      setWebsiteCategory((value) => value.trim() ? value : resolvedBusinessCategory)
      setWebsiteFullAddress((value) => value.trim() ? value : (billingAddress || basicAddress))
      setWebsiteContactEmail((value) => value.trim() ? value : email)
    }

    if (step === 4) {
      setBrandName((value) => value.trim() ? value : basicBrandName)
      setGoogleBusinessCategory((value) => value.trim() ? value : (websiteCategory || resolvedBusinessCategory))
    }

    if (step === 5) {
      setAutomationBusinessName((value) => value.trim() ? value : (websiteBusinessName || businessName))
      setAutomationCategory((value) => value.trim() ? value : (googleBusinessCategory || websiteCategory || resolvedBusinessCategory))
      setArea((value) => value.trim() ? value : basicArea)
      setFullAddress((value) => value.trim() ? value : (websiteFullAddress || billingAddress || basicAddress))
      setStateName((value) => value.trim() ? value : basicState)
      setCityName((value) => value.trim() ? value : basicCity)
      setGoogleMapLink((value) => value.trim() ? value : (gmbProfileLink || mapLink))
      setAutoServices((items) => items.length > 0 ? items : [...(servicesOverride ?? mainServices)])
    }
  }

  async function copyShareableFormLink() {
    const link = getCustomerFormUrl(phone || searchContact || session?.phone, isDuplicate, customerId)
    if (!link) {
      setToast({ type: 'error', title: 'Phone Required', message: 'Enter a phone number before copying the shareable form link.' })
      return
    }
    const absoluteLink = `${window.location.origin}${link}`
    try {
      await navigator.clipboard.writeText(absoluteLink)
      setToast({ type: 'success', title: 'Shareable Link Copied', message: 'Anyone with this link can open and complete the customer details form.' })
      window.setTimeout(() => setToast(null), 4000)
    } catch {
      setToast({ type: 'error', title: 'Copy Failed', message: 'Clipboard access was unavailable. Please copy the URL from the address bar.' })
    }
  }

  async function copyCustomerFormDetails() {
    const servicesForCopy = mergeServices(mainServices, servicesInput.split(','))
    const automationServicesForCopy = mergeServices(autoServices, autoServicesInput.split(','))
    const workingHoursText = websiteWorkingHours
      .map((item) => `${item.startDay} ${item.startTime} to ${item.endDay} ${item.endTime}`)
      .join('; ')
    const offersText = offers
      .filter((offer) => offer.offerType || offer.discountValue || offer.description)
      .map((offer) => [offer.offerType, offer.discountValue, offer.description].filter(Boolean).join(' - '))
      .join('; ')

    const sections: Array<{ title: string; rows: Array<[string, string | undefined]> }> = [
      {
        title: 'Basic Information',
        rows: [
          ['Business Name', businessName], ['Brand Name', basicBrandName],
          ['Business Category', resolvedBusinessCategory], ['Business Type', businessType],
          ['Year Started', yearStarted], ['Happy Customers', happyCustomers],
          ['Email', email], ['Phone / WhatsApp', phone], ['Additional Number', additionalNumber],
          ['Address', basicAddress], ['Area', basicArea], ['State', basicState], ['City', basicCity],
          ['Zip Code', zipCode], ['Country', country],
        ],
      },
      {
        title: 'Billing Information',
        rows: [
          ['Billing Address', billingAddress],
          ['GST Number', noGstNumber ? 'I do not have a GST Number' : gstNumber],
        ],
      },
      {
        title: 'Website Information',
        rows: [
          ['Domain Status', domainStatus], ['Domain Name', domainName], ['Logo Option', logoOption],
          ['Image Option', imageOption], ['Business Name', websiteBusinessName],
          ['Booking Link', bookingLink], ['Payment Link', paymentLink],
          ['Business Category', websiteCategory], ['Business Tagline', businessTagline],
          ['Main Services / Products', servicesForCopy.join(', ')],
          ['Full Address', websiteFullAddress], ['Contact Email', websiteContactEmail],
          ['Google Map Link', mapLink], ['Social Links', socialLinks.join(', ')],
          ['Working Hours', workingHoursText],
        ],
      },
      {
        title: 'Google Information',
        rows: [
          ['GMB Profile Link', noGmbLink ? "Don't have link" : gmbProfileLink],
          ['Brand Name', brandName], ['Business Category', googleBusinessCategory],
          ['Google Review Link', googleReviewLink], ['Appointment Link', appointmentLink],
        ],
      },
      {
        title: 'Automation Information',
        rows: [
          ['Business Name', automationBusinessName], ['Business Category', automationCategory],
          ['Main Goal', mainGoal], ['Offers', offersText], ['Area', area], ['Full Address', fullAddress],
          ['State', stateName], ['City', cityName], ['Google Map Link', googleMapLink],
          ['Website Link', websiteLink],
          ['Services / Products', automationServicesForCopy.join(', ')],
          ['AI Chatbot Email', aiChatbotEmail], ['AI Chatbot Link', aiChatbotLink],
        ],
      },
      {
        title: 'Additional Details',
        rows: [
          ...(isSharedForm ? [['Client Remark', clientRemark] as [string, string]] : []),
          ['Additional Information', additionalInformation],
        ],
      },
    ]

    const text = sections
      .map((section) => {
        const populatedRows = section.rows.filter(([, value]) => value?.trim())
        if (!populatedRows.length) return ''
        return `${section.title}\n${populatedRows.map(([label, value]) => `${label}: ${value?.trim()}`).join('\n')}`
      })
      .filter(Boolean)
      .join('\n\n')

    try {
      await navigator.clipboard.writeText(text || 'No customer details entered.')
      setToast({ type: 'success', title: 'Form Details Copied', message: 'All populated customer details were copied to the clipboard.' })
      window.setTimeout(() => setToast(null), 3000)
    } catch {
      setToast({ type: 'error', title: 'Copy Failed', message: 'Clipboard access was unavailable. Please try again.' })
    }
  }

  function handleAddOffer() {
    setOffers([
      ...offers,
      { id: `off-${Date.now()}`, offerType: '', discountValue: '', description: '' },
    ])
  }

  function handleUpdateOffer(id: string, field: keyof OfferItem, value: string) {
    setOffers((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o)),
    )
  }

  return (
    <CustomerDashboardLayout activeKey="my-details" standalone={isSharedForm}>
      <div className="cdb-body">
        {/* Breadcrumb line */}
        {!isSharedForm ? <div className="cdb-preview-bar">
          <span className="cdb-preview-icon">
            <Icon name="eye" size={16} />
          </span>
          <span>
            MBG Card &gt; <strong>Customer Dashboard</strong> — Your services, bills &amp; account at a glance
          </span>
        </div> : null}

        {/* Main Details Card */}
        <div className="cdb-card" style={{ padding: '24px' }}>
          {toast && (
            <div
              style={{
                marginBottom: '20px',
                padding: '14px 18px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '14px',
                backgroundColor: toast.type === 'success' ? '#f0fdf4' : '#fff5f5',
                color: toast.type === 'success' ? '#166534' : '#991b1b',
                border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                boxShadow: toast.type === 'success'
                  ? '0 4px 16px rgba(22, 163, 74, 0.12)'
                  : '0 4px 16px rgba(239, 68, 68, 0.12)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    backgroundColor: toast.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color: toast.type === 'success' ? '#16a34a' : '#dc2626',
                  }}
                >
                  {toast.type === 'success' ? (
                    <CheckCircle2 style={{ width: '18px', height: '18px' }} />
                  ) : (
                    <AlertCircle style={{ width: '18px', height: '18px' }} />
                  )}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: toast.type === 'success' ? '#14532d' : '#7f1d1d',
                      marginBottom: '3px',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {toast.title}
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      lineHeight: '1.5',
                      color: toast.type === 'success' ? '#166534' : '#991b1b',
                      fontWeight: 500,
                    }}
                  >
                    {toast.message}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: toast.type === 'success' ? '#15803d' : '#b91c1c',
                  opacity: 0.8,
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1'
                  e.currentTarget.style.backgroundColor = toast.type === 'success' ? '#dcfce7' : '#fee2e2'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.8'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
                title="Dismiss"
              >
                <CloseIcon style={{ width: '16px', height: '16px' }} />
              </button>
            </div>
          )}

          {/* Card Title & Progress Header */}
          <div className="cdb-card-header cdb-customer-form-header" style={{ marginBottom: '16px' }}>
            <div className="cdb-card-title-group">
              <div className="cdb-card-icon-box">
                <Icon name="userIn" size={18} />
              </div>
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#2563eb',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  {isSharedForm ? 'SHAREABLE CUSTOMER FORM' : 'CUSTOMER DETAILS'}
                </span>
                <h2 className="cdb-card-title" style={{ fontSize: '20px' }}>
                  {isSharedForm ? 'Customer Details' : 'Complete your business profile'}
                </h2>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {!isSharedForm ? <>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  PROFILE
                </span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#2563eb' }}>{progressPercent}%</div>
              </div>
              <button
                type="button"
                className="cdb-btn-secondary cdb-share-link-button"
                onClick={() => void copyShareableFormLink()}
                style={{
                  borderRadius: '8px',
                  height: '36px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                }}
                title="Copy shareable customer form link"
              >
                <Icon name="copy" size={16} />
                <span>Copy shareable link</span>
              </button>
              <button type="button" className="cdb-btn-secondary cdb-share-link-button" onClick={() => void copyCustomerFormDetails()} title="Copy all customer form details">
                <Icon name="copy" size={16} />
                <span>Copy Form</span>
              </button>
              </> : (
                <>
                  <button type="button" className="cdb-btn-secondary cdb-share-link-button" onClick={() => void copyShareableFormLink()} title="Copy this editable customer form link">
                    <Icon name="copy" size={16} />
                    <span>Copy Form Link</span>
                  </button>
                  <button type="button" className="cdb-btn-secondary cdb-share-link-button" onClick={() => void copyCustomerFormDetails()} title="Copy all customer form details">
                    <Icon name="copy" size={16} />
                    <span>Copy Form</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Stepper Tabs Bar (Strict 5 Steps + Done) */}
          {!isSharedForm ? <div
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '8px',
              borderBottom: '1px solid #e2e8f0',
              marginBottom: '20px',
            }}
          >
            {[
              { step: 1, label: 'Basic Info' },
              { step: 2, label: 'Billing' },
              { step: 3, label: 'Website' },
              { step: 4, label: 'Google' },
              { step: 5, label: 'Automation' },
              { step: 6, label: 'Done' },
            ].map((st) => {
              const isCurrent = activeStep === st.step
              const isDone = st.step <= 5 && completedSteps.has(st.step)
              const isLocked = st.step === 6 && !allFormStepsCompleted

              return (
                <button
                  key={st.label}
                  type="button"
                  disabled={isLocked}
                  aria-current={isCurrent ? 'step' : undefined}
                  onClick={() => {
                    if (isLocked) return
                    prefillRepeatedFields(st.step)
                    setActiveStep(st.step)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '999px',
                    border: isCurrent ? 'none' : isDone ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                    background: isCurrent
                      ? 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
                      : isDone
                        ? '#f0fdf4'
                        : '#ffffff',
                    color: isCurrent ? '#ffffff' : isDone ? '#15803d' : isLocked ? '#94a3b8' : '#475569',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    opacity: isLocked ? 0.72 : 1,
                    whiteSpace: 'nowrap',
                    boxShadow: isCurrent ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  {isDone ? (
                    <CheckCircle2 style={{ width: '14px', height: '14px', color: '#16a34a' }} />
                  ) : isLocked ? (
                    <Lock style={{ width: '13px', height: '13px' }} />
                  ) : null}
                  <span>{st.label}</span>
                </button>
              )
            })}
          </div> : null}

          <div className={isSharedForm ? 'cdb-shared-form-sections' : undefined}>

          {/* STEP 1: Basic Info */}
          {isSharedForm || activeStep === 1 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ borderLeft: '3px solid #2563eb', paddingLeft: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Basic Information</h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Tell us about your business</p>
              </div>
              <div className="cdb-details-grid">
                <label className="cdb-field"><span>Business Name *</span><input className="cdb-input" value={businessName} onChange={(e) => updateBusinessName(e.target.value)} placeholder="e.g. CV Sales & Marketing" /></label>
                <label className="cdb-field"><span>Brand Name</span><input className="cdb-input" value={basicBrandName} onChange={(e) => updateBasicBrandName(e.target.value)} placeholder="As per Google My Business" /></label>
                <label className="cdb-field">
                  <span>Business Category</span>
                  <select
                    className="cdb-select"
                    value={businessCategory}
                    onChange={(e) => updateBusinessCategory(e.target.value)}
                  >
                    <option value="">Select business category...</option>
                    {BUSINESS_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
                  </select>
                  {businessCategory === 'Other' ? (
                    <input
                      className="cdb-input"
                      value={customBusinessCategory}
                      onChange={(e) => updateCustomBusinessCategory(e.target.value)}
                      placeholder="Enter your business category"
                      aria-label="Custom business category"
                    />
                  ) : null}
                </label>
                <label className="cdb-field"><span>Business Type</span><input className="cdb-input" value={businessType} onChange={(e) => setBusinessType(e.target.value)} placeholder="e.g. Proprietorship, Partnership, Pvt Ltd" /></label>
                <label className="cdb-field"><span>Year Started</span><input className="cdb-input" value={yearStarted} onChange={(e) => setYearStarted(e.target.value)} placeholder="e.g. 2020" /></label>
                <label className="cdb-field"><span>Happy Customers</span><input type="number" min="0" className="cdb-input" value={happyCustomers} onChange={(e) => setHappyCustomers(e.target.value)} placeholder="e.g. 100" /></label>
                <label className="cdb-field"><span>Email *</span><input type="email" className="cdb-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. info@company.com" /></label>
                <label className="cdb-field"><span>Phone / WhatsApp *</span><input type="tel" className="cdb-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 9876543210" /></label>
                <label className="cdb-field"><span>Additional Number</span><input type="tel" className="cdb-input" value={additionalNumber} onChange={(e) => setAdditionalNumber(e.target.value)} placeholder="Optional secondary phone number" /></label>
                <label className="cdb-field"><span>Address</span><input className="cdb-input" value={basicAddress} onChange={(e) => updateBasicAddress(e.target.value)} placeholder="e.g. 123, Main Street" /></label>
                <label className="cdb-field"><span>Area</span><input className="cdb-input" value={basicArea} onChange={(e) => updateBasicArea(e.target.value)} placeholder="Dhanwantri chowk, Deen Dayal, etc." /></label>
                <label className="cdb-field"><span>State</span><select className="cdb-select" value={basicState} onChange={(e) => updateBasicState(e.target.value)}><option value="">Select state...</option>{INDIAN_STATES.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className="cdb-field"><span>City</span><select className="cdb-select" value={basicCity} disabled={!basicState} onChange={(e) => updateBasicCity(e.target.value)}><option value="">{basicState ? 'Select city...' : 'Select state first...'}</option>{basicCityOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className="cdb-field"><span>Zip Code</span><input className="cdb-input" value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="000000" maxLength={10} /></label>
                <label className="cdb-field cdb-field-wide"><span>Country</span><input className="cdb-input" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. India" /></label>
              </div>
            </div>
          ) : null}

          {false && activeStep === 1 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ borderLeft: '3px solid #2563eb', paddingLeft: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  Information related to website
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  Optional — helps us build your site faster
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Domain Status
                  </label>
                  <select className="cdb-select" value={domainStatus} onChange={(e) => setDomainStatus(e.target.value)}>
                    <option value="">Select domain status...</option>
                    <option value="Already Have">Already Have Domain</option>
                    <option value="Need New">Need New Domain</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Domain Name
                  </label>
                  <input
                    type="text"
                    className="cdb-input"
                    placeholder="e.g. example.com"
                    value={domainName}
                    onChange={(e) => setDomainName(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Logo Options
                  </label>
                  <select className="cdb-select" value={logoOption} onChange={(e) => setLogoOption(e.target.value)}>
                    <option value="">Select logo options...</option>
                    <option value="Have Logo">Have Logo</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Business Name
                  </label>
                  <input
                    type="text"
                    className="cdb-input"
                    placeholder="e.g. CV Sales & Marketing"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Booking Link
                  </label>
                  <input
                    type="text"
                    className="cdb-input"
                    placeholder="e.g. https://..."
                    value={bookingLink}
                    onChange={(e) => setBookingLink(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Payment Link
                  </label>
                  <input
                    type="text"
                    className="cdb-input"
                    placeholder="e.g. https://razorpay.me/.."
                    value={paymentLink}
                    onChange={(e) => setPaymentLink(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Business Category
                  </label>
                  <input
                    type="text"
                    className="cdb-input"
                    placeholder="e.g. Restaurant, Clothing Store"
                    value={businessCategory}
                    onChange={(e) => setBusinessCategory(e.target.value)}
                  />
                  <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                    Will display as: Best [category] in [area], [city] [state] India
                  </span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Business Tagline
                </label>
                <textarea
                  className="cdb-textarea"
                  rows={2}
                  placeholder="e.g. Best IT Services in Navi Mumbai, Maharashtra"
                  value={businessTagline}
                  onChange={(e) => setBusinessTagline(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Main Services / Products
                </label>
                <div className="cdb-service-entry">
                  <div className="cdb-service-input-wrap">
                    <input
                      type="text"
                      className="cdb-input"
                      placeholder="Enter services separated by commas"
                      value={servicesInput}
                      maxLength={100}
                      autoComplete="off"
                      onFocus={() => setServiceSuggestionsOpen(true)}
                      onBlur={() => window.setTimeout(() => setServiceSuggestionsOpen(false), 120)}
                      onChange={(e) => {
                        setServicesInput(e.target.value)
                        setServiceSuggestionsOpen(true)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          handleAddService()
                        }
                      }}
                    />
                    {serviceSuggestionsOpen && serviceSuggestions.length > 0 && (
                      <div className="cdb-service-suggestions" role="listbox" aria-label="Service suggestions">
                        {serviceSuggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            role="option"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => addMainService(suggestion)}
                          >
                            <span>{suggestion}</span>
                            <span aria-hidden="true">+</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="cdb-btn-primary"
                    onClick={handleAddService}
                    style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
                  >
                    +
                  </button>
                </div>
                {mainServices.length > 0 && (
                  <div className="cdb-service-stack" aria-label="Added services and products">
                    {mainServices.map((service, index) => (
                      <span className="cdb-service-chip" key={`${service}-${index}`}>
                        {service}
                        <button
                          type="button"
                          onClick={() => removeMainService(index)}
                          aria-label={`Remove ${service}`}
                        >
                          <CloseIcon size={12} strokeWidth={2.5} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <span className="cdb-service-help">
                  {mainServices.length}/15 added. Press Enter or click + to add a custom service.
                </span>
              </div>

              {/* Contact Details Section */}
              <div style={{ borderLeft: '3px solid #2563eb', paddingLeft: '12px', marginTop: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Contact Details</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Owner / Contact Person Name
                  </label>
                  <input
                    type="text"
                    className="cdb-input"
                    placeholder="e.g. Rahul Sharma"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Phone / WhatsApp Number <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    className="cdb-input"
                    placeholder="e.g. 9827337896"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Email <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    className="cdb-input"
                    placeholder="e.g. info@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Full Address
                  </label>
                  <input
                    type="text"
                    className="cdb-input"
                    placeholder="Enter complete address"
                    value={fullAddress}
                    onChange={(e) => setFullAddress(e.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {/* STEP 2: Billing */}
          {isSharedForm || activeStep === 2 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px', alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ borderLeft: '3px solid #16a34a', paddingLeft: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Billing Information</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Used for your invoices and GST</p>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Billing Address *
                  </label>
                  <textarea
                    className="cdb-textarea"
                    rows={3}
                    value={billingAddress}
                    onChange={(e) => updateBillingAddress(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                    Max 1000 characters
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <input
                    type="checkbox"
                    id="noGst"
                    checked={noGstNumber}
                    onChange={(e) => setNoGstNumber(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="noGst" style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}>
                    I don't have a GST Number
                  </label>
                </div>

                {!noGstNumber ? (
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      GST Number
                    </label>
                    <input
                      type="text"
                      className="cdb-input"
                      placeholder="Enter 15 digit GST Number"
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value)}
                      maxLength={15}
                    />
                    <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                      {gstNumber.length}/15 characters
                    </span>
                  </div>
                ) : null}

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Payment Screenshot (optional)
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 16px',
                      background: '#eff6ff',
                      borderRadius: '8px',
                      border: '1px dashed #bfdbfe',
                    }}
                  >
                    <Icon name="link" size={16} />
                    <button type="button" className="cdb-btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }}>
                      Choose file
                    </button>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>No file chosen</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                    * Please fill Billing Address first to upload screenshot
                  </span>
                </div>
              </div>

              {/* Right Billing Graphic Box */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '24px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '180px',
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div style={{ background: '#16a34a', color: '#ffffff', padding: '10px', fontSize: '12px', fontWeight: 800, letterSpacing: '0.05em' }}>
                    INVOICE
                  </div>
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                      GST Ready
                    </span>
                    <div style={{ width: '80%', height: '6px', background: '#f1f5f9', borderRadius: '4px' }} />
                    <div style={{ width: '60%', height: '6px', background: '#f1f5f9', borderRadius: '4px' }} />
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#16a34a', border: '1px solid #16a34a', padding: '2px 8px', borderRadius: '50px', marginTop: '4px' }}>
                      PAID
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#94a3b8' }}>BILLING STEP</span>
              </div>
            </div>
          ) : null}

          {/* STEP 3: Website */}
          {isSharedForm || activeStep === 3 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px', alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ borderLeft: '3px solid #2563eb', paddingLeft: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Information related to website</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Optional — helps us build your site faster</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Domain Status
                    </label>
                    <select className="cdb-select" value={domainStatus} onChange={(e) => setDomainStatus(e.target.value)}>
                      <option value="">Select domain status...</option>
                      <option value="Already Have">Already Have Domain</option>
                      <option value="Need New">Need New Domain</option>
                      <option value="Website Not in Package">Website Not in Package</option>
                    </select>
                    {isWebsiteNotInPackage ? (
                      <small className="cdb-website-disabled-note">Website fields are disabled for this package.</small>
                    ) : null}
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Domain Name
                    </label>
                    <input
                      type="text"
                      className="cdb-input"
                      placeholder="e.g. example.com"
                      value={domainName}
                      onChange={(e) => setDomainName(e.target.value)}
                      disabled={isWebsiteNotInPackage}
                    />
                  </div>
                </div>

                <fieldset className="cdb-website-fields" disabled={isWebsiteNotInPackage}>
                  <div className="cdb-details-grid">
                    <label className="cdb-field"><span>Logo Options</span><select className="cdb-select" value={logoOption} onChange={(e) => setLogoOption(e.target.value)}><option value="">Select logo options...</option><option>I have a logo</option><option>Use business name</option></select></label>
                    {/* <label className="cdb-field"><span>Image Options</span><select className="cdb-select" value={imageOption} onChange={(e) => setImageOption(e.target.value)}><option value="">Select image options...</option><option>I'll provide images</option><option>Use stock images</option><option>Mixed</option></select></label> */}
                    <label className="cdb-field"><span>Business Name</span><input className="cdb-input" value={websiteBusinessName} onChange={(e) => updateWebsiteBusinessName(e.target.value)} placeholder="e.g. CV Sales & Marketing" /></label>
                    <label className="cdb-field"><span>Booking Link</span><input className="cdb-input" value={bookingLink} onChange={(e) => setBookingLink(e.target.value)} placeholder="e.g. https://..." /></label>
                    <label className="cdb-field"><span>Payment Link</span><input className="cdb-input" value={paymentLink} onChange={(e) => setPaymentLink(e.target.value)} placeholder="e.g. https://razorpay.me/..." /></label>
                    <label className="cdb-field"><span>Business Category</span><input className="cdb-input" value={websiteCategory} onChange={(e) => updateWebsiteCategory(e.target.value)} placeholder="e.g. Restaurant, Clothing Store" /><small>Will display as: Best [category] in [area], [city] [state] India</small></label>
                    <label className="cdb-field cdb-field-wide"><span>Business Tagline</span><textarea className="cdb-textarea" rows={2} value={businessTagline} onChange={(e) => setBusinessTagline(e.target.value)} placeholder="e.g. Best IT Services in Navi Mumbai, Maharashtra" /><small>Auto-generated: Best [category] in [area], [city], [state], India</small></label>
                    <div className="cdb-field cdb-field-wide">
                      <span>Main Services / Products</span>
                      <div className="cdb-service-entry">
                        <div className="cdb-service-input-wrap">
                          <input className="cdb-input" value={servicesInput} onFocus={() => setServiceSuggestionsOpen(true)} onBlur={() => window.setTimeout(() => setServiceSuggestionsOpen(false), 120)} onChange={(e) => { setServicesInput(e.target.value); setServiceSuggestionsOpen(true) }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddService() } }} placeholder="Paste comma-separated services and press Enter" />
                          {serviceSuggestionsOpen && serviceSuggestions.length > 0 ? <div className="cdb-service-suggestions">{serviceSuggestions.map((suggestion) => <button key={suggestion} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => addMainService(suggestion)}><span>{suggestion}</span><span>+</span></button>)}</div> : null}
                        </div>
                        <button type="button" className="cdb-btn-primary" onClick={handleAddService}>+</button>
                      </div>
                      <div className="cdb-service-list-header"><small>Separate with commas, then press Enter or +.</small>{mainServices.length > 0 ? <button type="button" className="cdb-copy-all" onClick={() => copyServicesToClipboard(mainServices, true, 'main-all')}><Icon name="copy" size={13} /> {copiedServiceKey === 'main-all' ? 'Text Copied' : 'Copy All'}</button> : null}</div>
                      <div className="cdb-service-stack">{mainServices.map((service, index) => <span className="cdb-service-chip" key={`${service}-${index}`}><span>{service}</span><button type="button" title={`Copy ${service}`} aria-label={`Copy ${service}`} onClick={() => copyServicesToClipboard([service], false, `main-${index}`)}><Icon name="copy" size={11} /></button>{copiedServiceKey === `main-${index}` ? <span className="cdb-copy-feedback">Text Copied</span> : null}<button type="button" title={`Remove ${service}`} aria-label={`Remove ${service}`} onClick={() => removeMainService(index)}><CloseIcon size={12} /></button></span>)}</div>
                      <small>{mainServices.length}/15 added</small>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                    <div style={{ borderLeft: '3px solid #2563eb', paddingLeft: '12px', marginBottom: '16px' }}><h3 style={{ margin: 0, fontSize: '16px' }}>Contact Details</h3></div>
                    <div className="cdb-details-grid">
                      <label className="cdb-field"><span>Full Address</span><input className="cdb-input" value={websiteFullAddress} onChange={(e) => updateWebsiteFullAddress(e.target.value)} placeholder="e.g. 123, Main Street, Jabalpur" /></label>
                      <label className="cdb-field"><span>Email</span><input type="email" className="cdb-input" value={websiteContactEmail} onChange={(e) => setWebsiteContactEmail(e.target.value)} placeholder="e.g. info@company.com" /></label>
                      <label className="cdb-field"><span>Map Link</span><input className="cdb-input" value={mapLink} onChange={(e) => updateMapLink(e.target.value)} placeholder="Google maps link" /></label>
                      <div className="cdb-field"><span>Social Links</span><div className="cdb-service-entry"><input className="cdb-input" value={socialLinkInput} onChange={(e) => setSocialLinkInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSocialLink() } }} placeholder="https://instagram.com/your-handle" /><button type="button" className="cdb-btn-primary" onClick={addSocialLink}>+</button></div><div className="cdb-service-stack">{socialLinks.map((link, index) => <span className="cdb-service-chip" key={`${link}-${index}`}>{link}<button type="button" onClick={() => setSocialLinks((items) => items.filter((_, i) => i !== index))}><CloseIcon size={12} /></button></span>)}</div></div>
                      <div className="cdb-field cdb-field-wide"><WorkingHoursEditor value={websiteWorkingHours} onChange={setWebsiteWorkingHours} /></div>
                    </div>
                  </div>
                </fieldset>
              </div>

              {/* Website Graphic Box */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '24px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '180px',
                    background: '#2563eb',
                    borderRadius: '12px',
                    color: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '16px',
                  }}
                >
                  <Icon name="grid" size={36} />
                  <span style={{ fontSize: '13px', fontWeight: 700, marginTop: '8px' }}>yourdomain.com</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#94a3b8' }}>WEBSITE STEP</span>
              </div>
            </div>
          ) : null}

          {/* STEP 4: GOOGLE STEP (EXACT MATCH FOR SCREENSHOT 1) */}
          {isSharedForm || activeStep === 4 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px', alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ borderLeft: '3px solid #2563eb', paddingLeft: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Google Information</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Your Google Business Profile details</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      GMB Profile Link
                    </label>
                    <input
                      type="text"
                      className="cdb-input"
                      placeholder="https://g.page/YourBusinessName"
                      value={gmbProfileLink}
                      onChange={(e) => updateGmbProfileLink(e.target.value)}
                      disabled={noGmbLink}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                      <input
                        type="checkbox"
                        id="noGmbLink"
                        checked={noGmbLink}
                        onChange={(e) => setNoGmbLink(e.target.checked)}
                        style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                      />
                      <label htmlFor="noGmbLink" style={{ fontSize: '12px', color: '#475569', cursor: 'pointer' }}>
                        Don't have link
                      </label>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Brand Name
                    </label>
                    <input
                      type="text"
                      className="cdb-input"
                      placeholder="As per Google profile (e.g. CV Salon)"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Business Category *
                    </label>
                    <input
                      type="text"
                      className="cdb-input"
                      placeholder="Exact category. Area, Location, City, state"
                      value={googleBusinessCategory}
                      onChange={(e) => updateGoogleBusinessCategory(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Google Review Link
                    </label>
                    <input
                      type="text"
                      className="cdb-input"
                      placeholder="https://g.page/r/..."
                      value={googleReviewLink}
                      onChange={(e) => setGoogleReviewLink(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Appointment Link
                    </label>
                    <input
                      type="text"
                      className="cdb-input"
                      placeholder="e.g. https://calendly.com/..."
                      value={appointmentLink}
                      onChange={(e) => setAppointmentLink(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Right Graphic Box: Google Business Graphic */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '24px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '210px',
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div style={{ display: 'flex', height: '6px' }}>
                    <div style={{ flex: 1, background: '#4285F4' }} />
                    <div style={{ flex: 1, background: '#EA4335' }} />
                    <div style={{ flex: 1, background: '#FBBC05' }} />
                    <div style={{ flex: 1, background: '#34A853' }} />
                  </div>
                  <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div style={{ width: '100%', height: '70px', background: '#dcfce7', borderRadius: '8px', display: 'grid', placeItems: 'center' }}>
                      <span style={{ fontSize: '18px', color: '#16a34a' }}>📍</span>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                      ★★★★★ <span style={{ color: '#2563eb' }}>4.9 (218)</span>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#ffffff', background: '#2563eb', padding: '4px 12px', borderRadius: '999px' }}>
                      Google Business
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#94a3b8' }}>GOOGLE STEP</span>
              </div>
            </div>
          ) : null}

          {/* STEP 5: AUTOMATION STEP (EXACT MATCH FOR SCREENSHOTS 2, 3, 4) */}
          {isSharedForm || activeStep === 5 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px', alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ borderLeft: '3px solid #2563eb', paddingLeft: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Automation Details</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Information related to WhatsApp Automation</p>
                </div>

                {/* 1. Business Name & Category */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Business Name
                    </label>
                    <input
                      type="text"
                      className="cdb-input"
                      value={automationBusinessName}
                      onChange={(e) => setAutomationBusinessName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Business Category
                    </label>
                    <input
                      type="text"
                      className="cdb-input"
                      placeholder="e.g. Restaurant, Clothing Store"
                      value={automationCategory}
                      onChange={(e) => setAutomationCategory(e.target.value)}
                    />
                    <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                      Will display as: Best [category] in [area], [city] [state] India
                    </span>
                  </div>
                </div>

                {/* 2. Main Goal */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Main Goal
                  </label>
                  <select className="cdb-select" value={mainGoal} onChange={(e) => setMainGoal(e.target.value)}>
                    <option value="">Select main goal...</option>
                    <option value="Lead Generation">Lead Generation</option>
                    <option value="Customer Support">Customer Support</option>
                    <option value="Sales">Sales & Marketing</option>
                  </select>
                </div>

                {/* 3. + Offers Configuration Panel */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb' }}>+ Offers Configuration</span>
                    <button
                      type="button"
                      className="cdb-btn-secondary"
                      onClick={handleAddOffer}
                      style={{ fontSize: '12px', padding: '4px 10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
                    >
                      + Add Offer
                    </button>
                  </div>

                  {offers.map((off, idx) => (
                    <div key={off.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      {offers.length > 1 ? (
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Offer #{idx + 1}</span>
                      ) : null}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Offer Type</label>
                          <select className="cdb-select" value={off.offerType} onChange={(e) => handleUpdateOffer(off.id, 'offerType', e.target.value)}>
                            <option value="">Select offer type...</option>
                            <option value="Discount">Discount</option>
                            <option value="Free Trial">Free Trial</option>
                            <option value="Buy 1 Get 1">Buy 1 Get 1</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Discount / Value</label>
                          <input type="text" className="cdb-input" placeholder="e.g. 20% or Free" value={off.discountValue} onChange={(e) => handleUpdateOffer(off.id, 'discountValue', e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Offer Description / Conditions</label>
                        <input type="text" className="cdb-input" placeholder="Describe the offer details..." value={off.description} onChange={(e) => handleUpdateOffer(off.id, 'description', e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* 4. Location Details (Area, Address, State, City) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Area</label>
                    <input type="text" className="cdb-input" placeholder="Dhanwantri chowk, Deen Dayal, etc." value={area} onChange={(e) => setArea(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Full Address</label>
                    <input type="text" className="cdb-input" value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>State</label>
                    <select className="cdb-select" value={stateName} onChange={(e) => { const nextState = e.target.value; setStateName(nextState); if (!getCitiesForState(nextState).includes(cityName)) setCityName('') }}>
                      <option value="">Select state...</option>
                      {INDIAN_STATES.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>City</label>
                    <select className="cdb-select" value={cityName} disabled={!stateName} onChange={(e) => setCityName(e.target.value)}>
                      <option value="">{stateName ? 'Select city...' : 'Select state first...'}</option>
                      {automationCityOptions.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </div>
                </div>

                {/* 5. Google Map & Website Links */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Google Map Link</label>
                    <input type="text" className="cdb-input" placeholder="Google business profile link" value={googleMapLink} onChange={(e) => setGoogleMapLink(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Website Link</label>
                    <input type="text" className="cdb-input" placeholder="Website link (if already having)" value={websiteLink} onChange={(e) => setWebsiteLink(e.target.value)} />
                  </div>
                </div>

                {/* 6. Services / Products List */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Services / Products List</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="cdb-input"
                      placeholder="Enter services separated by commas"
                      value={autoServicesInput}
                      onChange={(e) => setAutoServicesInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAutoService() } }}
                    />
                    <button type="button" className="cdb-btn-primary" onClick={handleAddAutoService} style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>+</button>
                  </div>
                  <div className="cdb-service-list-header"><span style={{ fontSize: '11px', color: '#94a3b8' }}>Separate with commas, then press Enter or +.</span>{autoServices.length > 0 ? <button type="button" className="cdb-copy-all" onClick={() => copyServicesToClipboard(autoServices, true, 'auto-all')}><Icon name="copy" size={13} /> {copiedServiceKey === 'auto-all' ? 'Text Copied' : 'Copy All'}</button> : null}</div>
                  {autoServices.length > 0 ? <div className="cdb-service-stack">{autoServices.map((service, index) => <span className="cdb-service-chip" key={`${service}-${index}`}><span>{service}</span><button type="button" title={`Copy ${service}`} aria-label={`Copy ${service}`} onClick={() => copyServicesToClipboard([service], false, `auto-${index}`)}><Icon name="copy" size={11} /></button>{copiedServiceKey === `auto-${index}` ? <span className="cdb-copy-feedback">Text Copied</span> : null}<button type="button" title={`Remove ${service}`} aria-label={`Remove ${service}`} onClick={() => setAutoServices((items) => items.filter((_, i) => i !== index))}><CloseIcon size={12} /></button></span>)}</div> : null}
                  <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>{autoServices.length}/15 added</span>
                </div>

                {/* 7. AI Chatbot Configuration (Purple Card Box) */}
                <div style={{ background: '#f5f3ff', border: '1px solid #e9d5ff', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#ede9fe', color: '#7c3aed', display: 'grid', placeItems: 'center' }}>
                      <Icon name="flow" size={16} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#5b21b6' }}>AI Chatbot Configuration</h4>
                      <p style={{ margin: 0, fontSize: '11.5px', color: '#7c3aed' }}>Configure AI chatbot email and link for customer support</p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#5b21b6', display: 'block', marginBottom: '4px' }}>AI Chatbot Email *</label>
                      <input type="email" className="cdb-input" placeholder="chatbot@company.com" value={aiChatbotEmail} onChange={(e) => setAiChatbotEmail(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#5b21b6', display: 'block', marginBottom: '4px' }}>AI Chatbot Link *</label>
                      <input type="text" className="cdb-input" placeholder="https://chatbot.company.com" value={aiChatbotLink} onChange={(e) => setAiChatbotLink(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Graphic Box: WhatsApp Graphic Box */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '24px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    width: '130px',
                    height: '210px',
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '2px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '12px',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  }}
                >
                  <div style={{ width: '30px', height: '4px', background: '#cbd5e1', borderRadius: '2px' }} />
                  <div style={{ width: '100%', padding: '6px', background: '#4f46e5', color: '#fff', borderRadius: '6px', fontSize: '9px', fontWeight: 700, textAlign: 'center' }}>
                    WhatsApp
                  </div>
                  <div style={{ width: '100%', height: '40px', background: '#f1f5f9', borderRadius: '6px' }} />
                  <div style={{ width: '100%', padding: '4px', background: '#7c3aed', color: '#fff', borderRadius: '4px', fontSize: '8px', fontWeight: 700, textAlign: 'center' }}>
                    Auto Reply
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#94a3b8' }}>AUTOMATION STEP</span>
              </div>
            </div>
          ) : null}

          </div>

          {isSharedForm || activeStep === 5 ? (
            <div className="cdb-form-notes">
              {isSharedForm ? <div className="cdb-client-remark">
                <label htmlFor="customer-client-remark">Client Remark</label>
                <textarea
                  id="customer-client-remark"
                  className="cdb-textarea"
                  rows={4}
                  value={clientRemark}
                  onChange={(event) => setClientRemark(event.target.value)}
                  placeholder="Enter any client remarks..."
                  maxLength={2000}
                />
                <small>{clientRemark.length}/2000</small>
              </div> : null}
              <div className="cdb-client-remark">
                <label htmlFor="customer-additional-information">Additional Information</label>
                <textarea
                  id="customer-additional-information"
                  className="cdb-textarea"
                  rows={5}
                  value={additionalInformation}
                  onChange={(event) => setAdditionalInformation(event.target.value)}
                  placeholder="Enter any other information about the customer or business..."
                  maxLength={5000}
                />
                <small>{additionalInformation.length}/5000</small>
              </div>
            </div>
          ) : null}

          {isSharedForm ? (
            <div className="cdb-shared-form-actions">
              <button type="button" className="cdb-shared-form-save" disabled={isSaving} onClick={() => void handleNextStep()}>
                {isSaving ? <><Loader2 size={17} className="cdb-spin" /> Saving details...</> : <><span>Save Changes</span><CheckCircle2 size={17} /></>}
              </button>
            </div>
          ) : null}

          {/* STEP 6: Done (Completed Page) */}
          {!isSharedForm && activeStep === 6 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px', padding: '20px 0' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'grid', placeItems: 'center' }}>
                <Icon name="check" size={32} strokeWidth={3} />
              </div>

              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Onboarding Completed!</h2>
              <p style={{ fontSize: '13.5px', color: '#475569', maxWidth: '500px', margin: 0, textAlign: 'center' }}>
                Thank you for filling your information — your onboarding is successfully completed. Approve this onboarding via email too!
              </p>

              {missingRecommendedFields.length > 0 ? (
                <div style={{ background: '#fef3c7', border: '1px solid #fde047', borderRadius: '12px', padding: '16px 20px', width: '100%', maxWidth: '550px', display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icon name="alert" size={16} /> Missing recommended information
                  </span>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12.5px', color: '#78350f' }}>
                    {missingRecommendedFields.map((field) => <li key={field}>{field}</li>)}
                  </ul>
                  <span style={{ fontSize: '11.5px', color: '#92400e', fontStyle: 'italic', marginTop: '4px' }}>
                    Note: providing these details later will help us serve you better.
                  </span>
                </div>
              ) : null}

              {/* Registered Contact box */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 20px', fontSize: '13px', color: '#475569' }}>
                Registered contact details &mdash; <strong>Phone: {phone || '—'}</strong> &nbsp;|&nbsp; <strong>Email: {email || '—'}</strong>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="cdb-btn-secondary" onClick={() => setActiveStep(1)}>
                  Fill the form again
                </button>
                {/* Opened from an emailed link the customer is usually not logged in: send them to sign in
                    (login lands customers on /customers) instead of a dashboard that cannot load. */}
                <button
                  type="button"
                  className="cdb-btn-primary"
                  onClick={() => navigate({ to: session ? '/customers' : '/login' })}
                >
                  {session ? 'Go to dashboard' : 'Sign in to your dashboard'}
                </button>
              </div>
            </div>
          ) : null}

          {/* Stepper Footer Controls (For Steps 1-5) */}
          {!isSharedForm && activeStep <= 5 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '20px', marginTop: '20px', borderTop: '1px solid #e2e8f0' }}>
              <div>
                {activeStep > 1 ? (
                  <button type="button" className="cdb-btn-secondary" onClick={handlePrevStep}>
                    &larr; Back
                  </button>
                ) : (
                  <span />
                )}
              </div>

              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                Step {activeStep} of 5
              </span>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleNextStep}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 22px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '14px',
                  background: activeStep === 5
                    ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                    : 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                  color: '#ffffff',
                  border: 'none',
                  boxShadow: activeStep === 5
                    ? '0 4px 14px rgba(16, 185, 129, 0.3)'
                    : '0 4px 14px rgba(37, 99, 235, 0.3)',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.75 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                {isSaving ? (
                  <>
                    <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                    <span>Saving details...</span>
                  </>
                ) : activeStep === 5 ? (
                  <>
                    <span>Save &amp; Complete Profile</span>
                    <CheckCircle2 style={{ width: '16px', height: '16px' }} />
                  </>
                ) : (
                  <>
                    <span>Save &amp; next</span>
                    <ArrowRight style={{ width: '15px', height: '15px' }} />
                  </>
                )}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {showCompletionConfirm ? (
        <div className="cdb-completion-modal-backdrop" role="presentation">
          <div className="cdb-completion-modal" role="dialog" aria-modal="true" aria-labelledby="completion-confirm-title">
            <button
              type="button"
              className="cdb-completion-modal-close"
              onClick={() => setShowCompletionConfirm(false)}
              aria-label="Close confirmation"
            >
              <CloseIcon size={18} />
            </button>

            <div className="cdb-completion-modal-title" id="completion-confirm-title">
              <AlertCircle size={25} />
              <span>Important Information Missing</span>
            </div>
            <p className="cdb-completion-modal-description">
              The following fields are highly recommended for better service and results. While they are not mandatory to save, having them filled now will help us process your request faster.
            </p>

            <div className="cdb-completion-missing-heading">
              <Icon name="copy" size={16} /> Missing Recommended Fields:
            </div>
            <div className="cdb-completion-missing-list">
              <ul>
                {missingRecommendedFields.map((field) => <li key={field}>{field}</li>)}
              </ul>
            </div>

            <label className="cdb-completion-acknowledgement">
              <input
                type="checkbox"
                checked={completionAcknowledged}
                onChange={(event) => setCompletionAcknowledged(event.target.checked)}
              />
              <span>I understand that these fields are important and I agree to provide this data later if not now. I wish to proceed with saving.</span>
            </label>

            <div className="cdb-completion-modal-actions">
              <button type="button" className="cdb-btn-secondary" onClick={() => setShowCompletionConfirm(false)}>
                Go Back &amp; Fill
              </button>
              <button
                type="button"
                className="cdb-completion-save-anyway"
                disabled={!completionAcknowledged || isSaving}
                onClick={() => void handleNextStep(undefined, true)}
              >
                {isSaving ? 'Saving...' : 'Save Anyway'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </CustomerDashboardLayout>
  )
}
