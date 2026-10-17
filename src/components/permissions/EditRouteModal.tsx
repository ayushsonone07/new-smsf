import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import type { DynamicRouteResponse } from '../../api/dynamic-permission.api'
import { useUpdateDynamicRoute } from '../../features/permissions/hooks/useDynamicPermissions'
import { normalizeInputRoute } from '../../features/departments/head/utils/routeUtils'

interface EditRouteModalProps {
  open: boolean
  onClose: () => void
  route: DynamicRouteResponse | null
  departmentType?: string
}

export function EditRouteModal({
  open,
  onClose,
  route,
  departmentType,
}: EditRouteModalProps) {
  const updateRouteMutation = useUpdateDynamicRoute()
  const [routeName, setRouteName] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (route) {
      setRouteName(route.routeName)
      setSuccessMessage(null)
      updateRouteMutation.reset()
    }
  }, [route])

  const normalizedInfo = useMemo(() => {
    return normalizeInputRoute(routeName, departmentType)
  }, [routeName, departmentType])

  if (!route) return null

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text')
    if (pasted) {
      const parsed = normalizeInputRoute(pasted, departmentType)
      if (parsed.normalized && parsed.wasAutoConverted) {
        e.preventDefault()
        setRouteName(parsed.normalized)
      }
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!routeName.trim() || !route) return

    const finalRouteName = normalizedInfo.normalized || routeName.trim()

    setSuccessMessage(null)
    updateRouteMutation.mutate(
      {
        routeId: route.routeId,
        payload: {
          routeName: finalRouteName,
          departmentType,
        },
      },
      {
        onSuccess: (res) => {
          setSuccessMessage(
            `Route updated to "${res.routeName || finalRouteName}" successfully!`,
          )
          setTimeout(() => {
            setSuccessMessage(null)
            onClose()
          }, 1200)
        },
      },
    )
  }

  const handleModalClose = () => {
    setSuccessMessage(null)
    updateRouteMutation.reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleModalClose}
      title="Edit Dynamic Route"
      description={`Update route name/path for route ID: ${route.routeId}`}
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

        {updateRouteMutation.isError && (
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
            {updateRouteMutation.error?.message || 'Failed to update route'}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--text-color, #334155)',
            }}
          >
            Route ID
          </label>
          <input
            type="text"
            value={route.routeId}
            disabled
            style={{
              padding: '0.625rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #cbd5e1)',
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              fontSize: '0.875rem',
              cursor: 'not-allowed',
            }}
          />
        </div>

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
            disabled={updateRouteMutation.isPending}
            required
            autoFocus
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
            Enter the updated route path. This updates <code>access_routes</code> and any referencing columns.
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
            disabled={updateRouteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={updateRouteMutation.isPending || !routeName.trim()}
          >
            {updateRouteMutation.isPending ? 'Updating...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

