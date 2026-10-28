import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '../shared/Icon'
import {
  getCustomerServiceFlow,
  updateServiceFlowStepStatus,
  updateCustomerSubServiceStatus,
  sendSubServiceConfirmationMail,
} from '../../../api/service-flow.api'
import {
  fetchCustomerServiceFlowDetail,
} from '../../../api/autowebsion.api'
import { normalizeDepartmentTypeName } from '../../../api/dynamic-permission.api'
import { resolveDeptFromPath } from '../../../features/departments/head/utils/routeUtils'
import { getSession } from '../../../app/auth/session'
import type { OnboardingCustomer } from './CustomersList'
import { recordCustomerActivity } from '../../../utils/customerActivity'
import { notifyServiceCompleted } from '../../../api/notification-factory'
import './ServiceFlowModal.css'

export interface Phase1Step {
  stepName: string
  order: number
  status: string
  createdAt?: string
  updatedAt?: string
}

export interface SubServiceFlowData {
  name: string
  steps: Phase1Step[]
  overallStatus?: string
}

export interface ServiceFlowModalProps {
  customer: OnboardingCustomer | null
  isOpen: boolean
  onClose: () => void
  isEditable?: boolean
  onStepsUpdated?: (updatedSteps: Phase1Step[], subServiceName?: string) => void
  onSubServiceStatusUpdated?: (newStatus: string, subServiceName?: string) => void
  departmentType?: string
  serviceType?: string
  initialSubServiceName?: string
}

/**
 * Robust department key matcher to reliably associate JSON department keys
 * (e.g. 'GOOGLE_DEPARTMENT', 'ADVERTISEMENT_DEPARTMENT', 'AUTOWEBSION_DEPARTMENT')
 * with UI target departments, including abbreviations and aliases.
 */
export function matchesDepartmentKey(deptKey: string, targetDept: string): boolean {
  if (!deptKey || !targetDept) return false
  const cleanKey = deptKey.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  const cleanTarget = targetDept.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (cleanKey === cleanTarget) return true

  const normKey = normalizeDepartmentTypeName(deptKey).toUpperCase().replace(/[^A-Z0-9]/g, '')
  const normTarget = normalizeDepartmentTypeName(targetDept).toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (normKey === normTarget) return true

  // Handle Ads aliases
  const isKeyAds = cleanKey.includes('ADVERTIS') || cleanKey.includes('ADS')
  const isTargetAds = cleanTarget.includes('ADVERTIS') || cleanTarget.includes('ADS')
  if (isKeyAds && isTargetAds) return true

  // Handle Website / Automation / Autowebsion aliases
  const isKeyWeb =
    cleanKey.includes('AUTOWEB') || cleanKey.includes('WEBSITE') || cleanKey.includes('AUTOMATION')
  const isTargetWeb =
    cleanTarget.includes('AUTOWEB') || cleanTarget.includes('WEBSITE') || cleanTarget.includes('AUTOMATION')
  if (isKeyWeb && isTargetWeb) return true

  // Handle Google
  const isKeyGoogle = cleanKey.includes('GOOGLE')
  const isTargetGoogle = cleanTarget.includes('GOOGLE')
  if (isKeyGoogle && isTargetGoogle) return true

  // Handle SMO / Creative Department
  const isKeySmo = cleanKey.includes('SMO') || cleanKey.includes('CREATIVE')
  const isTargetSmo = cleanTarget.includes('SMO') || cleanTarget.includes('CREATIVE')
  if (isKeySmo && isTargetSmo) return true

  // Handle SEO
  const isKeySeo = cleanKey.includes('SEO')
  const isTargetSeo = cleanTarget.includes('SEO')
  if (isKeySeo && isTargetSeo) return true

  // Handle Onboarding
  const isKeyOnboarding = cleanKey.includes('ONBOARDING')
  const isTargetOnboarding = cleanTarget.includes('ONBOARDING')
  if (isKeyOnboarding && isTargetOnboarding) return true

  // Strip _DEPARTMENT suffix and compare
  const baseKey = normKey.replace(/DEPARTMENT$/, '')
  const baseTarget = normTarget.replace(/DEPARTMENT$/, '')
  if (baseKey && baseTarget && baseKey === baseTarget) return true

  return false
}

/**
 * Extracts sub-services and steps from customer serviceFlowJson strictly
 * filtered by the active department.
 */
export function extractDepartmentFlows(
  data: any,
  targetDepartment: string,
): {
  subServices: SubServiceFlowData[]
  overallStatus?: string
} {
  if (!data) return { subServices: [] }

  // 0. Autowebision Direct SubServiceInfo / ServiceFlowJson Response support
  const resData = data?.data ?? data
  const autowebSubInfo: any[] = Array.isArray(resData?.subServiceInfo)
    ? resData.subServiceInfo
    : []
  const autowebFlowJson =
    resData?.serviceFlowJson &&
    typeof resData.serviceFlowJson === 'object' &&
    !Array.isArray(resData.serviceFlowJson)
      ? resData.serviceFlowJson
      : null

  if (autowebSubInfo.length > 0 || (autowebFlowJson && Object.keys(autowebFlowJson).length > 0)) {
    const rawOverall = resData?.status || resData?.overallStatus
    const autowebMap = new Map<string, { steps: Phase1Step[]; overallStatus?: string }>()

    const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, '')

    // Case-insensitive / normalized lookup in flow json
    const findStepsInFlowJson = (targetName: string): any => {
      if (!autowebFlowJson) return undefined
      if (autowebFlowJson[targetName]) return autowebFlowJson[targetName]
      const clean = norm(targetName)
      for (const [k, v] of Object.entries(autowebFlowJson)) {
        if (norm(k) === clean) return v
      }
      return undefined
    }

    // Process all entries from autowebFlowJson first so exact step definitions are preserved
    if (autowebFlowJson) {
      for (const [subName, sObj] of Object.entries(autowebFlowJson)) {
        if (!sObj || typeof sObj !== 'object') continue
        const steps: Phase1Step[] = []
        for (const [sName, sVal] of Object.entries(sObj as Record<string, any>)) {
          if (!sVal || typeof sVal !== 'object') continue
          steps.push({
            stepName: sName,
            order: Number(sVal?.order ?? 999),
            status: String(sVal?.status ?? 'PENDING'),
            createdAt: sVal?.createdAt,
            updatedAt: sVal?.updatedAt,
          })
        }
        steps.sort((a, b) => a.order - b.order)

        const subMatch = autowebSubInfo.find((sub: any) => {
          const name = String(sub?.name || (typeof sub === 'object' ? Object.keys(sub)[0] : sub) || '')
          return norm(name) === norm(subName)
        })
        const status = subMatch
          ? String(subMatch.status || (typeof subMatch === 'object' ? Object.values(subMatch)[0] : 'PENDING')).toUpperCase()
          : String(rawOverall || 'PENDING').toUpperCase()

        autowebMap.set(subName, {
          steps,
          overallStatus: status,
        })
      }
    }

    // Also include any sub-services in autowebSubInfo not already in autowebMap
    for (const sub of autowebSubInfo) {
      const subName = String(
        sub?.name || (typeof sub === 'object' ? Object.keys(sub)[0] : sub) || 'Sub-Service',
      ).trim()
      const existingKey = Array.from(autowebMap.keys()).find((k) => norm(k) === norm(subName))
      if (!existingKey) {
        const subStatus = String(
          sub?.status || (typeof sub === 'object' ? Object.values(sub)[0] : 'PENDING') || 'PENDING',
        ).toUpperCase()
        const flowStepsObj = findStepsInFlowJson(subName)
        const steps: Phase1Step[] = []
        if (flowStepsObj && typeof flowStepsObj === 'object') {
          for (const [sName, sVal] of Object.entries(flowStepsObj as Record<string, any>)) {
            if (!sVal || typeof sVal !== 'object') continue
            steps.push({
              stepName: sName,
              order: Number(sVal?.order ?? 999),
              status: String(sVal?.status ?? 'PENDING'),
              createdAt: sVal?.createdAt,
              updatedAt: sVal?.updatedAt,
            })
          }
        }
        if (steps.length === 0) {
          steps.push({
            stepName: subName,
            order: 1,
            status: subStatus,
            createdAt: resData?.createdAt,
            updatedAt: resData?.updatedAt,
          })
        } else {
          steps.sort((a, b) => a.order - b.order)
        }
        autowebMap.set(subName, {
          steps,
          overallStatus: subStatus,
        })
      }
    }

    if (autowebMap.size > 0) {
      const subServices: SubServiceFlowData[] = []
      for (const [name, val] of autowebMap.entries()) {
        subServices.push({
          name,
          steps: val.steps,
          overallStatus: val.overallStatus,
        })
      }
      return {
        subServices,
        overallStatus: rawOverall ? String(rawOverall).toUpperCase() : undefined,
      }
    }
  }

  // 1. Locate the serviceFlowJson array
  let flowArray: any[] = []
  if (Array.isArray(data)) {
    flowArray = data
  } else if (Array.isArray(data?.data?.serviceFlowJson)) {
    flowArray = data.data.serviceFlowJson
  } else if (Array.isArray(data?.serviceFlowJson)) {
    flowArray = data.serviceFlowJson
  } else if (Array.isArray(data?.data)) {
    flowArray = data.data
  } else if (typeof data === 'object') {
    flowArray = [data]
  }

  const subServicesMap = new Map<string, { steps: Phase1Step[]; overallStatus?: string }>()
  let deptOverallStatus: string | undefined

  // 2. Iterate each element in flowArray and find matching department
  for (const item of flowArray) {
    if (!item || typeof item !== 'object') continue

    for (const [key, val] of Object.entries(item)) {
      if (!val || typeof val !== 'object') continue

      if (matchesDepartmentKey(key, targetDepartment)) {
        const deptObj = val as Record<string, any>

        const isWebOrAutoTarget = targetDepartment.toUpperCase().includes("WEB") || targetDepartment.toUpperCase().includes("AUTO");
        for (const [subName, subVal] of Object.entries(deptObj)) {
          if (!subVal || typeof subVal !== 'object') continue

          const normSubName = subName.trim()
          if (
            normSubName.toUpperCase() === 'OVERALL STATUS' ||
            normSubName.toUpperCase() === 'OVERALL_STATUS'
          ) {
            const serviceStatus = (subVal as any)?.['Service Status'] || subVal
            if (serviceStatus?.status) {
              deptOverallStatus = String(serviceStatus.status)
            }
            continue
          }

          // Sub-service flow
          const steps: Phase1Step[] = []
          for (const [stepName, stepVal] of Object.entries(subVal as Record<string, any>)) {
            if (!stepVal || typeof stepVal !== 'object') continue
            const order = Number(stepVal?.order ?? 999)
            if (order < 0) continue // Skip non-flow status markers
            steps.push({
              stepName,
              order,
              status: String(stepVal?.status ?? 'PENDING'),
              createdAt: stepVal?.createdAt,
              updatedAt: stepVal?.updatedAt,
            })
          }

          if (steps.length > 0) {
            steps.sort((a, b) => a.order - b.order)
            const existing = subServicesMap.get(normSubName)
            if (existing) {
              const merged = [...existing.steps]
              for (const s of steps) {
                if (!merged.some((m) => m.stepName === s.stepName)) {
                  merged.push(s)
                }
              }
              merged.sort((a, b) => a.order - b.order)
              subServicesMap.set(normSubName, { steps: merged, overallStatus: deptOverallStatus })
            } else {
              subServicesMap.set(normSubName, { steps, overallStatus: deptOverallStatus })
            }
          }
        }
      }
    }
  }

  // Fallback: If not found under top-level key matching department,
  // check if data itself is directly the department object without outer wrapper
  if (subServicesMap.size === 0) {
    for (const item of flowArray) {
      if (!item || typeof item !== 'object') continue
      for (const [subName, subVal] of Object.entries(item)) {
        if (!subVal || typeof subVal !== 'object') continue
        const normSubName = subName.trim()
        if (
          normSubName.toUpperCase() === 'OVERALL STATUS' ||
          normSubName.toUpperCase() === 'OVERALL_STATUS'
        ) {
          continue
        }

        const isGoogleTarget = targetDepartment.toUpperCase().includes('GOOGLE')
        const isAdsTarget = targetDepartment.toUpperCase().includes('AD')
        const isTargetMatch =
          (isGoogleTarget && normSubName.toLowerCase().includes('phase')) ||
          (isAdsTarget && normSubName.toLowerCase().includes('ad'))

        if (isTargetMatch) {
          const steps = Object.entries(subVal as Record<string, any>)
            .map(([sName, sVal]: [string, any]) => ({
              stepName: sName,
              order: Number(sVal?.order ?? 999),
              status: String(sVal?.status ?? 'PENDING'),
              createdAt: sVal?.createdAt,
              updatedAt: sVal?.updatedAt,
            }))
            .filter((s) => s.order >= 0)
            .sort((a, b) => a.order - b.order)

          if (steps.length > 0) {
            subServicesMap.set(normSubName, { steps })
          }
        }
      }
    }
  }

  const subServices: SubServiceFlowData[] = []
  for (const [name, val] of subServicesMap.entries()) {
    subServices.push({
      name,
      steps: val.steps,
      overallStatus: val.overallStatus || deptOverallStatus,
    })
  }

  const isSmoTarget =
    targetDepartment.toUpperCase().includes('SMO') ||
    targetDepartment.toUpperCase().includes('CREATIVE')

  if (subServices.length === 0 && isSmoTarget) {
    subServices.push({
      name: 'Creative Department',
      steps: [
        {
          stepName: 'UGC Video Link',
          order: 1,
          status: 'PENDING',
          updatedAt: new Date().toISOString(),
        },
        {
          stepName: 'Festival Bundle Link',
          order: 2,
          status: 'PENDING',
          updatedAt: new Date().toISOString(),
        },
      ],
      overallStatus: deptOverallStatus || 'PENDING',
    })
  }

  return { subServices, overallStatus: deptOverallStatus }
}

/**
 * Backward compatibility helper for extracting steps.
 */
export function extractPhase1Steps(
  data: any,
  preferredSubService?: string,
  departmentType = 'GOOGLE_DEPARTMENT',
): Phase1Step[] {
  const { subServices } = extractDepartmentFlows(data, departmentType)
  if (subServices.length === 0) return []
  if (preferredSubService) {
    const match = subServices.find(
      (s) => s.name.trim().toLowerCase() === preferredSubService.trim().toLowerCase(),
    )
    if (match) return match.steps
  }
  return subServices[0]?.steps ?? []
}

export function ServiceFlowModal({
  customer,
  isOpen,
  onClose,
  isEditable = true,
  onStepsUpdated,
  onSubServiceStatusUpdated,
  departmentType = 'GOOGLE_DEPARTMENT',
  serviceType,
  initialSubServiceName,
}: ServiceFlowModalProps) {
  const [subServices, setSubServices] = useState<SubServiceFlowData[]>([])
  const [activeSubServiceIndex, setActiveSubServiceIndex] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Sub-service status
  const [subServiceStatus, setSubServiceStatus] = useState<string>('PENDING')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isSendingAck, setIsSendingAck] = useState(false)

  // Step confirmation dialog state
  const [confirmingStep, setConfirmingStep] = useState<{ step: Phase1Step; subServiceName: string } | null>(null)
  const [isCompletingStep, setIsCompletingStep] = useState(false)

  // Resolve the actual department strictly
  const effectiveDept = useMemo(() => {
    if (departmentType) return normalizeDepartmentTypeName(departmentType)
    if (typeof window !== 'undefined') {
      const fromPath = resolveDeptFromPath(window.location.pathname)
      if (fromPath) return normalizeDepartmentTypeName(fromPath)
      if (
        window.location.pathname.startsWith('/google-head') ||
        window.location.pathname.startsWith('/google-user') ||
        window.location.pathname.startsWith('/google')
      ) {
        return 'GOOGLE_DEPARTMENT'
      }
    }
    const session = getSession()
    if (session?.user.departmentType) {
      return normalizeDepartmentTypeName(session.user.departmentType)
    }
    return 'GOOGLE_DEPARTMENT'
  }, [departmentType])

  const isSmo = useMemo(() => {
    return (
      effectiveDept.includes('SMO') ||
      effectiveDept.includes('CREATIVE') ||
      (typeof window !== 'undefined' &&
        (window.location.pathname.toLowerCase().includes('smo') ||
          window.location.pathname.toLowerCase().includes('creative')))
    )
  }, [effectiveDept])

  const currentSubService = subServices[activeSubServiceIndex] || subServices[0] || null

  const subServiceName =
    currentSubService?.name ||
    initialSubServiceName ||
    (serviceType
      ? serviceType
      : isSmo
        ? 'Creative Department'
        : effectiveDept.includes('ADVERTIS') || effectiveDept.includes('ADS')
          ? 'ADS'
          : effectiveDept.includes('GOOGLE')
            ? 'Phase 1'
            : 'Service Flow')

  const steps = currentSubService?.steps || []

  // Fetch service flow steps when modal is open
  useEffect(() => {
    if (!isOpen || !customer) {
      setSubServices([])
      setActiveSubServiceIndex(0)
      setError(null)
      setMessage(null)
      setIsLoading(false)
      return
    }

    let isCancelled = false
    setIsLoading(true)
    setError(null)

    const isAutowebsion =
      effectiveDept.includes('AUTOWEB') ||
      effectiveDept.includes('WEBSITE') ||
      effectiveDept.includes('AUTOMATION') ||
      Boolean(serviceType)

    const targetServiceType =
      serviceType ||
      (effectiveDept.includes('AUTO') ? 'AUTOMATION' : 'WEBSITE')

    const fetchFlowPromise =
      isAutowebsion && customer.id
        ? fetchCustomerServiceFlowDetail(customer.id, targetServiceType)
        : getCustomerServiceFlow(customer.id)

    fetchFlowPromise
      .then((res) => {
        if (isCancelled) return
        const { subServices: extracted, overallStatus } = extractDepartmentFlows(res, effectiveDept)
        setSubServices(extracted)

        if (extracted.length > 0) {
          // If initialSubServiceName is provided or customer has subServiceInfo, match active index
          let foundIndex = 0
          const targetName = (
            initialSubServiceName ||
            (Array.isArray(customer.subServiceInfo) && customer.subServiceInfo[0]
              ? customer.subServiceInfo[0]?.name ||
                (typeof customer.subServiceInfo[0] === 'object'
                  ? Object.keys(customer.subServiceInfo[0])[0]
                  : customer.subServiceInfo[0])
              : '') ||
            ''
          ).trim().toLowerCase()

          if (targetName) {
            const idx = extracted.findIndex(
              (s) =>
                s.name.trim().toLowerCase() === targetName ||
                s.name.trim().toLowerCase().includes(targetName) ||
                targetName.includes(s.name.trim().toLowerCase()),
            )
            if (idx >= 0) foundIndex = idx
          }
          setActiveSubServiceIndex(foundIndex)

          // Initial status resolution
          const activeSub = extracted[foundIndex]
          let initialStatus = activeSub?.overallStatus || overallStatus || 'PENDING'
          if (!activeSub?.overallStatus && Array.isArray(customer.subServiceInfo) && customer.subServiceInfo.length > 0) {
            const match = customer.subServiceInfo.find((sub: any) => {
              const name = sub?.name || (typeof sub === 'object' ? Object.keys(sub)[0] : sub)
              return name === activeSub?.name
            })
            if (match) {
              initialStatus =
                match?.status ||
                (typeof match === 'object' ? Object.values(match)[0] : 'PENDING') ||
                initialStatus
            }
          } else if (!activeSub?.overallStatus && Array.isArray(customer.services) && customer.services.length > 0) {
            initialStatus = customer.services[0]?.status || initialStatus
          }
          setSubServiceStatus(String(initialStatus).toUpperCase().replace(/-/g, '_'))
        }
      })
      .catch((err: any) => {
        if (isCancelled) return
        console.error('Failed to load service flow:', err)
        setError(err?.message || 'Unable to load service flow details.')
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [isOpen, customer, effectiveDept, serviceType])

  // Sub-service tab switch handler
  const handleSelectSubService = (index: number) => {
    setActiveSubServiceIndex(index)
    setMessage(null)
    const targetSub = subServices[index]
    if (!targetSub || !customer) return
    let initialStatus = targetSub.overallStatus || 'PENDING'
    if (Array.isArray(customer.subServiceInfo) && customer.subServiceInfo.length > 0) {
      const match = customer.subServiceInfo.find((sub: any) => {
        const name = sub?.name || (typeof sub === 'object' ? Object.keys(sub)[0] : sub)
        return name === targetSub.name
      })
      if (match) {
        initialStatus =
          match?.status ||
          (typeof match === 'object' ? Object.values(match)[0] : 'PENDING') ||
          initialStatus
      }
    }
    setSubServiceStatus(String(initialStatus).toUpperCase().replace(/-/g, '_'))
  }

  // Determine if all steps are completed
  const allFlowsCompleted = useMemo(() => {
    if (subServices.length === 0) return false
    return subServices.every(
      (sub) => sub.steps.length > 0 && sub.steps.every((s) => s.status.toUpperCase() === 'COMPLETED'),
    )
  }, [subServices])

  // Confirm and complete a flow step
  async function handleConfirmStepCompletion() {
    if (!customer || !confirmingStep) return
    setIsCompletingStep(true)
    setMessage(null)

    const targetSubName = confirmingStep.subServiceName || subServiceName

    try {
      await updateServiceFlowStepStatus({
        customerId: customer.id,
        subServiceName: targetSubName,
        flowStepName: confirmingStep.step.stepName,
        status: 'COMPLETED',
      })
      notifyServiceCompleted(customer, confirmingStep.step.stepName, effectiveDept)

      const markCompleted = (steps: Phase1Step[]) =>
        steps.map((s) =>
          s.stepName === confirmingStep.step.stepName
            ? { ...s, status: 'COMPLETED', updatedAt: new Date().toISOString() }
            : s,
        )
      // Computed here, not inside the setState updater (React may run that later).
      const updatedSubSteps = markCompleted(
        subServices.find((sub) => sub.name === targetSubName)?.steps ?? [],
      )
      setSubServices((prev) =>
        prev.map((sub) => (sub.name === targetSubName ? { ...sub, steps: markCompleted(sub.steps) } : sub)),
      )

      onStepsUpdated?.(updatedSubSteps, targetSubName)
      setMessage({
        type: 'success',
        text: `"${confirmingStep.step.stepName}" has been marked as completed!`,
      })
      setConfirmingStep(null)
    } catch (err: any) {
      console.error('Failed to update step status:', err)
      setMessage({
        type: 'error',
        text: err?.message || 'Failed to complete flow step.',
      })
    } finally {
      setIsCompletingStep(false)
    }
  }

  // Handle changing the sub-service status via dropdown
  async function handleStatusDropdownChange(newStatus: string) {
    if (!customer) return
    setIsUpdatingStatus(true)
    setMessage(null)

    try {
      await updateCustomerSubServiceStatus({
        customerId: customer.id,
        departmentType: effectiveDept,
        subServiceName,
        newStatus,
      })
      if (newStatus.toUpperCase() === 'COMPLETED') {
        notifyServiceCompleted(customer, subServiceName, effectiveDept)
      }

      setSubServiceStatus(newStatus)
      onSubServiceStatusUpdated?.(newStatus, subServiceName)
      setMessage({
        type: 'success',
        text: `Sub-service status updated to ${newStatus.replace(/_/g, ' ')}!`,
      })
    } catch (err: any) {
      console.error('Failed to update sub-service status:', err)
      setMessage({
        type: 'error',
        text: err?.message || 'Failed to update sub-service status.',
      })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Handle sending acknowledgement email
  async function handleSendAcknowledgement() {
    if (!customer) return
    setIsSendingAck(true)
    setMessage(null)

    try {
      await sendSubServiceConfirmationMail({
        customerId: customer.id,
        subServiceName,
        departmentType: effectiveDept,
      })

      recordCustomerActivity({
        customerId: customer.id,
        contact: customer.phone,
        departmentType,
        kind: 'email-sent',
        detail: `Acknowledgement email sent for ${subServiceName}.`,
      })

      // After acknowledgement is sent, update sub-service status
      try {
        await updateCustomerSubServiceStatus({
          customerId: customer.id,
          departmentType: effectiveDept,
          subServiceName,
          newStatus: 'PENDING_CUSTOMER_ACK',
        })
        setSubServiceStatus('PENDING_CUSTOMER_ACK')
        onSubServiceStatusUpdated?.('PENDING_CUSTOMER_ACK', subServiceName)
      } catch {
        // fallback
      }

      setMessage({
        type: 'success',
        text: `Acknowledgement email sent successfully for ${subServiceName}!`,
      })
    } catch (err: any) {
      console.error('Failed to send acknowledgement:', err)
      setMessage({
        type: 'error',
        text: err?.message || 'Failed to send acknowledgement email.',
      })
    } finally {
      setIsSendingAck(false)
    }
  }

  if (!isOpen || !customer) return null

  // Status badge metadata
  const statusMeta = {
    PENDING: { label: 'PENDING', className: 'ssd-badge--pending', icon: 'alert' as const },
    IN_PROGRESS: { label: 'IN PROGRESS', className: 'ssd-badge--in-progress', icon: 'clock' as const },
    PENDING_CUSTOMER_ACK: {
      label: 'PENDING CUSTOMER ACK',
      className: 'ssd-badge--ack',
      icon: 'mail' as const,
    },
    COMPLETED: { label: 'COMPLETED', className: 'ssd-badge--completed', icon: 'check' as const },
  }[subServiceStatus] || {
    label: subServiceStatus.replace(/_/g, ' '),
    className: 'ssd-badge--pending',
    icon: 'alert' as const,
  }

  return (
    <AnimatePresence>
      <div className="ssd-overlay" onClick={onClose} role="presentation">
        <motion.div
          className="ssd-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Sub-Service Details"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.18 }}
        >
          {/* Header */}
          <div className="ssd-header">
            <div className="ssd-header-info">
              <h2 className="ssd-title">
                {serviceType ? `${serviceType} Service Flow` : 'Sub-Service Details'}
              </h2>
              <p className="ssd-subtitle">
                {isEditable ? 'Manage sub-service status for ' : 'View sub-service flow for '}
                {customer.businessName || customer.contactName}
              </p>
            </div>
            <button
              type="button"
              className="ssd-close-icon-btn"
              onClick={onClose}
              title="Close modal"
              aria-label="Close"
            >
              <Icon name="x" size={18} strokeWidth={2} />
            </button>
          </div>

          {/* Body */}
          <div className="ssd-body">
            {message && (
              <div className={`ssd-status-msg ssd-status-msg--${message.type}`}>
                {message.text}
              </div>
            )}

            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
                <Icon name="refresh" size={24} strokeWidth={2} className="animate-spin inline-block mb-2" />
                <p style={{ fontSize: '13px' }}>Loading service flow...</p>
              </div>
            ) : error ? (
              <div style={{ textAlign: 'center', padding: '24px 16px', color: '#ef4444' }}>
                <p style={{ fontSize: '13px' }}>{error}</p>
              </div>
            ) : subServices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
                <p style={{ fontSize: '13px' }}>No service flow data available.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {subServices.map((sub) => {
                  return (
                    <div
                      key={sub.name}
                      className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden"
                    >
                      {/* Card Header matching Reference */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                        <span className="rounded-md bg-blue-50 text-blue-700 px-3 py-1 text-xs font-semibold">
                          {sub.name}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {sub.steps.length} {sub.steps.length === 1 ? 'step' : 'steps'}
                        </span>
                      </div>

                      {/* Step list matching Reference */}
                      <ol className="divide-y divide-slate-100">
                        {sub.steps.map((step, i) => {
                          const isCompleted = step.status.toUpperCase() === 'COMPLETED'
                          const isInProgress =
                            step.status.toUpperCase() === 'IN_PROGRESS' ||
                            step.status.toUpperCase() === 'IN-PROGRESS'
                          const isAwaitingAck =
                            step.status.toUpperCase() === 'PENDING_CUSTOMER_ACK'

                          const badgeStyle = isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isInProgress
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : isAwaitingAck
                                ? 'bg-violet-50 text-violet-700 border-violet-200'
                                : 'bg-[#fff8eb] text-[#b45309] border-amber-200/80'

                          const label = isCompleted
                            ? 'Completed'
                            : isInProgress
                              ? 'In Progress'
                              : isAwaitingAck
                                ? 'Awaiting Ack'
                                : 'Pending'

                          const dateSource = step.updatedAt || step.createdAt
                          const formattedDate = dateSource
                            ? new Date(dateSource).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : ''

                          return (
                            <li
                              key={`${sub.name}-${step.stepName}-${i}`}
                              className={`flex items-center justify-between px-4 py-3 gap-3 ${
                                !isCompleted && isEditable
                                  ? 'cursor-pointer hover:bg-slate-50 transition-colors'
                                  : ''
                              }`}
                              onClick={() => {
                                if (!isCompleted && isEditable) {
                                  setConfirmingStep({ step, subServiceName: sub.name })
                                }
                              }}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="flex h-8 w-8 shrink-0 rounded-full border border-slate-200 bg-white items-center justify-center font-semibold text-xs text-slate-700">
                                  {step.order || i + 1}
                                </span>
                                <span className="text-xs font-medium text-slate-800 break-words">
                                  {step.stepName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs border font-medium ${badgeStyle}`}
                                >
                                  <Icon
                                    name={isCompleted ? 'check' : isInProgress ? 'clock' : 'alert'}
                                    size={12}
                                    strokeWidth={2.2}
                                  />
                                  <span>{label}</span>
                                </span>
                                {formattedDate && (
                                  <span className="text-xs text-slate-500 whitespace-nowrap">
                                    {formattedDate}
                                  </span>
                                )}
                              </div>
                            </li>
                          )
                        })}
                      </ol>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Read-Only Notice Box for Department Head */}
            {!isEditable && (
              <div className="ssd-readonly-box">
                <Icon name="alert" size={16} strokeWidth={2.2} className="ssd-readonly-icon" />
                <div className="ssd-readonly-content">
                  <p className="ssd-readonly-title">Read-Only View</p>
                  <p className="ssd-readonly-desc">
                    As a department head, you can view the service flow but cannot modify it. Contact
                    the assigned user to make changes.
                  </p>
                </div>
              </div>
            )}

            {/* Change Status Section (Department User) */}
            {isEditable && (
              <div className="ssd-section">
                <h4 className="ssd-section-title">Change Status</h4>
                <select
                  className="ssd-select"
                  value={subServiceStatus}
                  onChange={(e) => handleStatusDropdownChange(e.target.value)}
                  disabled={!allFlowsCompleted || isUpdatingStatus}
                >
                  <option value="PENDING" disabled={subServiceStatus !== 'PENDING'}>
                    Pending
                  </option>
                  <option value="IN_PROGRESS" disabled={subServiceStatus !== 'IN_PROGRESS'}>
                    Service Status is In Progress
                  </option>
                  <option
                    value="PENDING_CUSTOMER_ACK"
                    disabled={subServiceStatus !== 'PENDING_CUSTOMER_ACK'}
                  >
                    Pending Customer Acknowledgement
                  </option>
                  <option value="COMPLETED" disabled={!allFlowsCompleted}>
                    Completed
                  </option>
                </select>

                {!allFlowsCompleted && (
                  <p className="ssd-hint">Complete all service flow steps to enable status change</p>
                )}

                {allFlowsCompleted && (
                  <button
                    type="button"
                    className="ssd-ack-btn"
                    onClick={handleSendAcknowledgement}
                    disabled={isSendingAck}
                  >
                    <Icon name="mail" size={15} strokeWidth={2} />
                    <span>{isSendingAck ? 'Sending Acknowledgement...' : 'Send Acknowledgement'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer Stacked Buttons */}
          <div className="ssd-footer-stacked">
            <button type="button" className="ssd-btn-stacked" onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className="ssd-btn-stacked"
              onClick={() => {
                const historyDept = effectiveDept.toLowerCase().replace(/_department$/, '')
                const historyPath = window.location.pathname.includes('-user')
                  ? `/${historyDept}-user/history`
                  : `/departments/${historyDept}/history`
                window.location.href = historyPath
              }}
            >
              <Icon name="book" size={15} strokeWidth={2} />
              <span>View History</span>
            </button>
          </div>
        </motion.div>

        {/* Step Completion Confirmation Modal */}
        {confirmingStep && (
          <div
            className="ssd-confirm-overlay"
            onClick={() => setConfirmingStep(null)}
            role="presentation"
          >
            <motion.div
              className="ssd-confirm-modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <h3 className="ssd-confirm-title">Confirm Completion</h3>
              <p className="ssd-confirm-desc">
                Mark "<strong>{confirmingStep.step.stepName}</strong>" as completed? This will complete the step for sub-service "<strong>{confirmingStep.subServiceName}</strong>".
              </p>
              <div className="ssd-confirm-actions">
                <button
                  type="button"
                  className="ssd-btn-secondary"
                  onClick={() => setConfirmingStep(null)}
                  disabled={isCompletingStep}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="ssd-btn-confirm"
                  onClick={handleConfirmStepCompletion}
                  disabled={isCompletingStep}
                >
                  {isCompletingStep ? 'Completing...' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AnimatePresence>
  )
}
