import { useEffect, useMemo, useState } from 'react'
import type { AdminServiceItem } from '../../api/admin-services.api'
import {
  normalizeDepartmentSlug,
  normalizeDepartmentTypeName,
} from '../../api/dynamic-permission.api'
import { useAdminServices } from '../../features/departments/hooks/useAdminServices'
import type {
  CreateDepartmentRequest,
  Department,
  UpdateDepartmentRequest,
} from '../../features/departments/types/department.types'
import { useDepartmentTypes } from '../../features/permissions/hooks/useDynamicPermissions'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { AddAdminServiceModal } from './AddAdminServiceModal'
import {
  DepartmentForm,
  type DepartmentFormField,
  type DepartmentFormValues,
} from './DepartmentForm'

const ENVIRONMENT_FEATURE_OPTIONS: Array<{
  slug: string
  label: string
  defaultChecked: boolean
  isUniversal?: boolean
}> = [
  { slug: 'dashboard', label: 'Dashboard', defaultChecked: true, isUniversal: true },
  { slug: 'department-user', label: 'Department Users', defaultChecked: true, isUniversal: true },
  { slug: 'customer-list', label: 'Customer List', defaultChecked: true, isUniversal: true },
  { slug: 'history', label: 'Task History', defaultChecked: true, isUniversal: true },
  { slug: 'service-flow', label: 'Service Flow', defaultChecked: true, isUniversal: true },
  { slug: 'member-performance', label: 'Member Performance', defaultChecked: true, isUniversal: true },
  { slug: 'attendance', label: 'Attendance', defaultChecked: false },
  { slug: 'meeting', label: '15 Days Meeting', defaultChecked: false },
  { slug: 'sop', label: 'SOP', defaultChecked: false },
  { slug: 'help-support', label: 'Help & Support', defaultChecked: false },
]

export const DEFAULT_ROUTE_COLUMNS: Record<string, string[]> = {
  dashboard: [
    'Metric Name',
    'Target',
    'Current',
    'Achievement %',
    'Status',
    'Last Updated',
  ],
  'department-user': [
    'Name',
    'Number',
    'Email',
    'Role',
    'Target',
    'Achieved',
    'P/A days',
    'Action',
  ],
  users: [
    'Name',
    'Number',
    'Email',
    'Role',
    'Target',
    'Achieved',
    'P/A days',
    'Action',
  ],
  'customer-list': [
    'Business',
    'Contact',
    'Status',
    'Assign To',
    'Internal Remark',
  ],
  customers: [
    'Business',
    'Contact',
    'Status',
    'Assign To',
    'Internal Remark',
  ],
  history: [
    'Customer',
    'Assigned To',
    'Phase',
    'Service status',
    'Status',
    'Timeline',
    'Remarks',
    'Record',
  ],
  'service-flow': [
    'Step ID',
    'Process Name',
    'Assigned Dept',
    'Status',
    'TAT',
    'Priority',
  ],
  'member-performance': [
    'Member',
    'Pending',
    'In Progress',
    'Completed',
    'Follow Up',
    'Total',
    'Completion',
  ],
  'member-flow': [
    'Member',
    'Pending',
    'In Progress',
    'Completed',
    'Follow Up',
    'Total',
    'Completion',
  ],
  attendance: ['User Name', 'Date', 'Check In', 'Check Out', 'Total Hours', 'Status'],
  meeting: ['Customer Name', 'Meeting Date', 'Status', 'Agenda', 'Assignee'],
  sop: ['Title', 'Category', 'Version', 'Last Updated', 'Status'],
  'help-support': ['Ticket ID', 'Customer Name', 'Issue Subject', 'Priority', 'Status', 'Assigned Agent'],
}

const DEFAULT_INITIAL_ROUTES = ENVIRONMENT_FEATURE_OPTIONS.filter(
  (item) => item.defaultChecked,
).map((item) => item.slug)

export interface ServiceDropdownOption {
  key: string
  label: string
  serviceType: string
  departmentType: string
  isServiceActive: boolean
}

interface DepartmentFormModalProps {
  open: boolean
  department: Department | null
  initialService?: AdminServiceItem | null
  existingDepartments?: Department[]
  isSubmitting: boolean
  error?: string
  onClose: () => void
  onCreate: (data: CreateDepartmentRequest) => void
  onUpdate: (data: UpdateDepartmentRequest) => void
  onViewFeatures?: (department: Department) => void
  onViewDashboard?: (department: Department) => void
  embedded?: boolean
}

export function DepartmentFormModal({
  open,
  department,
  initialService = null,
  existingDepartments = [],
  isSubmitting,
  error,
  onClose,
  onCreate,
  onUpdate,
  onViewFeatures,
  onViewDashboard,
  embedded = false,
}: DepartmentFormModalProps) {
  const { data: adminServices = [], isLoading: isLoadingServices } =
    useAdminServices(open)
  const { data: departmentTypes = [] } = useDepartmentTypes(open)

  const [selectedDepartmentType, setSelectedDepartmentType] = useState<string>(
    'WEBSITE_DEPARTMENT',
  )
  const [selectedServiceKey, setSelectedServiceKey] = useState<string>('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [contact, setContact] = useState('')
  const [password, setPassword] = useState('')
  const [isHead, setIsHead] = useState(true)
  const [initialRoutes, setInitialRoutes] = useState<string[]>(
    DEFAULT_INITIAL_ROUTES,
  )
  const [routeColumnsMap, setRouteColumnsMap] = useState<Record<string, string[]>>(
    DEFAULT_ROUTE_COLUMNS,
  )
  const [selectedRouteForColumns, setSelectedRouteForColumns] = useState<string | null>(
    'customer-list',
  )
  const [newColumnName, setNewColumnName] = useState('')
  const [showAddServiceModal, setShowAddServiceModal] = useState(false)
  const [wasOpen, setWasOpen] = useState(false)
  const [lastInitialServiceId, setLastInitialServiceId] = useState<
    number | string | null
  >(null)

  const isEdit = Boolean(department)

  // Build dropdown options from all created Services in Superadmin -> ServiceList,
  // plus initialService (if newly created) and any fallback department types.
  const serviceDropdownOptions = useMemo<ServiceDropdownOption[]>(() => {
    const options: ServiceDropdownOption[] = []
    const seenServiceKeys = new Set<string>()
    const seenDeptTypes = new Set<string>()

    const allServices = initialService
      ? [
          initialService,
          ...adminServices.filter(
            (s) =>
              !(
                s.id === initialService.id ||
                (s.serviceType === initialService.serviceType &&
                  s.departmentType === initialService.departmentType)
              ),
          ),
        ]
      : adminServices

    for (const srv of allServices) {
      if (!srv.departmentType) continue
      const key = `srv:${srv.id}:${srv.serviceType}:${srv.departmentType}`
      if (seenServiceKeys.has(key)) continue
      seenServiceKeys.add(key)
      options.push({
        key,
        label: `${srv.serviceType} — (${srv.departmentType})${
          srv.isServiceActive === false ? ' [Inactive]' : ''
        }`,
        serviceType: srv.serviceType,
        departmentType: srv.departmentType,
        isServiceActive: srv.isServiceActive !== false,
      })
      seenDeptTypes.add(srv.departmentType.toUpperCase())
    }

    for (const deptType of departmentTypes) {
      if (!deptType) continue
      if (!seenDeptTypes.has(deptType.toUpperCase())) {
        options.push({
          key: `dept:${deptType}`,
          label: `${deptType}`,
          serviceType: deptType,
          departmentType: deptType,
          isServiceActive: true,
        })
        seenDeptTypes.add(deptType.toUpperCase())
      }
    }

    return options
  }, [adminServices, departmentTypes, initialService])

  // Automatically select the first available department without an existing head
  useEffect(() => {
    if (isEdit || initialService) return
    if (serviceDropdownOptions.length === 0) return

    const takenSet = new Set(
      existingDepartments
        .map((d) => (d.type || '').toUpperCase())
        .filter(Boolean),
    )

    const currentTaken = selectedDepartmentType && takenSet.has(selectedDepartmentType.toUpperCase())

    if (!selectedServiceKey || currentTaken) {
      const firstAvailable =
        serviceDropdownOptions.find(
          (opt) =>
            !takenSet.has((opt.serviceType || opt.departmentType).toUpperCase()),
        ) || serviceDropdownOptions[0]

      if (firstAvailable) {
        setSelectedDepartmentType(
          firstAvailable.serviceType || firstAvailable.departmentType,
        )
        setSelectedServiceKey(firstAvailable.key)
      }
    }
  }, [serviceDropdownOptions, existingDepartments, isEdit, initialService, selectedServiceKey, selectedDepartmentType])

  const currentInitialKey = initialService
    ? `${initialService.id}:${initialService.serviceType}:${initialService.departmentType}`
    : null

  if (open !== wasOpen || (open && currentInitialKey !== lastInitialServiceId)) {
    setWasOpen(open)
    setLastInitialServiceId(currentInitialKey)

    if (open) {
      setName(department?.name ?? '')
      setUsername(department?.username ?? '')
      setEmail(department?.email ?? '')
      setContact(department?.contact ?? '')
      setPassword('')
      setInitialRoutes(DEFAULT_INITIAL_ROUTES)
      setRouteColumnsMap(DEFAULT_ROUTE_COLUMNS)
      setSelectedRouteForColumns('customer-list')
      setNewColumnName('')

      if (department?.type) {
        setSelectedDepartmentType(department.type)
        const matchingOption = serviceDropdownOptions.find(
          (opt) =>
            opt.serviceType.toUpperCase() === department.type!.toUpperCase() ||
            opt.departmentType.toUpperCase() === department.type!.toUpperCase(),
        )
        setSelectedServiceKey(matchingOption?.key ?? `dept:${department.type}`)
      } else if (initialService) {
        setSelectedDepartmentType(
          initialService.serviceType || initialService.departmentType,
        )
        setSelectedServiceKey(
          `srv:${initialService.id}:${initialService.serviceType}:${initialService.departmentType}`,
        )
      } else if (serviceDropdownOptions.length > 0) {
        const takenSet = new Set(
          existingDepartments
            .map((d) => (d.type || '').toUpperCase())
            .filter(Boolean),
        )
        const firstAvailable =
          serviceDropdownOptions.find(
            (opt) =>
              !takenSet.has((opt.serviceType || opt.departmentType).toUpperCase()),
          ) || serviceDropdownOptions[0]
        setSelectedDepartmentType(
          firstAvailable.serviceType || firstAvailable.departmentType,
        )
        setSelectedServiceKey(firstAvailable.key)
      } else {
        setSelectedDepartmentType('WEBSITE_DEPARTMENT')
        setSelectedServiceKey('')
      }
    }
  }

  const resolvedDepartmentType = useMemo(
    () => normalizeDepartmentTypeName(selectedDepartmentType),
    [selectedDepartmentType],
  )

  const selectedServiceOption = useMemo(() => {
    return serviceDropdownOptions.find(
      (o) =>
        o.key === selectedServiceKey ||
        (o.serviceType &&
          resolvedDepartmentType &&
          normalizeDepartmentTypeName(o.serviceType).toUpperCase() ===
            resolvedDepartmentType.toUpperCase()) ||
        (o.departmentType &&
          resolvedDepartmentType &&
          normalizeDepartmentTypeName(o.departmentType).toUpperCase() ===
            resolvedDepartmentType.toUpperCase()),
    )
  }, [serviceDropdownOptions, selectedServiceKey, resolvedDepartmentType])

  const serviceTypeName = useMemo(() => {
    if (selectedServiceOption?.serviceType) {
      return selectedServiceOption.serviceType
    }
    return resolvedDepartmentType
      ? resolvedDepartmentType.replace(/_DEPARTMENT$/i, '')
      : ''
  }, [selectedServiceOption, resolvedDepartmentType])

  const deptSlug = useMemo(
    () =>
      normalizeDepartmentSlug(
        selectedServiceOption?.serviceType ||
        resolvedDepartmentType ||
        selectedDepartmentType ||
        name ||
        username ||
        'department',
      ),
    [selectedServiceOption, resolvedDepartmentType, selectedDepartmentType, name, username],
  )

  function handleAddColumn(routeSlug: string) {
    if (!newColumnName.trim()) return
    const colTrimmed = newColumnName.trim()
    setRouteColumnsMap((prev) => {
      const current = prev[routeSlug] || []
      if (current.includes(colTrimmed)) return prev
      return {
        ...prev,
        [routeSlug]: [...current, colTrimmed],
      }
    })
    setNewColumnName('')
  }

  function handleRemoveColumn(routeSlug: string, colIndex: number) {
    setRouteColumnsMap((prev) => {
      const current = prev[routeSlug] || []
      return {
        ...prev,
        [routeSlug]: current.filter((_, idx) => idx !== colIndex),
      }
    })
  }

  // Check if this departmentType already has an active DEPARTMENT_HEAD
  const existingHeadForType = useMemo(() => {
    if (!resolvedDepartmentType) return undefined
    return existingDepartments.find((d) => {
      if (isEdit && department && d.id === department.id) return false
      return (
        (d.type || '').toUpperCase() === resolvedDepartmentType.toUpperCase()
      )
    })
  }, [existingDepartments, resolvedDepartmentType, isEdit, department])

  function handleFieldChange(field: DepartmentFormField, value: string) {
    if (field === 'name') {
      setName(value)
    } else if (field === 'username') {
      setUsername(value)
    } else if (field === 'email') {
      setEmail(value)
    } else if (field === 'contact') {
      setContact(value)
    } else {
      setPassword(value)
    }
  }

  function handleServiceOptionChange(optionKey: string) {
    setSelectedServiceKey(optionKey)
    const found = serviceDropdownOptions.find((o) => o.key === optionKey)
    if (found) {
      setSelectedDepartmentType(found.serviceType || found.departmentType)
    } else if (optionKey.startsWith('dept:')) {
      setSelectedDepartmentType(optionKey.slice(5))
    } else {
      setSelectedDepartmentType(optionKey)
    }
  }

  function toggleRoute(slug: string) {
    setInitialRoutes((prev) => {
      const isChecking = !prev.includes(slug)
      if (isChecking) {
        setRouteColumnsMap((curr) => {
          if (!curr[slug] || curr[slug].length === 0) {
            const defaults =
              DEFAULT_ROUTE_COLUMNS[slug] ||
              DEFAULT_ROUTE_COLUMNS['customers'] ||
              []
            return {
              ...curr,
              [slug]: [...defaults],
            }
          }
          return curr
        })
        return [...prev, slug]
      } else {
        return prev.filter((item) => item !== slug)
      }
    })
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!resolvedDepartmentType) return

    const normalizedContact = contact.replace(/\D/g, '')
    if ((!isEdit || normalizedContact) && normalizedContact.length !== 10) return

    if (isEdit) {
      onUpdate({
        name: username || name,
        username: username || name,
        oldEmail: department?.email,
        email,
        contact: normalizedContact || undefined,
        password: password || undefined,
        type: resolvedDepartmentType,
        departmentType: resolvedDepartmentType,
      })
      return
    }

    onCreate({
      name: username || name || resolvedDepartmentType,
      username: username || name || resolvedDepartmentType,
      email,
      contact: normalizedContact,
      password,
      type: resolvedDepartmentType,
      departmentType: resolvedDepartmentType,
      serviceType: serviceTypeName,
      initialRoutes,
      routeColumnsMap,
    })
  }

  const values: DepartmentFormValues = {
    name,
    username,
    email,
    contact,
    password,
  }

  const formBody = (
    <>
      {!isEdit && isSubmitting ? (
          <div
            className="department-creation-loading"
            data-suppress-global-preloader
            role="status"
            aria-live="polite"
            aria-label="Creating department"
          >
            <div className="department-creation-loading__card">
              <div className="department-creation-loading__icon" aria-hidden="true">
                <span />
              </div>
              <strong className='text-black'>Creating department...</strong>
              <p className='text-yellow-500 text-md font-bold'>Creating a new department Please Wait for a while, It may take some time.</p>
              <div
                className="department-creation-loading__track"
                role="progressbar"
                aria-label="Department creation in progress"
              >
                <span className="department-creation-loading__bar" />
              </div>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit}>
          {/* 1. Department Name (Username), 2. Email, 3. Password */}
          <DepartmentForm
            values={values}
            isEdit={isEdit}
            onChange={handleFieldChange}
          />

          {/* 4. Select Service / Department Dropdown */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
              marginTop: '0.5rem',
              marginBottom: '1rem',
              padding: '0.875rem',
              borderRadius: '10px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <label
                htmlFor="service-department-select"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#1e293b',
                }}
              >
                Select Service (Department Type){' '}
                <span style={{ color: '#dc2626' }}>*</span>
              </label>

              <button
                type="button"
                onClick={() => setShowAddServiceModal(true)}
                style={{
                  padding: '0.3rem 0.7rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid #2563eb',
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  cursor: 'pointer',
                }}
              >
                + Step 1: Create New Service
              </button>
            </div>

            <select
              id="service-department-select"
              required
              value={
                selectedServiceKey ||
                serviceDropdownOptions.find(
                  (o) =>
                    o.departmentType.toUpperCase() ===
                    resolvedDepartmentType.toUpperCase(),
                )?.key ||
                ''
              }
              onChange={(e) => handleServiceOptionChange(e.target.value)}
              disabled={isLoadingServices || isSubmitting}
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontSize: '0.875rem',
              }}
            >
              <option value="" disabled>
                {isLoadingServices
                  ? 'Loading services...'
                  : 'Select a Service'}
              </option>
              {serviceDropdownOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>

            {resolvedDepartmentType ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  color: '#0f766e',
                }}
              >
                <span>
                  Selected Department Type:{' '}
                  <strong>
                    <code>{resolvedDepartmentType}</code>
                  </strong>
                </span>
                <span>{adminServices.length} service(s) available</span>
              </div>
            ) : null}

            {!isEdit && existingHeadForType && (
              <div
                style={{
                  padding: '0.75rem 0.875rem',
                  borderRadius: '8px',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #f59e0b',
                  color: '#92400e',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div>
                  <strong>Department Already Exists:</strong>{' '}
                  <code>{resolvedDepartmentType}</code> already has an active
                  Head account (<strong>{existingHeadForType.username}</strong>{' '}
                  — {existingHeadForType.email}). Existing department data,
                  routes, and permissions are protected and will not be
                  overwritten.
                </div>
                <div
                  style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
                >
                  {onViewFeatures && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        onClose()
                        onViewFeatures(existingHeadForType)
                      }}
                    >
                      ⚙ Manage Existing Features
                    </Button>
                  )}
                  {onViewDashboard && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        onClose()
                        onViewDashboard(existingHeadForType)
                      }}
                    >
                      ⌂ Login to Department
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 5. Department Role — Head Selected by Default */}
          <div
            style={{
              marginBottom: '1rem',
              padding: '0.75rem 0.875rem',
              borderRadius: '10px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div>
              <span
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#1e3a8a',
                }}
              >
                Department Role
              </span>
              <span style={{ fontSize: '0.75rem', color: '#1d4ed8' }}>
                Role is set to <code>DEPARTMENT_HEAD</code> by default
              </span>
            </div>

            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 600,
                fontSize: '0.875rem',
                color: '#1e3a8a',
                cursor: 'pointer',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                border: '1px solid #93c5fd',
              }}
            >
              <input
                type="checkbox"
                checked={isHead}
                onChange={(e) => setIsHead(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
              />
              <span>Department Head</span>
            </label>
          </div>

          {/* 6. Initial Department Environment (Sidebar Routes & Dynamic URLs) */}
          {!isEdit && (
            <div
              style={{
                marginTop: '0.5rem',
                padding: '0.875rem',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#1e293b',
                      display: 'block',
                    }}
                  >
                    Dynamic Department Routes & Columns Setup
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Routes created as <code>http://localhost:5173/{deptSlug}/head/[route]</code> with maximum columns per route.
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={() =>
                      setInitialRoutes(
                        ENVIRONMENT_FEATURE_OPTIONS.map((o) => o.slug),
                      )
                    }
                    style={{
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.72rem',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setInitialRoutes(DEFAULT_INITIAL_ROUTES)}
                    style={{
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.72rem',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    Core
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                  gap: '0.55rem',
                  marginTop: '0.5rem',
                }}
              >
                {ENVIRONMENT_FEATURE_OPTIONS.map((option) => {
                  const checked = initialRoutes.includes(option.slug)
                  const cols = routeColumnsMap[option.slug] || []
                  const isSelectedForCols = selectedRouteForColumns === option.slug

                  return (
                    <div
                      key={option.slug}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.3rem',
                        fontSize: '0.8125rem',
                        padding: '0.45rem 0.6rem',
                        borderRadius: '8px',
                        backgroundColor: checked ? '#eff6ff' : '#ffffff',
                        border: isSelectedForCols
                          ? '2px solid #2563eb'
                          : checked
                            ? '1px solid #93c5fd'
                            : '1px solid #e2e8f0',
                        transition: 'all 0.15s ease-in-out',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            cursor: 'pointer',
                            fontWeight: 600,
                            color: '#1e293b',
                            flexWrap: 'wrap',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleRoute(option.slug)}
                          />
                          <span>{option.label}</span>
                          {option.isUniversal && (
                            <span
                              style={{
                                fontSize: '0.62rem',
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px',
                                backgroundColor: '#dbeafe',
                                color: '#1e40af',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.02em',
                              }}
                            >
                              Universal
                            </span>
                          )}
                        </label>

                        {cols.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedRouteForColumns(option.slug)}
                            style={{
                              fontSize: '0.68rem',
                              padding: '0.15rem 0.4rem',
                              borderRadius: '4px',
                              backgroundColor: isSelectedForCols ? '#1d4ed8' : '#e0e7ff',
                              color: isSelectedForCols ? '#ffffff' : '#3730a3',
                              border: 'none',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            {cols.length} cols
                          </button>
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: '0.7rem',
                          color: '#475569',
                          fontFamily: 'monospace',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={`http://localhost:5173/${deptSlug}/head/${option.slug}`}
                      >
                        /{deptSlug}/head/{option.slug}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.15rem' }}>
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                          Max Columns: <strong>{cols.length}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedRouteForColumns(option.slug)}
                          style={{
                            fontSize: '0.68rem',
                            background: 'none',
                            border: 'none',
                            color: '#2563eb',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          {isSelectedForCols ? 'Editing' : 'Manage'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Column manager for selected route */}
              {selectedRouteForColumns && (
                <div
                  style={{
                    marginTop: '0.85rem',
                    padding: '0.75rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b' }}>
                      Columns for Route: <code>http://localhost:5173/{deptSlug}/{selectedRouteForColumns}</code>
                    </div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#1d4ed8',
                        backgroundColor: '#dbeafe',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                      }}
                    >
                      Max Columns: {(routeColumnsMap[selectedRouteForColumns] || []).length}
                    </span>
                  </div>

                  {/* List of active columns */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.35rem',
                      marginBottom: '0.5rem',
                      maxHeight: '120px',
                      overflowY: 'auto',
                    }}
                  >
                    {(routeColumnsMap[selectedRouteForColumns] || []).map((col, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '0.75rem',
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          padding: '0.2rem 0.45rem',
                          borderRadius: '5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        {col}
                        <button
                          type="button"
                          onClick={() => handleRemoveColumn(selectedRouteForColumns, idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            padding: '0 0.1rem',
                            lineHeight: 1,
                          }}
                          title="Remove column"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                    {(routeColumnsMap[selectedRouteForColumns] || []).length === 0 && (
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                        No columns configured yet for this route. Add below.
                      </span>
                    )}
                  </div>

                  {/* Add column input */}
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <input
                      type="text"
                      placeholder={`Add column to ${selectedRouteForColumns}...`}
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddColumn(selectedRouteForColumns)
                        }
                      }}
                      style={{
                        flex: 1,
                        fontSize: '0.78rem',
                        padding: '0.35rem 0.6rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddColumn(selectedRouteForColumns)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.75rem',
                        backgroundColor: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      + Add Column
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {error ? <div className="form-error">{error}</div> : null}

          <div className="modal-actions">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !resolvedDepartmentType
              }
            >
              {isSubmitting
                ? 'Saving...'
                : isEdit
                  ? 'Save Changes'
                  : 'Create Department'}
            </Button>
          </div>
        </form>
      </>
  )

  if (embedded) {
    return (
      <div className="department-form-embedded">
        {formBody}
        <AddAdminServiceModal
          open={showAddServiceModal}
          onClose={() => setShowAddServiceModal(false)}
          onCreated={(createdService) => {
            setSelectedDepartmentType(createdService.departmentType)
            setSelectedServiceKey(
              `srv:${createdService.id}:${createdService.serviceType}:${createdService.departmentType}`,
            )
          }}
        />
      </div>
    )
  }

  return (
    <>
      <Modal
        open={open}
        onClose={() => {
          if (!isSubmitting) onClose()
        }}
        className="modal department-form-modal"
        size="lg"
        showCloseButton={!isSubmitting}
        closeOnEscape={!isSubmitting}
        title={
          isEdit
            ? 'Edit Department Login'
            : 'Step 2: Create Department Login'
        }
        description={
          isEdit
            ? 'Update department head account details and service/department assignment.'
            : 'Enter Department Name, Email, Password, select a Service from the dropdown, and create the Department with Head role.'
        }
      >
        {formBody}
      </Modal>

      <AddAdminServiceModal
        open={showAddServiceModal}
        onClose={() => setShowAddServiceModal(false)}
        onCreated={(createdService) => {
          setSelectedDepartmentType(createdService.departmentType)
          setSelectedServiceKey(
            `srv:${createdService.id}:${createdService.serviceType}:${createdService.departmentType}`,
          )
        }}
      />
    </>
  )
}
