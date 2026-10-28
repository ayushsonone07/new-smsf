import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Building2, Check, Clock3, Hourglass, ListChecks } from 'lucide-react'
import { getCustomerServiceFlow } from '../../../api/service-flow.api'
import { fetchCustomerServiceFlowDetail } from '../../../api/autowebsion.api'
import { matchesDepartmentKey } from '../customers-list/ServiceFlowModal'
import type { Meeting, MeetingDepartment } from './MeetingList'
import { RefreshButton } from '../../ui/RefreshButton'
import './DepartmentFlowModal.css'

interface DepartmentFlowModalProps {
  selection: { meeting: Meeting; department: MeetingDepartment } | null
  onClose: () => void
}

interface FlowStep {
  status?: string
  order?: number
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

interface FlowSection {
  name: string
  steps: { name: string; status: string; order: number }[]
}

function normalizeKey(value: string) {
  return value.trim().toUpperCase().replace(/[\s-]+/g, '_')
}

function getSections(response: unknown, departmentType: string): FlowSection[] {
  if (!response || typeof response !== 'object') return []

  const serviceFlowJson = (response as { serviceFlowJson?: unknown }).serviceFlowJson
  if (!Array.isArray(serviceFlowJson)) return []

  const departmentFlow = serviceFlowJson
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => {
      const match = Object.entries(item).find(
        ([key]) => matchesDepartmentKey(key, departmentType),
      )
      return match?.[1]
    })
    .find((flow) => Boolean(flow && typeof flow === 'object'))

  if (!departmentFlow || typeof departmentFlow !== 'object') return []

  return Object.entries(departmentFlow as Record<string, unknown>)
    .filter(([, value]) => Boolean(value && typeof value === 'object'))
    .map(([sectionName, value]) => ({
      name: sectionName,
      steps: Object.entries(value as Record<string, unknown>)
        .filter(([, step]) => Boolean(step && typeof step === 'object'))
        .map(([name, step]) => ({
          name,
          status: String((step as FlowStep).status ?? 'PENDING'),
          order: Number((step as FlowStep).order ?? Number.MAX_SAFE_INTEGER),
        })),
    }))
    .map((section) => ({
      ...section,
      steps: section.steps.sort((a, b) => a.order - b.order),
    }))
    .filter((section) => section.steps.length > 0)
}

/** WEBSITE_DEPARTMENT -> WEBSITE, AUTOMATION_DEPARTMENT -> AUTOMATION, others -> null. */
function autowebsionServiceType(departmentType: string): 'WEBSITE' | 'AUTOMATION' | null {
  const key = normalizeKey(departmentType)
  if (key.startsWith('WEBSITE')) return 'WEBSITE'
  if (key.startsWith('AUTOMATION')) return 'AUTOMATION'
  return null
}

/**
 * Sections from GET /api/autowebision/customers/{id}/services/{WEBSITE|AUTOMATION}/flow:
 * every sub-service in `subServiceInfo` (e.g. "Website Created", "SEO Complete"),
 * with its steps from `serviceFlowJson[subName]`, or the sub-service status alone.
 */
function getAutowebsionSections(response: unknown): FlowSection[] {
  const data = (response as { data?: unknown })?.data ?? response
  if (!data || typeof data !== 'object') return []
  const { subServiceInfo, serviceFlowJson } = data as {
    subServiceInfo?: unknown
    serviceFlowJson?: unknown
  }
  const flowMap =
    serviceFlowJson && typeof serviceFlowJson === 'object' && !Array.isArray(serviceFlowJson)
      ? (serviceFlowJson as Record<string, unknown>)
      : {}
  const flowFor = (name: string) =>
    Object.entries(flowMap).find(([key]) => normalizeKey(key) === normalizeKey(name))?.[1]

  const toSteps = (value: unknown) =>
    Object.entries((value ?? {}) as Record<string, unknown>)
      .filter(([, step]) => Boolean(step && typeof step === 'object'))
      .map(([name, step]) => ({
        name,
        status: String((step as FlowStep).status ?? 'PENDING'),
        order: Number((step as FlowStep).order ?? Number.MAX_SAFE_INTEGER),
      }))
      .filter((step) => step.order >= 0)
      .sort((a, b) => a.order - b.order)

  const sections: FlowSection[] = []
  const seen = new Set<string>()
  for (const sub of Array.isArray(subServiceInfo) ? subServiceInfo : []) {
    if (!sub || typeof sub !== 'object') continue
    const entry = sub as Record<string, unknown>
    // { name, status } or legacy { "Website Created": "COMPLETED" }
    const name = String(entry.name ?? Object.keys(entry)[0] ?? '').trim()
    if (!name || seen.has(normalizeKey(name))) continue
    const status = String(entry.status ?? (entry.name ? 'PENDING' : Object.values(entry)[0]) ?? 'PENDING')
    const steps = toSteps(flowFor(name))
    seen.add(normalizeKey(name))
    sections.push({ name, steps: steps.length > 0 ? steps : [{ name, status, order: 1 }] })
  }
  // Flow sections that have no subServiceInfo entry
  for (const [name, value] of Object.entries(flowMap)) {
    if (seen.has(normalizeKey(name)) || normalizeKey(name) === 'OVERALL_STATUS') continue
    const steps = toSteps(value)
    if (steps.length > 0) sections.push({ name, steps })
  }
  return sections
}

function formatStatus(status: string) {
  return status.replace(/[_-]+/g, ' ').toUpperCase()
}

function statusClass(status: string) {
  const normalized = normalizeKey(status)
  if (normalized === 'COMPLETED') return 'department-flow__status--completed'
  if (normalized === 'IN_PROGRESS') return 'department-flow__status--in-progress'
  return 'department-flow__status--pending'
}

function StatusIcon({ status }: { status: string }) {
  const normalized = normalizeKey(status)
  if (normalized === 'COMPLETED') return <Check size={13} strokeWidth={2.8} aria-hidden="true" />
  if (normalized === 'IN_PROGRESS') return <Clock3 size={13} strokeWidth={2.5} aria-hidden="true" />
  return <Hourglass size={13} strokeWidth={2.5} aria-hidden="true" />
}

export function DepartmentFlowModal({ selection, onClose }: DepartmentFlowModalProps) {
  // Website / Automation keep their sub-services (Website Created, SEO Complete, ...)
  // on their own service row, so they use the autowebision flow API.
  const autowebType = selection ? autowebsionServiceType(selection.department.id) : null

  const flowQuery = useQuery({
    queryKey: ['meeting-customer-service-flow', selection?.meeting.id],
    queryFn: () => getCustomerServiceFlow(selection!.meeting.id),
    enabled: Boolean(selection) && !autowebType,
  })

  const autowebFlowQuery = useQuery({
    queryKey: ['meeting-autowebsion-service-flow', selection?.meeting.id, autowebType],
    queryFn: () => fetchCustomerServiceFlowDetail(selection!.meeting.id, autowebType!),
    enabled: Boolean(selection) && Boolean(autowebType),
    staleTime: 60_000,
  })

  const activeQuery = autowebType ? autowebFlowQuery : flowQuery

  const sections = useMemo(
    () => {
      if (!selection) return []
      return autowebType
        ? getAutowebsionSections(autowebFlowQuery.data)
        : getSections(flowQuery.data, selection.department.id)
    },
    [autowebType, autowebFlowQuery.data, flowQuery.data, selection],
  )
  const autowebStatus = (
    (autowebFlowQuery.data as { data?: { status?: string } } | undefined)?.data?.status
  )
  const overallStatus = autowebType
    ? autowebStatus || undefined
    : sections
        .find((section) => normalizeKey(section.name) === 'OVERALL_STATUS')
        ?.steps.find((step) => normalizeKey(step.name) === 'SERVICE_STATUS')?.status

  if (!selection) return null

  const status = overallStatus ?? selection.department.status.replace(/-/g, '_')

  return (
    <AnimatePresence>
      <div className="department-flow__overlay" onClick={onClose} role="presentation">
        <motion.section
          className="department-flow__modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="department-flow-title"
          onClick={(event) => event.stopPropagation()}
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 10 }}
          transition={{ duration: 0.18 }}
        >
          <header className="department-flow__header">
            <div>
              <div className="department-flow__title-row">
                <Building2 size={26} aria-hidden="true" />
                <h2 id="department-flow-title">
                  {selection.department.name} Details
                </h2>
              </div>
              <div className="department-flow__customer-row">
                <span className="department-flow__customer-name">
                  {selection.meeting.customer.company || selection.meeting.customer.name}
                </span>
                <span className={`department-flow__status ${statusClass(status)}`}>
                  <StatusIcon status={status} />
                  {formatStatus(status)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <RefreshButton
                onRefresh={() => activeQuery.refetch()}
                isRefreshing={activeQuery.isFetching}
                label="service details"
              />
              <button
                type="button"
                className="department-flow__close-icon"
                aria-label="Close service details"
                onClick={onClose}
              >
                <X size={20} />
              </button>
            </div>
          </header>

          <div
            className={`department-flow__body transition-opacity ${
              activeQuery.isFetching && !activeQuery.isPending ? 'pointer-events-none opacity-60' : ''
            }`}
            aria-busy={activeQuery.isFetching}
          >
            {activeQuery.isPending ? (
              <div className="department-flow__loading" role="status" aria-label="Loading service details">
                <div className="department-flow__skeleton department-flow__skeleton--heading" />
                <div className="department-flow__skeleton" />
                <div className="department-flow__skeleton" />
                <div className="department-flow__skeleton department-flow__skeleton--short" />
              </div>
            ) : activeQuery.isError ? (
              <p className="department-flow__message department-flow__message--error" role="alert">
                {activeQuery.error instanceof Error
                  ? activeQuery.error.message
                  : 'Unable to load service details.'}
              </p>
            ) : sections.length === 0 ? (
              <div className="department-flow__empty">
                <span className="department-flow__empty-icon"><ListChecks size={23} /></span>
                <strong>No service flow details yet</strong>
                <span>There are no steps available for {selection.department.name}.</span>
              </div>
            ) : (
              sections.map((section) => (
                <section className="department-flow__section" key={section.name}>
                  <h3>{section.name}</h3>
                  <div>
                    {section.steps.map((step) => (
                      <div className="department-flow__step" key={step.name}>
                        <span className="department-flow__step-name">{step.name}</span>
                        <span className={`department-flow__status ${statusClass(step.status)}`}>
                          <StatusIcon status={step.status} />
                          {formatStatus(step.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>

          <footer className="department-flow__footer">
            <button type="button" onClick={onClose}>Close</button>
          </footer>
        </motion.section>
      </div>
    </AnimatePresence>
  )
}
