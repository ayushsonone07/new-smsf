import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Check, Clock3, LoaderCircle } from 'lucide-react'
import { apiRequest } from '../../../api/client'
import { getCustomerSession } from '../hooks/useCustomerSession'
import './OnboardingConfirmationPage.css'

type ConfirmationState = 'loading' | 'verifying' | 'success' | 'failure' | 'error'

interface ConfirmationPayload {
  token?: string
  email?: string
  contact?: string
  businessName?: string
  departmentType?: string
  username?: string
  phaseName?: string
  subService?: string
  serviceName?: string
  isDuplicate?: boolean | string
  domainConnect?: boolean | string
  themeSelection?: boolean | string
}

interface ConfirmationResponse {
  success?: boolean
  message?: string
  data?: { businessName?: string; serviceName?: string; confirmedAt?: string }
}

const booleanValue = (value: boolean | string | undefined) =>
  typeof value === 'string' ? value === 'true' : Boolean(value)

function decodePayload(encoded: string, routeType: 'department' | 'website' | 'onboarding'): ConfirmationPayload {
  const secret = routeType === 'website'
    ? import.meta.env.VITE_WEBSITE_CONFIRMATION_SECRET || 'mbg_website_confirmation'
    : routeType === 'department'
    ? import.meta.env.VITE_DEPARTMENT_CONFIRMATION_SECRET || 'mbg_department_confirmation'
    : import.meta.env.VITE_ONBOARDING_CONFIRMATION_SECRET || 'mbg_onboarding_confirmation'
  const decoded = atob(encoded.replace(/ /g, '+'))
  const encrypted = Uint8Array.from(decoded, (character) => character.charCodeAt(0))
  const key = new TextEncoder().encode(secret)
  const decrypted = encrypted.map((value, index) => value ^ key[index % key.length])
  return JSON.parse(new TextDecoder().decode(decrypted)) as ConfirmationPayload
}

export function OnboardingConfirmationPage() {
  const isWebsite = window.location.pathname.endsWith('/website')
  const isDepartment = isWebsite || window.location.pathname.endsWith('/department')
  const routeType: 'department' | 'website' | 'onboarding' = isWebsite ? 'website' : window.location.pathname.endsWith('/department') ? 'department' : 'onboarding'
  const startedRef = useRef(false)
  const [state, setState] = useState<ConfirmationState>('loading')
  const [message, setMessage] = useState('')
  const [businessName, setBusinessName] = useState('Your business')
  const [serviceName, setServiceName] = useState<string>(isDepartment ? 'Service' : 'Onboarding Service')
  const [confirmedAt, setConfirmedAt] = useState('')
  const [payload, setPayload] = useState<ConfirmationPayload | null>(null)

  const confirm = useCallback(async (details: ConfirmationPayload) => {
    const customerSession = getCustomerSession()
    const token = details.token || customerSession?.accessToken
    const email = details.email || customerSession?.email
    const contact = details.contact

    const currentService =
      details.phaseName ||
      details.subService ||
      details.serviceName ||
      (isWebsite
        ? 'Website Creation'
        : isDepartment
        ? details.departmentType
          ? details.departmentType.replace(/_DEPARTMENT$/, '').replace(/_/g, ' ')
          : 'Service'
        : 'Onboarding Service')

    setServiceName(currentService)

    if (!email || !contact || !token) {
      setState('failure')
      setMessage('This confirmation link is invalid, incomplete, or has expired.')
      return
    }

    setState('verifying')
    try {
      const search = new URLSearchParams({
        email,
        contact,
        isDuplicate: String(booleanValue(details.isDuplicate)),
      })
      if (isDepartment) {
        if (!details.departmentType) {
          setState('failure')
          setMessage('The service department is missing from this confirmation link.')
          return
        }
        search.set('departmentType', details.departmentType)
        search.set('subService', details.phaseName || details.subService || 'Default')
      } else {
        search.set('domainConnect', String(booleanValue(details.domainConnect)))
        search.set('themeSelection', String(booleanValue(details.themeSelection)))
      }
      const response = await apiRequest<ConfirmationResponse>(
        `/api/confirm/${isDepartment ? 'department' : 'Onboarding'}?${search.toString()}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            username: details.username || customerSession?.username || email,
          },
        },
      )
      if (response.success === false) throw new Error(response.message || 'Confirmation could not be completed.')
      setBusinessName(response.data?.businessName || details.businessName || customerSession?.company || 'Your business')
      setConfirmedAt(response.data?.confirmedAt || new Date().toISOString())
      if (response.data?.serviceName) setServiceName(response.data.serviceName)

      setMessage(
        response.message ||
          `Thank you! Your ${currentService.toLowerCase()} with MBG Card is confirmed. Our team will reach out with next steps.`,
      )
      rememberCompletedConfirmation()
      setState('success')
    } catch (error) {
      const text = error instanceof Error ? error.message : 'We could not reach the server. Please try again.'
      if (/already (used|updated|confirmed|completed)|status already updated/i.test(text)) {
        setBusinessName(details.businessName || customerSession?.company || 'Your business')
        setConfirmedAt(new Date().toISOString())
        setMessage(`Your ${currentService.toLowerCase()} acknowledgement has already been completed.`)
        rememberCompletedConfirmation()
        setState('success')
        return
      }
      setMessage(text)
      setState(/expired|already used|invalid/i.test(text) ? 'failure' : 'error')
    }
  }, [isDepartment, isWebsite])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    const params = new URLSearchParams(window.location.search)
    const encrypted = params.get('data')
    try {
      const details = encrypted
        ? decodePayload(encrypted, routeType)
        : {
            token: params.get('token') || undefined,
            email: params.get('email') || undefined,
            contact: params.get('contact') || undefined,
            businessName: params.get('businessName') || undefined,
            departmentType: params.get('departmentType') || undefined,
            username: params.get('username') || undefined,
            phaseName: params.get('phaseName') || params.get('subService') || params.get('serviceName') || undefined,
            subService: params.get('subService') || params.get('phaseName') || undefined,
            serviceName: params.get('serviceName') || params.get('subService') || params.get('phaseName') || undefined,
            isDuplicate: params.get('isDuplicate') || undefined,
            domainConnect: params.get('domainConnect') || undefined,
            themeSelection: params.get('themeSelection') || undefined,
          }

      const initialService =
        details.phaseName ||
        details.subService ||
        details.serviceName ||
        (isWebsite
          ? 'Website Creation'
          : isDepartment
          ? details.departmentType
            ? details.departmentType.replace(/_DEPARTMENT$/, '').replace(/_/g, ' ')
            : 'Service'
          : 'Onboarding Service')

      setServiceName(initialService)
      if (details.businessName) setBusinessName(details.businessName)
      setPayload(details)
      window.setTimeout(() => void confirm(details), 350)
    } catch {
      setMessage('This confirmation link is invalid, corrupted, or has expired.')
      setState('failure')
    }
  }, [confirm, isDepartment, isWebsite, routeType])

  const content = confirmationContent(state, message, serviceName)
  const StateIcon = state === 'success' ? Check : state === 'failure' ? Clock3 : state === 'error' ? AlertTriangle : LoaderCircle

  return (
    <main className="onboarding-confirmation">
      <div className="onboarding-confirmation__backdrop">
        <AnimatePresence mode="wait">
          <motion.section
            key={state}
            className={`onboarding-confirmation__card is-${state}`}
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            {/* MBG Logo */}
            <div className="onboarding-confirmation__brand">
              <span>M<strong style={{ color: '#ffc629', fontWeight: 700 }}>B</strong>G</span>
              <strong>MBG Card</strong>
            </div>

            {/* Icon Tile */}
            <motion.div
              className="onboarding-confirmation__icon"
              animate={state === 'loading' || state === 'verifying' ? { rotate: 360 } : { scale: [0.75, 1.08, 1] }}
              transition={state === 'loading' || state === 'verifying' ? { repeat: Infinity, duration: 0.85, ease: 'linear' } : { duration: 0.4 }}
            >
              <StateIcon size={34} strokeWidth={2.4} />
            </motion.div>

            {/* Title & Body */}
            <h1>{content.title}</h1>
            <p>{content.body}</p>

            {/* Success Summary DL */}
            {state === 'success' ? (
              <motion.div
                className="onboarding-confirmation__summary"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <span>Business</span>
                <strong>{businessName}</strong>
                <span>Service</span>
                <strong>{serviceName}</strong>
                <span>Confirmed</span>
                <strong>
                  {confirmedAt
                    ? new Date(confirmedAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })
                    : 'Just now'}
                </strong>
              </motion.div>
            ) : null}

            {/* Error Retry */}
            {state === 'error' && payload ? (
              <button
                type="button"
                className="onboarding-confirmation__retry"
                onClick={() => void confirm(payload)}
              >
                Try again
              </button>
            ) : null}

            <button
              type="button"
              className="onboarding-confirmation__back"
              onClick={() => window.location.assign('/customers')}
            >
              Back to customer dashboard
            </button>
          </motion.section>
        </AnimatePresence>
      </div>
    </main>
  )
}

function confirmationContent(state: ConfirmationState, message: string, serviceName: string) {
  const svc = serviceName || 'Onboarding Service'
  const svcLower = svc.toLowerCase()

  if (state === 'loading') {
    return {
      title: 'Loading…',
      body: 'Opening your confirmation link.',
    }
  }
  if (state === 'verifying') {
    return {
      title: 'Verifying your link',
      body: `Checking the secure token for ${svc} — this takes a moment.`,
    }
  }
  if (state === 'success') {
    return {
      title: `${svc} confirmed!`,
      body:
        message ||
        `Thank you! Your ${svcLower} with MBG Card is confirmed. Our team will reach out with next steps.`,
    }
  }
  if (state === 'failure') {
    return {
      title: 'Link expired or already used',
      body:
        message ||
        `This confirmation link is no longer valid. Ask your onboarding executive for a new one.`,
    }
  }
  return {
    title: 'Something went wrong',
    body:
      message ||
      'We could not reach the server. Check your connection and try again.',
  }
}

function rememberCompletedConfirmation() {
  const activeLink = sessionStorage.getItem('smsf.active-confirmation-link')
  if (!activeLink) return
  try {
    const current = JSON.parse(
      localStorage.getItem('smsf.completed-confirmation-links') || '[]',
    ) as unknown
    const links = Array.isArray(current)
      ? current.filter((value): value is string => typeof value === 'string')
      : []
    localStorage.setItem(
      'smsf.completed-confirmation-links',
      JSON.stringify(Array.from(new Set([...links, activeLink])).slice(-100)),
    )
  } finally {
    sessionStorage.removeItem('smsf.active-confirmation-link')
  }
}
