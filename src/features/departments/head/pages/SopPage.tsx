import { useMemo, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { Button } from '../../../../components/ui/Button'
import { Icon } from '../../../../components/head/shared/Icon'
import { SopSearchBar } from '../../../../components/head/sop/SopSearchBar'
import type { DepartmentSopStep } from '../../../../components/head/sop/DepartmentSopModal'
import './SopPage.css'

// ============================================================
// TEMPORARY SOP UI DATA
// ============================================================

interface SopSequence {
  id: string
  name: string
  steps: DepartmentSopStep[]
}

const initialSopData: SopSequence[] = [
  {
    id: 'sop-1',
    name: 'Website Creation',
    steps: [
      { id: 'step-1', name: 'Onboarding' },
      { id: 'step-2', name: 'Website Creation' },
      { id: 'step-3', name: 'Google Service' },
      { id: 'step-4', name: 'SEO Service' },
    ],
  },
  {
    id: 'sop-2',
    name: 'Google Business Profile',
    steps: [
      { id: 'step-5', name: 'Onboarding' },
      { id: 'step-6', name: 'Google Service' },
      { id: 'step-7', name: 'SEO Service' },
    ],
  },
  {
    id: 'sop-3',
    name: 'WhatsApp Automation',
    steps: [
      { id: 'step-8', name: 'Onboarding' },
      { id: 'step-9', name: 'Automation' },
    ],
  },
  {
    id: 'sop-4',
    name: 'Digital Card',
    steps: [
      { id: 'step-10', name: 'Onboarding' },
      { id: 'step-11', name: 'Website Creation' },
    ],
  },
]

/**
 * Head panel — SOP Sequences.
 * Inline editing inside the card (no modal).
 */
export function SopPage() {
  const [sopData, setSopData] = useState<SopSequence[]>(initialSopData)
  const [search, setSearch] = useState('')
  const [editingSopId, setEditingSopId] = useState<string | null>(null)
  const [draftSteps, setDraftSteps] = useState<DepartmentSopStep[]>([])

  const filteredSops = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return sopData
    return sopData.filter((sop) => sop.name.toLowerCase().includes(term))
  }, [sopData, search])

  const isEditing = (sopId: string) => editingSopId === sopId

  function startEdit(sop: SopSequence) {
    setEditingSopId(sop.id)
    setDraftSteps(sop.steps.map(s => ({ ...s })))
  }

  function cancelEdit() {
    setEditingSopId(null)
    setDraftSteps([])
  }

  function saveEdit() {
    if (!editingSopId) return
    setSopData(current =>
      current.map(item =>
        item.id === editingSopId ? { ...item, steps: draftSteps.map(s => ({ ...s, name: s.name.trim() })) } : item
      )
    )
    cancelEdit()
  }

  // --- Draft step mutations ---
  function updateDraftStepName(id: string, name: string) {
    setDraftSteps(prev => prev.map(s => s.id === id ? { ...s, name } : s))
  }

  function moveDraftStepUp(id: string) {
    setDraftSteps(prev => {
      const idx = prev.findIndex(s => s.id === id)
      if (idx <= 0) return prev
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
  }

  function moveDraftStepDown(id: string) {
    setDraftSteps(prev => {
      const idx = prev.findIndex(s => s.id === id)
      if (idx >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
  }

  function removeDraftStep(id: string) {
    if (draftSteps.length <= 1) return
    setDraftSteps(prev => prev.filter(s => s.id !== id))
  }

  function addDraftStep() {
    setDraftSteps(prev => [...prev, { id: `step-${Date.now()}`, name: '' }])
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>, id: string) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const currentIdx = draftSteps.findIndex(s => s.id === id)
      if (currentIdx === draftSteps.length - 1) {
        addDraftStep()
      } else {
        const nextInput = document.querySelector(
          `.sop-step-edit:nth-child(${currentIdx + 2}) .sop-step-edit__input`
        ) as HTMLInputElement
        nextInput?.focus()
      }
    }
  }

  // --- Available steps for the "Add step" select ---
  const allKnownSteps = useMemo(() => {
    const set = new Set<string>()
    sopData.forEach(sop => sop.steps.forEach(s => set.add(s.name)))
    return Array.from(set).sort()
  }, [sopData])

  return (
    <>
      <div className="sop-page__header">
        <h1 className="sop-page__title">SOP</h1>
        <p className="sop-page__description">
          Set the steps and statuses for each department — status updates follow the SOP
        </p>
      </div>

      <SopSearchBar
        value={search}
        onChange={setSearch}
        className="sop-page__search"
      />

      {filteredSops.length === 0 ? (
        <div className="sop-page__empty">
          <Icon name="alert" size={32} strokeWidth={1.5} />
          <p>No SOPs found</p>
        </div>
      ) : (
        <div className="sop-page__grid">
          {filteredSops.map((sop) => (
            <SopCard
              key={sop.id}
              sop={sop}
              isEditing={isEditing(sop.id)}
              draftSteps={isEditing(sop.id) ? draftSteps : undefined}
              onEdit={() => startEdit(sop)}
              onSave={saveEdit}
              onUpdateStep={updateDraftStepName}
              onMoveUp={moveDraftStepUp}
              onMoveDown={moveDraftStepDown}
              onRemove={removeDraftStep}
              onAddStep={addDraftStep}
              onKeyDown={handleKeyDown}
              allKnownSteps={allKnownSteps}
            />
          ))}
        </div>
      )}
    </>
  )
}

interface SopCardProps {
  sop: SopSequence
  isEditing: boolean
  draftSteps?: DepartmentSopStep[]
  onEdit: () => void
  onSave: () => void
  onUpdateStep: (id: string, name: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onRemove: (id: string) => void
  onAddStep: () => void
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>, id: string) => void
  allKnownSteps: string[]
}

function SopCard({
  sop,
  isEditing,
  draftSteps,
  onEdit,
  onSave,
  onUpdateStep,
  onMoveUp,
  onMoveDown,
  onRemove,
  onAddStep,
  onKeyDown,
  allKnownSteps,
}: SopCardProps) {
  const steps = isEditing && draftSteps ? draftSteps : sop.steps

  return (
    <article className={`sop-card ${isEditing ? 'sop-card--editing' : ''}`}>
      <header className="sop-card__header">
        <div className="sop-card__icon-wrapper">
          <Icon name="flow" size={20} strokeWidth={2} className="sop-card__icon" />
        </div>
        <div className="sop-card__title-row">
          <h3 className="sop-card__name">{sop.name}</h3>
          <span className="sop-card__step-count">{sop.steps.length} steps</span>
        </div>
        {isEditing ? (
          <Button variant="primary" onClick={onSave} className="sop-card__save-btn">
            Save
          </Button>
        ) : (
          <Button variant="secondary" onClick={onEdit} className="sop-card__edit-btn">
            Edit sequence
          </Button>
        )}
      </header>

      <div className="sop-card__steps" role="list" aria-label={`${sop.name} steps`}>
        {steps.map((step, index) => (
          <div key={step.id} className="sop-step-container">
            {isEditing ? (
              <div className="sop-step-edit">
                <span className="sop-step-edit__number">{index + 1}</span>
                <input
                  type="text"
                  className="sop-step-edit__input"
                  value={step.name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => onUpdateStep(step.id, e.target.value)}
                  onKeyDown={(e) => onKeyDown(e, step.id)}
                  placeholder="Step name"
                  aria-label={`Step ${index + 1} name`}
                />
                <div className="sop-step-edit__actions">
                  <button
                    type="button"
                    className="sop-step-edit__action-btn"
                    onClick={() => onMoveUp(step.id)}
                    disabled={index === 0}
                    aria-label="Move left"
                    title="Move left"
                  >
                    <Icon name="chevronDown" size={12} strokeWidth={2.5} className="sop-step-edit__icon--up" />
                  </button>
                  <button
                    type="button"
                    className="sop-step-edit__action-btn"
                    onClick={() => onMoveDown(step.id)}
                    disabled={index >= steps.length - 1}
                    aria-label="Move right"
                    title="Move right"
                  >
                    <Icon name="chevronDown" size={12} strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    className="sop-step-edit__action-btn sop-step-edit__action-btn--danger"
                    onClick={() => onRemove(step.id)}
                    disabled={steps.length <= 1}
                    aria-label="Delete step"
                    title="Delete step"
                  >
                    <Icon name="trash" size={11} strokeWidth={2} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="sop-step-pill">
                <span className="sop-step-pill__number">{index + 1}</span>
                <span className="sop-step-pill__name">{step.name}</span>
              </div>
            )}
            {index < steps.length - 1 && (
              <span className="sop-step-arrow" aria-hidden="true">
                <Icon name="chevronDown" size={16} strokeWidth={2.5} className="sop-step-arrow__icon" />
              </span>
            )}
          </div>
        ))}
      </div>

      {isEditing && (
        <div className="sop-card__add-step-row">
          <select
            className="sop-card__add-step-select"
            defaultValue=""
            aria-label="Select step to add"
          >
            <option value="" disabled>Select a step…</option>
            {allKnownSteps.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <button type="button" onClick={onAddStep} className="sop-card__add-step-btn">
            <Icon name="plus" size={14} strokeWidth={2} />
            <span>Add step</span>
          </button>
        </div>
      )}
    </article>
  )
}