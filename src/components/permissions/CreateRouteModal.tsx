import { useState, type FormEvent } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { ScrollableSelect } from '../ui/ScrollableSelect'
import {
  useDepartmentTypes,
  useCreateDynamicRoute,
} from '../../features/permissions/hooks/useDynamicPermissions'

interface CreateRouteModalProps {
  open: boolean
  onClose: () => void
  initialDepartmentType?: string
}

export function CreateRouteModal({
  open,
  onClose,
  initialDepartmentType,
}: CreateRouteModalProps) {
  const { data: departmentTypes = [], isLoading: isLoadingDepts } =
    useDepartmentTypes()
  const createRouteMutation = useCreateDynamicRoute()

  const [selectedDept, setSelectedDept] = useState<string>(
    initialDepartmentType || 'ONBOARDING_DEPARTMENT',
  )
  const [routeName, setRouteName] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!selectedDept || !routeName.trim()) return

    setSuccessMessage(null)
    createRouteMutation.mutate(
      {
        departmentType: selectedDept,
        routeName: routeName.trim(),
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
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.75rem' }}>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-color, #334155)' }}>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-color, #334155)' }}>
            Route Path / Name
          </label>
          <input
            type="text"
            placeholder="e.g. /head/dashboard or /head/meeting"
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
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
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Enter the exact route name to store in the <code>access_routes</code> database table.
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
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
