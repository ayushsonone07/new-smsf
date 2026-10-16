import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import type { DynamicRouteResponse } from '../../api/dynamic-permission.api'
import { useUpdateDynamicRoute } from '../../features/permissions/hooks/useDynamicPermissions'

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

  if (!route) return null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!routeName.trim() || !route) return

    setSuccessMessage(null)
    updateRouteMutation.mutate(
      {
        routeId: route.routeId,
        payload: {
          routeName: routeName.trim(),
          departmentType,
        },
      },
      {
        onSuccess: (res) => {
          setSuccessMessage(
            `Route updated to "${res.routeName || routeName.trim()}" successfully!`,
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
            placeholder="e.g. /head/dashboard or /head/meeting"
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
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

