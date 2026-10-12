import { useMemo, useState } from 'react'
import type { AdminServiceItem } from '../../api/admin-services.api'
import { normalizeDepartmentTypeName } from '../../api/dynamic-permission.api'
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
}> = [
  { slug: 'dashboard', label: 'Dashboard', defaultChecked: true },
  { slug: 'users', label: 'Department Users', defaultChecked: true },
  { slug: 'customers', label: 'Customer List', defaultChecked: true },
  { slug: 'attendance', label: 'Attendance', defaultChecked: true },
  { slug: 'history', label: 'Task History', defaultChecked: true },
  { slug: 'analytics', label: 'Analytics', defaultChecked: true },
  { slug: 'service-flow', label: 'Service Flow', defaultChecked: false },
  { slug: 'member-flow', label: 'Member Flow', defaultChecked: false },
  { slug: 'meeting', label: '15 Days Meeting', defaultChecked: false },
  { slug: 'sop', label: 'SOP', defaultChecked: false },
  { slug: 'help-support', label: 'Help & Support', defaultChecked: true },
]

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
}: DepartmentFormModalProps) {
  const { data: adminServices = [], isLoading: isLoadingServices } =
    useAdminServices()
  const { data: departmentTypes = [] } = useDepartmentTypes()

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
  const [showAddServiceModal, setShowAddServiceModal] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
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
      setIsHead(true)
      setInitialRoutes(DEFAULT_INITIAL_ROUTES)

      if (department?.type) {
        setSelectedDepartmentType(department.type)
        const matchingOption = serviceDropdownOptions.find(
          (opt) =>
            opt.departmentType.toUpperCase() === department.type!.toUpperCase(),
        )
        setSelectedServiceKey(matchingOption?.key ?? `dept:${department.type}`)
      } else if (initialService) {
        setSelectedDepartmentType(initialService.departmentType)
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
            (opt) => !takenSet.has(opt.departmentType.toUpperCase()),
          ) || serviceDropdownOptions[0]
        setSelectedDepartmentType(firstAvailable.departmentType)
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
      setSelectedDepartmentType(found.departmentType)
    } else if (optionKey.startsWith('dept:')) {
      setSelectedDepartmentType(optionKey.slice(5))
    } else {
      setSelectedDepartmentType(optionKey)
    }
  }

  function toggleRoute(slug: string) {
    setInitialRoutes((prev) =>
      prev.includes(slug)
        ? prev.filter((item) => item !== slug)
        : [...prev, slug],
    )
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!resolvedDepartmentType) return
    if (!isEdit && existingHeadForType) return

    if (isEdit) {
      onUpdate({
        name: username || name,
        username: username || name,
        oldEmail: department?.email,
        email,
        contact: contact || undefined,
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
      contact: contact || '9999999999',
      password,
      type: resolvedDepartmentType,
      departmentType: resolvedDepartmentType,
      initialRoutes,
    })
  }

  const values: DepartmentFormValues = {
    name,
    username,
    email,
    contact,
    password,
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="lg"
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

          {/* 6. Initial Department Environment (Sidebar Routes) */}
          {!isEdit && !existingHeadForType && (
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
                    Initial Department Environment (Sidebar Routes)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Selected screens will be provisioned in{' '}
                    <code>access_routes</code> for this department.
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
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: '0.45rem',
                  marginTop: '0.5rem',
                }}
              >
                {ENVIRONMENT_FEATURE_OPTIONS.map((option) => {
                  const checked = initialRoutes.includes(option.slug)
                  return (
                    <label
                      key={option.slug}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        fontSize: '0.8125rem',
                        color: '#334155',
                        padding: '0.35rem 0.5rem',
                        borderRadius: '6px',
                        backgroundColor: checked ? '#eff6ff' : '#ffffff',
                        border: checked
                          ? '1px solid #93c5fd'
                          : '1px solid #e2e8f0',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRoute(option.slug)}
                      />
                      <span>{option.label}</span>
                    </label>
                  )
                })}
              </div>
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
                !resolvedDepartmentType ||
                (!isEdit && Boolean(existingHeadForType))
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
