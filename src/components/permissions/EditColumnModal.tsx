import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import type {
  DynamicColumnResponse,
  DynamicRouteResponse,
} from '../../api/dynamic-permission.api'
import {
  useDynamicRoutes,
  useUpdateDynamicColumn,
} from '../../features/permissions/hooks/useDynamicPermissions'

interface EditColumnModalProps {
  open: boolean
  onClose: () => void
  column: DynamicColumnResponse | null
  departmentType?: string
  routes?: DynamicRouteResponse[]
}

export function EditColumnModal({
  open,
  onClose,
  column,
  departmentType,
  routes: providedRoutes,
}: EditColumnModalProps) {
  const updateColumnMutation = useUpdateDynamicColumn()
  const routesQuery = useDynamicRoutes(departmentType, open && !providedRoutes)
  const routes = providedRoutes || routesQuery.data || []

  const [columnName, setColumnName] = useState<string>('')
  const [selectedRouteId, setSelectedRouteId] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (column) {
      setColumnName(column.columnName || '')
      setSelectedRouteId(column.routeId || column.routesType || '')
      setSuccessMessage(null)
      updateColumnMutation.reset()
    }
  }, [column])

  if (!column) return null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!columnName.trim() || !column) return

    setSuccessMessage(null)
    updateColumnMutation.mutate(
      {
        columnId: column.columnId,
        payload: {
          columnName: columnName.trim(),
          routesType: selectedRouteId || undefined,
          routeId: selectedRouteId || undefined,
          departmentType,
        },
      },
      {
        onSuccess: (res) => {
          setSuccessMessage(
            `Column updated to "${res.columnName || columnName.trim()}" successfully!`,
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
    updateColumnMutation.reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleModalClose}
      title="Edit Dynamic Column"
      description={`Update column configuration for column ID: ${column.columnId}`}
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

        {updateColumnMutation.isError && (
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
            {updateColumnMutation.error?.message || 'Failed to update column'}
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
            Column ID
          </label>
          <input
            type="text"
            value={column.columnId}
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
            Column Name
          </label>
          <input
            type="text"
            placeholder="e.g. Email, Mobile, Lead Status"
            value={columnName}
            onChange={(e) => setColumnName(e.target.value)}
            disabled={updateColumnMutation.isPending}
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
            Enter the updated column display name in <code>access_customer_columns</code>.
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--text-color, #334155)',
            }}
          >
            Linked Target Route (Route UUID)
          </label>
          <select
            value={selectedRouteId}
            onChange={(e) => setSelectedRouteId(e.target.value)}
            disabled={updateColumnMutation.isPending}
            style={{
              padding: '0.625rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #cbd5e1)',
              backgroundColor: 'var(--bg-surface, #ffffff)',
              color: 'var(--text-color, #1e293b)',
              fontSize: '0.875rem',
            }}
          >
            <option value="">-- No Route Assigned --</option>
            {routes.map((r) => (
              <option key={r.routeId} value={r.routeId}>
                {r.routeName} ({r.routeId})
              </option>
            ))}
          </select>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Route ID where this column should appear.
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
            disabled={updateColumnMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={updateColumnMutation.isPending || !columnName.trim()}
          >
            {updateColumnMutation.isPending ? 'Updating...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

