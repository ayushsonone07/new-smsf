import { useState, type FormEvent } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import {
  useDepartmentTypes,
  useCreateDynamicColumn,
} from '../../features/permissions/hooks/useDynamicPermissions'

interface CreateColumnModalProps {
  open: boolean
  onClose: () => void
  initialDepartmentType?: string
}

export function CreateColumnModal({
  open,
  onClose,
  initialDepartmentType,
}: CreateColumnModalProps) {
  const { data: departmentTypes = [], isLoading: isLoadingDepts } =
    useDepartmentTypes()
  const createColumnMutation = useCreateDynamicColumn()

  const [selectedDept, setSelectedDept] = useState<string>(
    initialDepartmentType || 'ONBOARDING_DEPARTMENT',
  )
  const [columnName, setColumnName] = useState<string>('')
  const [readWriteAccess, setReadWriteAccess] = useState<'12' | '1' | '2'>('12')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!selectedDept || !columnName.trim()) return

    setSuccessMessage(null)
    createColumnMutation.mutate(
      {
        departmentType: selectedDept,
        columnName: columnName.trim(),
        readWriteAccess,
      },
      {
        onSuccess: (res) => {
          setSuccessMessage(
            `Column "${res.columnName}" created successfully and linked to ${selectedDept}! (Stored in access_customer_columns)`,
          )
          setColumnName('')
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
    setColumnName('')
    createColumnMutation.reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleModalClose}
      title="Create Dynamic Customer Column"
      description="Create a new column in access_customer_columns and configure department permissions."
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

        {createColumnMutation.isError && (
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
            {createColumnMutation.error?.message || 'Failed to create column'}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-color, #334155)' }}>
            Department Type (from DepartmentType.java)
          </label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            disabled={isLoadingDepts || createColumnMutation.isPending}
            style={{
              padding: '0.625rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #cbd5e1)',
              backgroundColor: 'var(--bg-surface, #ffffff)',
              color: 'var(--text-color, #1e293b)',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            {departmentTypes.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Select the department enum this column will be registered under.
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-color, #334155)' }}>
            Column Name / Key
          </label>
          <input
            type="text"
            placeholder="e.g. businessCategory or remarks"
            value={columnName}
            onChange={(e) => setColumnName(e.target.value)}
            disabled={createColumnMutation.isPending}
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
            Enter the exact column name to store in the <code>access_customer_columns</code> database table.
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-color, #334155)' }}>
            Default Access Level
          </label>
          <select
            value={readWriteAccess}
            onChange={(e) => setReadWriteAccess(e.target.value as '12' | '1' | '2')}
            disabled={createColumnMutation.isPending}
            style={{
              padding: '0.625rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #cbd5e1)',
              backgroundColor: 'var(--bg-surface, #ffffff)',
              color: 'var(--text-color, #1e293b)',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            <option value="12">Read + Write (12)</option>
            <option value="1">Read Only (1)</option>
            <option value="2">Write Only (2)</option>
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={handleModalClose}
            disabled={createColumnMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createColumnMutation.isPending || !columnName.trim()}
          >
            {createColumnMutation.isPending ? 'Saving...' : 'Submit Column'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
