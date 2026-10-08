import { useState, type ChangeEvent } from 'react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { Icon } from '../shared/Icon'
import './DepartmentSopModal.css'

export interface DepartmentSopStep {
  id: string
  name: string
}

export interface DepartmentSopModalProps {
  open: boolean
  departmentName: string
  steps: DepartmentSopStep[]
  onClose: () => void
  onSave: (steps: DepartmentSopStep[]) => void
  isSubmitting?: boolean
  error?: string
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

function StepRow({
  index,
  step,
  onNameChange,
  onMoveUp,
  onMoveDown,
  onRemove,
  canMoveUp,
  canMoveDown,
}: {
  index: number
  step: DepartmentSopStep
  onNameChange: (id: string, name: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onRemove: (id: string) => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  return (
    <div className="sop-step-row">
      <div className="sop-step-row__number">{index + 1}</div>

      <input
        type="text"
        className="sop-step-row__input"
        value={step.name}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onNameChange(step.id, e.target.value)}
        placeholder="Step name"
        aria-label={`Step ${index + 1} name`}
      />

      <div className="sop-step-row__actions">
        <button
          type="button"
          className="sop-step-row__action-btn sop-step-row__action-btn--up"
          onClick={() => onMoveUp(step.id)}
          disabled={!canMoveUp}
          aria-label="Move step up"
          title="Move up"
        >
          <Icon name="chevronDown" size={14} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          className="sop-step-row__action-btn"
          onClick={() => onMoveDown(step.id)}
          disabled={!canMoveDown}
          aria-label="Move step down"
          title="Move down"
        >
          <Icon name="chevronDown" size={14} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          className="sop-step-row__action-btn sop-step-row__action-btn--danger"
          onClick={() => onRemove(step.id)}
          aria-label="Remove step"
          title="Remove step"
        >
          <Icon name="trash" size={13} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}

export function DepartmentSopModal({
  open,
  departmentName,
  steps: initialSteps,
  onClose,
  onSave,
  isSubmitting = false,
  error,
}: DepartmentSopModalProps) {
  const [steps, setSteps] = useState<DepartmentSopStep[]>(initialSteps)

  const handleNameChange = (id: string, name: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, name } : s))
  }

  const handleMoveUp = (id: string) => {
    setSteps(prev => {
      const idx = prev.findIndex(s => s.id === id)
      if (idx <= 0) return prev
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
  }

  const handleMoveDown = (id: string) => {
    setSteps(prev => {
      const idx = prev.findIndex(s => s.id === id)
      if (idx >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
  }

  const handleRemove = (id: string) => {
    if (steps.length <= 1) return
    setSteps(prev => prev.filter(s => s.id !== id))
  }

  const handleAddStep = () => {
    setSteps(prev => [...prev, { id: generateId(), name: '' }])
  }

  const validate = (): boolean => {
    let hasError = false
    steps.forEach(s => {
      if (!s.name.trim()) {
        hasError = true
      }
    })
    return !hasError
  }

  const handleSave = () => {
    if (!validate()) return
    onSave(steps.map(s => ({ ...s, name: s.name.trim() })))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="sop-modal__title-row">
          <div className="sop-modal__icon-wrapper">
            <Icon name="list" size={22} strokeWidth={2} className="sop-modal__icon" />
          </div>
          <div>
            <h2 className="sop-modal__title">SOP Sequence</h2>
            <p className="sop-modal__subtitle">{departmentName}</p>
          </div>
        </div>
      }
      size="lg"
      className="sop-modal"
    >
      <div className="sop-modal__body">
        {error && (
          <div className="sop-modal__error" role="alert">
            <Icon name="alert" size={16} strokeWidth={2} />
            <span>{error}</span>
          </div>
        )}

        <div className="sop-modal__steps" role="list" aria-label="SOP steps">
          {steps.map((step, index) => (
            <div key={step.id} className="sop-step-container">
              <StepRow
                index={index}
                step={step}
                onNameChange={handleNameChange}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onRemove={handleRemove}
                canMoveUp={index > 0}
                canMoveDown={index < steps.length - 1}
              />
              {index < steps.length - 1 && (
                <div className="sop-step-arrow" aria-hidden="true">
                  <Icon name="chevronDown" size={18} strokeWidth={2.5} className="sop-step-arrow__icon" />
                </div>
              )}
            </div>
          ))}
        </div>

        {steps.length < 10 && (
          <button
            type="button"
            className="sop-modal__add-step"
            onClick={handleAddStep}
            disabled={isSubmitting}
          >
            <Icon name="plus" size={16} strokeWidth={2} />
            <span>Add step</span>
          </button>
        )}

        {steps.length >= 10 && (
          <p className="sop-modal__max-steps">Maximum of 10 steps reached</p>
        )}
      </div>

      <div className="sop-modal__footer">
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={isSubmitting}
          className="sop-modal__cancel-btn"
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isSubmitting}
          className="sop-modal__save-btn"
        >
          {isSubmitting ? 'Saving…' : 'Save sequence'}
        </Button>
      </div>
    </Modal>
  )
}