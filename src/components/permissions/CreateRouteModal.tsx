import { useMemo, useState, type FormEvent } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { ScrollableSelect } from '../ui/ScrollableSelect'
import {
  useDepartmentTypes,
  useCreateDynamicRoute,
} from '../../features/permissions/hooks/useDynamicPermissions'
import { normalizeInputRoute } from '../../features/departments/head/utils/routeUtils'
import { normalizeDepartmentSlug } from '../../api/dynamic-permission.api'

interface CreateRouteModalProps {
  open: boolean
  onClose: () => void
  initialDepartmentType?: string
}

const PRESET_SCREENS = [
  { label: '📊 Dashboard', slug: 'dashboard' },
  { label: '👥 Users', slug: 'users' },
  { label: '📋 Customers', slug: 'customers' },
  { label: '📅 15 Days Meeting', slug: 'meeting' },
  { label: '📄 SOP', slug: 'sop' },
  { label: '⏱ History', slug: 'history' },
  { label: '❓ Help Center', slug: 'help-center' },
  { label: '🔄 Service Flow', slug: 'service-flow' },
]

export function CreateRouteModal({
  open,
  onClose,
  initialDepartmentType,
}: CreateRouteModalProps) {
  const { data: departmentTypes = [], isLoading: isLoadingDepts } =
    useDepartmentTypes(open)
  const createRouteMutation = useCreateDynamicRoute()

  const [selectedDept, setSelectedDept] = useState<string>(
    initialDepartmentType || 'ONBOARDING_DEPARTMENT',
  )
  const [routeName, setRouteName] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const deptSlug = useMemo(
    () => normalizeDepartmentSlug(selectedDept) || 'onboarding_department',
    [selectedDept],
  )

  const normalizedInfo = useMemo(() => {
    return normalizeInputRoute(routeName, selectedDept)
  }, [routeName, selectedDept])

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text')
    if (pasted) {
      const parsed = normalizeInputRoute(pasted, selectedDept)
      if (parsed.normalized && parsed.wasAutoConverted) {
        e.preventDefault()
        setRouteName(parsed.normalized)
      }
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!selectedDept || !routeName.trim()) return

    const finalRouteName = normalizedInfo.normalized || routeName.trim()

    setSuccessMessage(null)
    createRouteMutation.mutate(
      {
        departmentType: selectedDept,
        routeName: finalRouteName,
      },
      {
        onSuccess: (res) => {
          setSuccessMessage(
            `Route "${res.routeName}" created successfully and linked to ${selectedDept}! (Stored in access_routes)`,
          )
          setRouteName('')
          setTimeout(() => {
            setSuccessMessage(null)
            onClose()
          }, 1500)
        },
      },
    )
  }

  const handleModalClose = () => {
    setSuccessMessage(null)
    setRouteName('')
    createRouteMutation.reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleModalClose}
      title="Create Dynamic Route"
      description="Create a new route in access_routes and assign it to a department."
      size="md"
    >
      <form
        className="dynamic-permission-form"
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          marginTop: '0.75rem',
        }}
      >
        {successMessage && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#ecfdf5',
              border: '1px solid #10b981',
              borderRadius: '8px',
              color: '#065f46',
              fontSize: '0.875rem',
            }}
          >
            ✓ {successMessage}
          </div>
        )}

        {createRouteMutation.isError && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              color: '#991b1b',
              fontSize: '0.875rem',
            }}
          >
            {createRouteMutation.error?.message || 'Failed to create route'}
          </div>
        )}

        {/* Department Type */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--text-color, #334155)',
            }}
          >
            Department Type (from DepartmentType.java)
          </label>
          <ScrollableSelect
            value={selectedDept}
            onChange={(val) => setSelectedDept(val)}
            options={departmentTypes}
            disabled={isLoadingDepts || createRouteMutation.isPending}
            searchable={true}
            maxHeight={200}
            width="100%"
          />
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Select the department enum this route will be registered under.
          </span>
        </div>

        {/* Quick Presets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label
            style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: '#475569',
            }}
          >
            ⚡ Quick Screen Presets (1-Click Fill)
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {PRESET_SCREENS.map((p) => {
              const targetPath = `/${deptSlug}/head/${p.slug}`
              const isSelected = routeName === targetPath
              return (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => setRouteName(targetPath)}
                  disabled={createRouteMutation.isPending}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    borderRadius: '6px',
                    border: isSelected
                      ? '1.5px solid #2563eb'
                      : '1px solid #cbd5e1',
                    backgroundColor: isSelected ? '#eff6ff' : '#f8fafc',
                    color: isSelected ? '#1d4ed8' : '#334155',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Route Path Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--text-color, #334155)',
            }}
          >
            Route Path / Name
          </label>
          <input
            type="text"
            placeholder="Paste any browser URL or e.g. /head/meeting"
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            onPaste={handlePaste}
            disabled={createRouteMutation.isPending}
            required
            style={{
              padding: '0.625rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #cbd5e1)',
              backgroundColor: 'var(--bg-surface, #ffffff)',
              color: 'var(--text-color, #1e293b)',
              fontSize: '0.875rem',
            }}
          />

          {/* Auto-converted Preview Badge */}
          {normalizedInfo.wasAutoConverted && routeName.trim() && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '0.25rem',
                padding: '0.45rem 0.75rem',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                color: '#1e40af',
              }}
            >
              <span>⚡ Auto-converted to standard format:</span>
              <code style={{ fontWeight: 700, color: '#1d4ed8' }}>
                {normalizedInfo.normalized}
              </code>
              <button
                type="button"
                onClick={() => setRouteName(normalizedInfo.normalized)}
                style={{
                  marginLeft: 'auto',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Apply
              </button>
            </div>
          )}

          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Tip: You can paste any browser URL directly; it will automatically convert to the clean standard format.
          </span>
        </div>

        <div
          className="dynamic-permission-form__actions"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            marginTop: '1rem',
          }}
        >
          <Button
            type="button"
            variant="secondary"
            onClick={handleModalClose}
            disabled={createRouteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createRouteMutation.isPending || !routeName.trim()}
          >
            {createRouteMutation.isPending ? 'Saving...' : 'Submit Route'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
