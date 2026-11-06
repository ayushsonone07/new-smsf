import type { AutowebsionCustomerLightDTO } from '../../../../api/autowebsion.api'

// Helper to compute website status according to user specification:
// "is me Website ke do status aate hai to seniro maintain karna jab dono complete ho tabi complete show karna vana pending ya in progress ok"
export function getWebsiteServiceStatus(c: AutowebsionCustomerLightDTO): string {
  const services = Array.isArray(c.services) ? c.services : []
  const perService = Array.isArray((c as any).perServiceStatus) ? (c as any).perServiceStatus : []
  const combined = [...services, ...perService]
  const websiteServices = combined.filter((s: any) => {
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

  return 'PENDING'
}

// Helper to compute automation status
export function getAutomationServiceStatus(c: AutowebsionCustomerLightDTO): string {
  const services = Array.isArray(c.services) ? c.services : []
  const perService = Array.isArray((c as any).perServiceStatus) ? (c as any).perServiceStatus : []
  const combined = [...services, ...perService]
  const autoServices = combined.filter((s: any) => {
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

  return 'PENDING'
}

// Helper to extract sub-services for a customer and service type
export function getSubServicesForCustomer(
  customer: AutowebsionCustomerLightDTO,
  targetServiceType?: 'WEBSITE' | 'AUTOMATION',
  // false: do not fall back to the main service status when there is no sub-service info
  useMainStatusFallback = true,
): Array<{ name: string; status: string }> {
  const list: Array<{ name: string; status: string }> = []

  // 1. Check services array if specific service has subServiceInfo
  if (Array.isArray(customer.services)) {
    for (const s of customer.services) {
      const st = String(s?.serviceType || '').toUpperCase()
      const matchesTarget =
        !targetServiceType ||
        (targetServiceType === 'WEBSITE' && (st.includes('WEB') || st.includes('SITE'))) ||
        (targetServiceType === 'AUTOMATION' && (st.includes('AUTO') || st.includes('BOT')))

      const subs = Array.isArray((s as any)?.subServiceInfo)
        ? (s as any).subServiceInfo
        : Array.isArray((s as any)?.subServices)
          ? (s as any).subServices
          : null

      if (matchesTarget && subs) {
        for (const sub of subs) {
          const name = sub?.name || sub?.subServiceName || (typeof sub === 'object' ? Object.keys(sub)[0] : String(sub))
          const status = sub?.status || sub?.subServiceStatus || (typeof sub === 'object' ? Object.values(sub)[0] : 'PENDING')
          list.push({ name: String(name), status: String(status).toUpperCase() })
        }
      }
    }
  }

  // 2. If no subServices found in services array, check customer.subServiceInfo
  if (list.length === 0 && Array.isArray(customer.subServiceInfo) && customer.subServiceInfo.length > 0) {
    for (const sub of customer.subServiceInfo) {
      const name = sub?.name || sub?.subServiceName || (typeof sub === 'object' ? Object.keys(sub)[0] : String(sub))
      const status = sub?.status || sub?.subServiceStatus || (typeof sub === 'object' ? Object.values(sub)[0] : 'PENDING')
      const normName = String(name).toUpperCase()

      // Filter appropriately if targetServiceType is given
      if (targetServiceType === 'AUTOMATION') {
        if (normName.includes('WEBSITE') || normName.includes('SEO') || normName.includes('DRAFT')) {
          continue
        }
      } else if (targetServiceType === 'WEBSITE') {
        if (normName.includes('BOT') || (normName.includes('AUTOMATION') && !normName.includes('WEB'))) {
          continue
        }
      }

      list.push({ name: String(name), status: String(status).toUpperCase() })
    }
  }

  // 3. Fallback: if no subServices found at all, check customer.services array itself
  if (useMainStatusFallback && list.length === 0 && Array.isArray(customer.services) && customer.services.length > 0) {
    for (const s of customer.services) {
      const st = String(s?.serviceType || '').toUpperCase()
      const matchesTarget =
        !targetServiceType ||
        (targetServiceType === 'WEBSITE' && (st.includes('WEB') || st.includes('SITE'))) ||
        (targetServiceType === 'AUTOMATION' && (st.includes('AUTO') || st.includes('BOT')))
      if (matchesTarget) {
        list.push({
          name: s.serviceType || 'Service',
          status: String(s.status || 'PENDING').toUpperCase(),
        })
      }
    }
  }

  return list
}

// Helper to validate sub-service completion status
export function checkSubServicesCompletion(
  customer: AutowebsionCustomerLightDTO,
  targetServiceType?: 'WEBSITE' | 'AUTOMATION',
): {
  subServices: Array<{ name: string; status: string }>
  allCompleted: boolean
  isWaitingAck: boolean
  incompleteNames: string[]
} {
  const subServices = getSubServicesForCustomer(customer, targetServiceType)

  if (subServices.length === 0) {
    return {
      subServices: [],
      allCompleted: true,
      isWaitingAck: false,
      incompleteNames: [],
    }
  }

  const isDone = (st: string) => st === 'COMPLETED' || st === 'COMPLETE'
  const isAck = (st: string) =>
    st.includes('ACK') ||
    st === 'PENDING_CUSTOMER_ACK' ||
    st === 'ACKNOWLEDGEMENT_PENDING' ||
    st === 'PENDING_ACK'

  const incomplete = subServices.filter((s) => !isDone(s.status.toUpperCase()))
  const allCompleted = incomplete.length === 0
  const incompleteNames = incomplete.map((s) => s.name)

  const hasUnfinished = incomplete.some((s) => !isAck(s.status.toUpperCase()))
  const isWaitingAck = !allCompleted && !hasUnfinished && incomplete.some((s) => isAck(s.status.toUpperCase()))

  return {
    subServices,
    allCompleted,
    isWaitingAck,
    incompleteNames,
  }
}

// Colour of the Website / Automation service pill follows the sub-services / SOP:
// - If all SOP sub-services are 100% completed: COMPLETED (Green)
// - If any sub-service is waiting customer acknowledgment: WAITING_ACK (Purple)
// - If any sub-service is in progress or partially completed: IN_PROGRESS (Blue)
// - Otherwise: PENDING (Amber)
export function getServicePillStatus(
  c: AutowebsionCustomerLightDTO,
  targetServiceType: 'WEBSITE' | 'AUTOMATION',
): string {
  const subServices = getSubServicesForCustomer(c, targetServiceType, false)
  const statuses = subServices.map((s) => s.status.toUpperCase().replace(/-/g, '_'))

  const isDone = (st: string) => st === 'COMPLETED' || st === 'COMPLETE'
  const isAck = (st: string) =>
    st.includes('ACK') ||
    st === 'PENDING_CUSTOMER_ACK' ||
    st === 'ACKNOWLEDGEMENT_PENDING' ||
    st === 'PENDING_ACK' ||
    st.includes('WAITING')
  const isInProg = (st: string) => st.includes('PROGRESS') || st.includes('INPROCESS')

  // 1. If SOP sub-services exist:
  if (statuses.length > 0) {
    // ONLY COMPLETED when 100% of all SOP sub-services are done:
    if (statuses.every(isDone)) {
      return 'COMPLETED'
    }
    // If all unfinished sub-services are awaiting customer ack:
    const incomplete = statuses.filter((st) => !isDone(st))
    if (incomplete.length > 0 && incomplete.every(isAck)) {
      return 'WAITING_ACK'
    }
    // If any sub-service is in progress, partially completed, or ack:
    if (statuses.some(isInProg) || statuses.some(isDone) || statuses.some(isAck)) {
      return 'IN_PROGRESS'
    }
    return 'PENDING'
  }

  // 2. If no subServices found in subServiceInfo array:
  // Check service-level status
  const rawStatus = (
    targetServiceType === 'WEBSITE'
      ? getWebsiteServiceStatus(c)
      : getAutomationServiceStatus(c)
  ).toUpperCase()

  if (isAck(rawStatus)) return 'WAITING_ACK'
  if (isInProg(rawStatus)) return 'IN_PROGRESS'
  if (isDone(rawStatus)) {
    // Only treat as COMPLETED if customer explicitly has that service row marked COMPLETED
    const services = Array.isArray(c.services) ? c.services : []
    const match = services.find((s: any) => {
      const st = String(s?.serviceType || '').toUpperCase()
      return targetServiceType === 'WEBSITE'
        ? st.includes('WEB') || st.includes('SITE')
        : st.includes('AUTO') || st.includes('BOT')
    })
    if (match && isDone(String(match.status || '').toUpperCase())) {
      return 'COMPLETED'
    }
  }

  return 'PENDING'
}

export function getStatusBadgeStyle(status: string): string {
  const s = String(status || 'PENDING').toUpperCase()
  if (s.includes('COMPLETE')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
  }
  if (s.includes('PROGRESS')) {
    return 'bg-blue-50 text-blue-700 border-blue-200/80'
  }
  return 'bg-[#fff8eb] text-[#b45309] border-amber-200/80'
}

export function getStatusSelectStyle(status: string): string {
  const s = String(status || 'PENDING').toUpperCase()
  if (s.includes('COMPLETE')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-300 focus:border-emerald-500'
  }
  if (s.includes('PROGRESS')) {
    return 'bg-blue-50 text-blue-700 border-blue-300 focus:border-blue-500'
  }
  return 'bg-[#fff8eb] text-[#b45309] border-amber-300 focus:border-amber-500'
}

export function getStatusIconColor(status: string): string {
  const s = String(status || 'PENDING').toUpperCase()
  if (s.includes('COMPLETE')) return 'text-emerald-600'
  if (s.includes('PROGRESS')) return 'text-blue-600'
  return 'text-amber-700'
}

export function formatStatusLabel(status: string): string {
  const s = String(status || 'PENDING').toUpperCase()
  if (s.includes('COMPLETE')) return 'Completed'
  if (s.includes('PROGRESS')) return 'In Progress'
  return 'Pending'
}

export function getServicePillStyle(status: string): {
  btnClass: string
  iconClass: string
  label: string
  inlineStyle: {
    backgroundColor: string
    borderColor: string
    color: string
  }
} {
  const s = String(status || 'PENDING').toUpperCase().replace(/-/g, '_')
  if (s === 'COMPLETED' || s === 'COMPLETE') {
    return {
      btnClass: 'cl-service-pill--completed bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100',
      iconClass: 'text-emerald-600',
      label: 'Completed',
      inlineStyle: {
        backgroundColor: '#f0fdf4',
        borderColor: '#bbf7d0',
        color: '#15803d',
      },
    }
  }
  if (s.includes('ACK') || s.includes('WAITING')) {
    return {
      btnClass: 'cl-service-pill--waiting-ack bg-purple-50 text-purple-700 border-purple-200/80 hover:bg-purple-100',
      iconClass: 'text-purple-600',
      label: 'Waiting Customer Acknowledgment',
      inlineStyle: {
        backgroundColor: '#faf5ff',
        borderColor: '#e9d5ff',
        color: '#7e22ce',
      },
    }
  }
  if (s.includes('PROGRESS')) {
    return {
      btnClass: 'cl-service-pill--in-progress bg-blue-50 text-blue-700 border-blue-200/80 hover:bg-blue-100',
      iconClass: 'text-blue-600',
      label: 'In Progress',
      inlineStyle: {
        backgroundColor: '#eff6ff',
        borderColor: '#bfdbfe',
        color: '#1d4ed8',
      },
    }
  }
  return {
    btnClass: 'cl-service-pill--pending bg-[#fff8eb] text-[#b45309] border-amber-200/80 hover:bg-amber-100/70',
    iconClass: 'text-amber-700',
    label: 'Pending',
    inlineStyle: {
      backgroundColor: '#fff8eb',
      borderColor: '#fde68a',
      color: '#b45309',
    },
  }
}
