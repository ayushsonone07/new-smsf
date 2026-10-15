import { useMemo, useState } from 'react'
import {
  normalizeServiceTypeName,
  type AdminServiceItem,
} from '../../api/admin-services.api'
import { normalizeDepartmentTypeName } from '../../api/dynamic-permission.api'
import {
  useAddAdminService,
  useManageAdminService,
} from '../../features/departments/hooks/useAdminServices'
import { useDepartmentTypes } from '../../features/permissions/hooks/useDynamicPermissions'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { ScrollableSelect } from '../ui/ScrollableSelect'

interface AddAdminServiceModalProps {
  open: boolean
  editingService?: AdminServiceItem | null
  onClose: () => void
  onCreated?: (service: AdminServiceItem) => void
}

export function AddAdminServiceModal({
  open,
  editingService = null,
  onClose,
  onCreated,
}: AddAdminServiceModalProps) {
  const { data: departmentTypes = [] } = useDepartmentTypes(open)
  const addMutation = useAddAdminService()
  const manageMutation = useManageAdminService()

  const isEdit = Boolean(editingService)

  const [serviceType, setServiceType] = useState('')
  const [deptMode, setDeptMode] = useState<'existing' | 'custom'>('custom')
  const [selectedDeptType, setSelectedDeptType] = useState(
    'WEBSITE_DEPARTMENT',
  )
  const [customDeptType, setCustomDeptType] = useState('')
  const [isServiceActive, setIsServiceActive] = useState(true)
  const [wasOpen, setWasOpen] = useState(open)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      addMutation.reset()
      manageMutation.reset()
      if (editingService) {
        setServiceType(editingService.serviceType)
        setSelectedDeptType(editingService.departmentType)
        setCustomDeptType(editingService.departmentType)
        setDeptMode('existing')
        setIsServiceActive(Boolean(editingService.isServiceActive))
      } else {
        setServiceType('')
        setCustomDeptType('')
        setDeptMode('custom')
        setSelectedDeptType(departmentTypes[0] || 'WEBSITE_DEPARTMENT')
        setIsServiceActive(true)
      }
    }
  }

  const resolvedDepartmentType = useMemo(() => {
    if (deptMode === 'custom') {
      return normalizeDepartmentTypeName(customDeptType)
    }
    return normalizeDepartmentTypeName(selectedDeptType)
  }, [deptMode, customDeptType, selectedDeptType])

  const normalizedServiceType = useMemo(
    () => normalizeServiceTypeName(serviceType),
    [serviceType],
  )

  const isSubmitting = addMutation.isPending || manageMutation.isPending
  const mutationError = addMutation.error || manageMutation.error

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!normalizedServiceType || !resolvedDepartmentType) return

    if (isEdit && editingService) {
      manageMutation.mutate(
        {
          serviceId: editingService.id,
          serviceType: normalizedServiceType,
          departmentType: resolvedDepartmentType,
          isServiceActive,
          previousServiceType: editingService.serviceType,
          action: 'edit',
        },
        {
          onSuccess: (updated) => {
            if (updated && onCreated) {
              onCreated(updated)
            }
            onClose()
          },
        },
      )
      return
    }

    addMutation.mutate(
      {
        serviceType: normalizedServiceType,
        departmentType: resolvedDepartmentType,
        isServiceActive,
      },
      {
        onSuccess: (created) => {
          if (onCreated) {
            onCreated(created)
          }
          onClose()
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isEdit ? 'Edit Service' : 'Step 1: Add New Service'}
      description={
        isEdit
          ? 'Update the service type, department type, or active status.'
          : 'Create a Service and link it to a Department Type before creating the Department Head login.'
      }
    >
      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Service Type Name */}
          <div>
            <label
              htmlFor="service-type-input"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#1e293b',
                marginBottom: '0.35rem',
              }}
            >
              Service Type Name <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              id="service-type-input"
              type="text"
              required
              value={serviceType}
              onChange={(e) => {
                const val = e.target.value.toUpperCase().replace(/\s+/g, '_')
                setServiceType(val)
                if (
                  deptMode === 'custom' &&
                  (!customDeptType ||
                    customDeptType === serviceType ||
                    customDeptType === `${serviceType}_DEPARTMENT`)
                ) {
                  setCustomDeptType(val)
                }
              }}
              placeholder="e.g. AI_AUTOMATION or SEO_OPTIMIZATION"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                color: '#0f172a',
                backgroundColor: '#fff',
              }}
            />
            <span
              style={{
                display: 'block',
                marginTop: '0.25rem',
                fontSize: '0.75rem',
                color: '#64748b',
              }}
            >
              Spaces automatically convert to underscores (e.g.{' '}
              <code>{normalizedServiceType || 'NEW_SERVICE'}</code>)
            </span>
          </div>

          {/* Department Type Selection / New Department Name */}
          <div
            style={{
              padding: '0.85rem',
              borderRadius: '10px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.4rem',
              }}
            >
              <label
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#1e293b',
                }}
              >
                Department Type <span style={{ color: '#dc2626' }}>*</span>
              </label>

              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  type="button"
                  onClick={() => setDeptMode('custom')}
                  style={{
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border:
                      deptMode === 'custom'
                        ? '1px solid #2563eb'
                        : '1px solid #cbd5e1',
                    backgroundColor:
                      deptMode === 'custom' ? '#eff6ff' : '#ffffff',
                    color: deptMode === 'custom' ? '#1d4ed8' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  + New Department Type
                </button>
                <button
                  type="button"
                  onClick={() => setDeptMode('existing')}
                  style={{
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border:
                      deptMode === 'existing'
                        ? '1px solid #2563eb'
                        : '1px solid #cbd5e1',
                    backgroundColor:
                      deptMode === 'existing' ? '#eff6ff' : '#ffffff',
                    color: deptMode === 'existing' ? '#1d4ed8' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Select Existing
                </button>
              </div>
            </div>

            {deptMode === 'custom' ? (
              <div>
                <input
                  type="text"
                  required={deptMode === 'custom'}
                  value={customDeptType}
                  onChange={(e) => setCustomDeptType(e.target.value)}
                  placeholder="e.g. AI_DEPARTMENT or CLOUD_DEPARTMENT"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    color: '#0f172a',
                    backgroundColor: '#fff',
                  }}
                />
                {resolvedDepartmentType ? (
                  <span
                    style={{
                      display: 'block',
                      marginTop: '0.3rem',
                      fontSize: '0.75rem',
                      color: '#0f766e',
                      fontWeight: 600,
                    }}
                  >
                    Department Type: <code>{resolvedDepartmentType}</code>
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'block',
                      marginTop: '0.3rem',
                      fontSize: '0.75rem',
                      color: '#64748b',
                    }}
                  >
                    Will be formatted as <code>NAME_DEPARTMENT</code>
                  </span>
                )}
              </div>
            ) : (
              <ScrollableSelect
                value={selectedDeptType}
                onChange={(val) => setSelectedDeptType(val)}
                options={
                  departmentTypes.includes(selectedDeptType)
                    ? departmentTypes
                    : [selectedDeptType, ...departmentTypes].filter(Boolean)
                }
                disabled={isSubmitting}
                searchable={true}
                maxHeight={200}
                width="100%"
              />
            )}
          </div>

          {/* Service Active Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 0.875rem',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <div>
              <span
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#1e293b',
                }}
              >
                Service Active Status
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {isServiceActive
                  ? 'Service is active and available for department creation'
                  : 'Service is currently inactive'}
              </span>
            </div>

            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                color: isServiceActive ? '#15803d' : '#64748b',
              }}
            >
              <input
                type="checkbox"
                checked={isServiceActive}
                onChange={(e) => setIsServiceActive(e.target.checked)}
                disabled={isSubmitting}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              {isServiceActive ? 'Active' : 'Inactive'}
            </label>
          </div>

          {mutationError ? (
            <div className="form-error">{mutationError.message}</div>
          ) : null}

          <div className="modal-actions">
            <Button
              type="button"
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
                !normalizedServiceType ||
                !resolvedDepartmentType
              }
            >
              {isSubmitting
                ? isEdit
                  ? 'Updating...'
                  : 'Adding Service...'
                : isEdit
                  ? 'Update Service'
                  : 'Add Service'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

