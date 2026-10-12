import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '../../../../components/head/shared/Icon'
import {
  updateServiceFlow,
  updateDepartmentConfig,
  type ServiceFlowItem,
  type DepartmentConfigData,
} from '../../../../api/service-flow.api'
import './FlowBuilderModal.css'

export interface FlowStep {
  stepName: string
  order: number
  createdAt: string
  updatedAt: string
}

export interface GenericModalConfig {
  title: string
  description: string
  type: 'TEXT' | 'DROPDOWN'
  category: string
  options?: { label: string; value: string }[]
  placeholder?: string
  stepName?: string
}

export interface FlowBuilderModalProps {
  isOpen: boolean
  onClose: () => void
  flow: ServiceFlowItem | null
  departmentType: string
  departmentConfig?: DepartmentConfigData | null
  onSuccess?: () => void
}

const UP_ARROW_ICON = 'M12 19V5M5 12l7-7 7 7'
const DOWN_ARROW_ICON = 'M12 5v14M19 12l-7 7-7-7'
const PENCIL_ICON = 'M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z'
const TRASH_ICON = 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'
const PLUS_ICON = 'M12 5v14M5 12h14'
const CHECK_ICON = 'M20 6 9 17l-5-5'
const X_ICON = 'M18 6 6 18M6 6l12 12'
const CHEVRON_DOWN_ICON = 'm6 9 6 6 6-6'
const CHEVRON_UP_ICON = 'm18 15-6-6-6 6'
const WORKFLOW_ICON = 'M6 3v6m0 0a3 3 0 1 0 3 3V9a3 3 0 0 0-3-3Zm12 6v6m0 0a3 3 0 1 0 3 3v-6a3 3 0 0 0-3-3ZM6 9h12'

const STEP_COLORS = [
  '#2563eb', // blue
  '#8b5cf6', // purple
  '#3b82f6', // indigo
  '#0d9488', // teal
  '#7c3aed', // violet
  '#0284c7', // sky
  '#6366f1', // indigo-light
  '#2563eb',
  '#0d9488',
  '#7c3aed',
]

export function FlowBuilderModal({
  isOpen,
  onClose,
  flow,
  departmentType,
  departmentConfig,
  onSuccess,
}: FlowBuilderModalProps) {
  const [activeTab, setActiveTab] = useState<'flow' | 'configs'>('flow')
  const [flowSteps, setFlowSteps] = useState<FlowStep[]>([])
  const [newStepName, setNewStepName] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Sub-service configurations
  const [localConfigs, setLocalConfigs] = useState<Record<string, GenericModalConfig>>({})
  const [isConfigsCollapsed, setIsConfigsCollapsed] = useState(false)
  const [collapsedItems, setCollapsedItems] = useState<Record<string, boolean>>({})

  // Initialize flow steps and configs whenever dialog opens with a flow
  useEffect(() => {
    if (!isOpen || !flow) {
      setFlowSteps([])
      setEditingIndex(null)
      setEditingName('')
      setNewStepName('')
      setFeedback(null)
      setIsSaving(false)
      setActiveTab('flow')
      return
    }

    const steps: FlowStep[] = Object.entries(flow.serviceFlow ?? {})
      .map(([stepName, data]) => ({
        stepName,
        order: data.order ?? 1,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      }))
      .sort((a, b) => a.order - b.order)

    setFlowSteps(steps)

    // Load configs from departmentConfig
    if (departmentConfig?.configsJson && typeof departmentConfig.configsJson === 'string') {
      try {
        const parsed = JSON.parse(departmentConfig.configsJson)
        setLocalConfigs(parsed || {})
      } catch (err) {
        console.error('Failed to parse configsJson', err)
        setLocalConfigs({})
      }
    } else {
      setLocalConfigs({})
    }
  }, [isOpen, flow, departmentConfig])

  // ESC to close
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !flow) return null

  // ── Step Reordering & Editing Handlers ──
  const handleAddStep = () => {
    const trimmed = newStepName.trim()
    if (!trimmed) {
      setFeedback({ message: 'Please enter a step name.', type: 'error' })
      return
    }

    if (flowSteps.some((s) => s.stepName.toLowerCase() === trimmed.toLowerCase())) {
      setFeedback({ message: 'A step with this name already exists.', type: 'error' })
      return
    }

    const newStep: FlowStep = {
      stepName: trimmed,
      order: flowSteps.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setFlowSteps([...flowSteps, newStep])
    setNewStepName('')
    setFeedback({ message: `"${trimmed}" step added.`, type: 'success' })
  }

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= flowSteps.length) return

    const updated = [...flowSteps]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp

    const reordered = updated.map((step, idx) => ({
      ...step,
      order: idx + 1,
      updatedAt: new Date().toISOString(),
    }))

    setFlowSteps(reordered)
  }

  const handleStartEdit = (index: number) => {
    setEditingIndex(index)
    setEditingName(flowSteps[index].stepName)
  }

  const handleSaveEdit = () => {
    if (editingIndex === null) return
    const trimmed = editingName.trim()
    if (!trimmed) {
      setFeedback({ message: 'Step name cannot be empty.', type: 'error' })
      return
    }

    if (
      flowSteps.some(
        (s, idx) => idx !== editingIndex && s.stepName.toLowerCase() === trimmed.toLowerCase(),
      )
    ) {
      setFeedback({ message: 'Another step already has this name.', type: 'error' })
      return
    }

    const updated = flowSteps.map((step, idx) =>
      idx === editingIndex
        ? { ...step, stepName: trimmed, updatedAt: new Date().toISOString() }
        : step,
    )

    setFlowSteps(updated)
    setEditingIndex(null)
    setEditingName('')
  }

  const handleDeleteStep = (index: number) => {
    const deletedName = flowSteps[index]?.stepName
    const updated = flowSteps.filter((_, idx) => idx !== index)
    const reordered = updated.map((step, idx) => ({
      ...step,
      order: idx + 1,
      updatedAt: new Date().toISOString(),
    }))

    setFlowSteps(reordered)
    setFeedback({ message: `"${deletedName}" removed.`, type: 'success' })
  }

  // ── Sub-Service Configurations Handlers ──
  const handleAddConfig = () => {
    const defaultStep = flowSteps[0]?.stepName || ''
    const uniqueId = `conf_${Date.now()}`
    setLocalConfigs((prev) => ({
      ...prev,
      [uniqueId]: {
        title: 'New Config',
        description: 'Enter description',
        type: 'TEXT',
        category: 'NEW_CATEGORY',
        placeholder: 'Enter value',
        stepName: defaultStep,
      },
    }))
  }

  const handleRemoveConfig = (key: string) => {
    setLocalConfigs((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleUpdateConfig = (key: string, patch: Partial<GenericModalConfig>) => {
    setLocalConfigs((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }))
  }

  // ── Save All Changes ──
  const handleSaveAll = async () => {
    setIsSaving(true)
    setFeedback(null)

    const flowMap: Record<string, { order: number; createdAt?: string; updatedAt?: string }> = {}
    flowSteps.forEach((step, idx) => {
      flowMap[step.stepName] = {
        order: idx + 1,
        createdAt: step.createdAt,
        updatedAt: new Date().toISOString(),
      }
    })

    try {
      // 1. Update Service Flow
      await updateServiceFlow(flow.departmentServiceId, { flow: flowMap })

      // 2. Update Department Config
      await updateDepartmentConfig(departmentType, {
        triggersJson:
          typeof departmentConfig?.triggersJson === 'string'
            ? departmentConfig.triggersJson
            : '[]',
        configsJson: JSON.stringify(localConfigs),
      })

      setFeedback({ message: 'Workflow and configurations saved successfully!', type: 'success' })
      onSuccess?.()
      setTimeout(() => {
        onClose()
      }, 700)
    } catch (err: any) {
      console.error('Failed to save service flow and config', err)
      setFeedback({
        message: err?.message || 'Failed to save workflow changes. Please try again.',
        type: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fb-overlay" onClick={onClose} role="presentation">
        <motion.div
          className="fb-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Flow Builder"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.96, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 14 }}
          transition={{ duration: 0.18 }}
        >
          {/* Header */}
          <div className="fb-header">
            <div className="fb-header-left">
              <div className="fb-header-icon">
                <Icon name="flow" d={WORKFLOW_ICON} size={20} strokeWidth={2.2} />
              </div>
              <div className="fb-header-titles">
                <div className="fb-header-title-row">
                  <h2 className="fb-title">{flow.departmentServiceName}</h2>
                  <span className="fb-tag">FLOW BUILDER</span>
                </div>
                <p className="fb-subtitle">
                  Design your workflow by adding, editing, and reordering steps
                </p>
              </div>
            </div>
            <button
              type="button"
              className="fb-close-btn"
              onClick={onClose}
              title="Close modal"
              aria-label="Close"
            >
              <Icon name="x" d={X_ICON} size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div className={`fb-feedback fb-feedback--${feedback.type}`}>
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Tabs Navigation */}
          <div className="fb-tabs-bar">
            <button
              type="button"
              className={`fb-tab-btn ${activeTab === 'flow' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('flow')}
            >
              Flow Sequence
            </button>
            <button
              type="button"
              className={`fb-tab-btn ${activeTab === 'configs' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('configs')}
            >
              Sub-Service Configurations
            </button>
          </div>

          {/* Body */}
          <div className="fb-body">
            {activeTab === 'flow' && (
              <div className="fb-flow-tab">
                {/* Add new step section */}
                <div className="fb-add-box">
                  <span className="fb-add-label">+ ADD NEW STEP</span>
                  <div className="fb-add-input-row">
                    <input
                      type="text"
                      className="fb-input"
                      placeholder="Enter step name (e.g., Logo Design)"
                      value={newStepName}
                      onChange={(e) => setNewStepName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddStep()}
                    />
                    <button type="button" className="fb-add-btn" onClick={handleAddStep}>
                      Add Step
                    </button>
                  </div>
                </div>

                {/* Workflow steps list */}
                <div className="fb-list-section">
                  <div className="fb-list-header">
                    <span className="fb-list-title">WORKFLOW ORDER</span>
                    <span className="fb-list-count">{flowSteps.length} Steps</span>
                  </div>

                  {flowSteps.length === 0 ? (
                    <div className="fb-empty">
                      <p>No steps configured yet. Use the form above to add steps.</p>
                    </div>
                  ) : (
                    <div className="fb-steps-list">
                      {flowSteps.map((step, idx) => {
                        const isEditingThis = editingIndex === idx
                        const color = STEP_COLORS[idx % STEP_COLORS.length]

                        return (
                          <div
                            key={`${step.stepName}-${idx}`}
                            className={`fb-step-item ${isEditingThis ? 'is-editing' : ''}`}
                          >
                            <span className="fb-step-badge" style={{ background: color }}>
                              {idx + 1}
                            </span>

                            {isEditingThis ? (
                              <div className="fb-step-edit-form">
                                <input
                                  type="text"
                                  className="fb-step-edit-input"
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEdit()
                                    if (e.key === 'Escape') setEditingIndex(null)
                                  }}
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  className="fb-icon-action fb-icon-action--confirm"
                                  onClick={handleSaveEdit}
                                  title="Confirm edit"
                                >
                                  <Icon name="check" d={CHECK_ICON} size={14} strokeWidth={2.5} />
                                </button>
                                <button
                                  type="button"
                                  className="fb-icon-action fb-icon-action--cancel"
                                  onClick={() => setEditingIndex(null)}
                                  title="Cancel edit"
                                >
                                  <Icon name="x" d={X_ICON} size={14} strokeWidth={2.5} />
                                </button>
                              </div>
                            ) : (
                              <span className="fb-step-name">{step.stepName}</span>
                            )}

                            {!isEditingThis && (
                              <div className="fb-step-actions">
                                <button
                                  type="button"
                                  className="fb-icon-action"
                                  onClick={() => handleMoveStep(idx, 'up')}
                                  disabled={idx === 0}
                                  title="Move up"
                                >
                                  <Icon name="chevronDown" d={UP_ARROW_ICON} size={13} strokeWidth={2} />
                                </button>
                                <button
                                  type="button"
                                  className="fb-icon-action"
                                  onClick={() => handleMoveStep(idx, 'down')}
                                  disabled={idx === flowSteps.length - 1}
                                  title="Move down"
                                >
                                  <Icon
                                    name="chevronDown"
                                    d={DOWN_ARROW_ICON}
                                    size={13}
                                    strokeWidth={2}
                                  />
                                </button>
                                <span className="fb-actions-sep" />
                                <button
                                  type="button"
                                  className="fb-icon-action"
                                  onClick={() => handleStartEdit(idx)}
                                  title="Edit step name"
                                >
                                  <Icon name="pencil" d={PENCIL_ICON} size={13} strokeWidth={2} />
                                </button>
                                <button
                                  type="button"
                                  className="fb-icon-action fb-icon-action--delete"
                                  onClick={() => handleDeleteStep(idx)}
                                  title="Delete step"
                                >
                                  <Icon name="trash" d={TRASH_ICON} size={13} strokeWidth={2} />
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'configs' && (
              <div className="fb-configs-tab">
                {/* Header card */}
                <div className="fb-configs-top-card">
                  <div className="fb-configs-top-left">
                    <button
                      type="button"
                      className="fb-collapse-icon-btn"
                      onClick={() => setIsConfigsCollapsed(!isConfigsCollapsed)}
                    >
                      <Icon
                        name="chevronDown"
                        d={isConfigsCollapsed ? CHEVRON_DOWN_ICON : CHEVRON_UP_ICON}
                        size={16}
                        strokeWidth={2}
                      />
                    </button>
                    <div>
                      <h3 className="fb-configs-top-title">SUB-SERVICE OPTIONS</h3>
                      <p className="fb-configs-top-sub">
                        {isConfigsCollapsed
                          ? `${Object.keys(localConfigs).length} configurations collapsed`
                          : 'Define custom inputs for flow steps'}
                      </p>
                    </div>
                  </div>
                  <div className="fb-configs-top-actions">
                    {!isConfigsCollapsed && (
                      <button
                        type="button"
                        className="fb-add-config-btn"
                        onClick={handleAddConfig}
                      >
                        <Icon name="plus" d={PLUS_ICON} size={12} strokeWidth={2.5} />
                        Add Config
                      </button>
                    )}
                    <button
                      type="button"
                      className="fb-collapse-toggle-btn"
                      onClick={() => setIsConfigsCollapsed(!isConfigsCollapsed)}
                    >
                      {isConfigsCollapsed ? 'EXPAND ALL' : 'COLLAPSE SECTION'}
                    </button>
                  </div>
                </div>

                {/* Configurations list */}
                {!isConfigsCollapsed && (
                  <div className="fb-configs-list">
                    {Object.keys(localConfigs).length === 0 ? (
                      <div className="fb-empty">
                        <p>No sub-service configurations added yet. Click &ldquo;+ Add Config&rdquo; above.</p>
                      </div>
                    ) : (
                      Object.entries(localConfigs).map(([key, cfg]) => {
                        const isItemCollapsed = collapsedItems[key]

                        return (
                          <div key={key} className="fb-config-card">
                            <div className="fb-config-card-head">
                              <div className="fb-config-card-head-left">
                                <button
                                  type="button"
                                  className="fb-config-collapse-btn"
                                  onClick={() =>
                                    setCollapsedItems((prev) => ({
                                      ...prev,
                                      [key]: !prev[key],
                                    }))
                                  }
                                >
                                  <Icon
                                    name="chevronDown"
                                    d={isItemCollapsed ? CHEVRON_DOWN_ICON : CHEVRON_UP_ICON}
                                    size={14}
                                    strokeWidth={2}
                                  />
                                </button>
                                <span className="fb-target-step-label">TARGET STEP:</span>
                                <select
                                  className="fb-target-select"
                                  value={cfg.stepName || ''}
                                  onChange={(e) =>
                                    handleUpdateConfig(key, { stepName: e.target.value })
                                  }
                                >
                                  <option value="">Select Step</option>
                                  {flowSteps.map((s) => (
                                    <option key={s.stepName} value={s.stepName}>
                                      {s.stepName}
                                    </option>
                                  ))}
                                </select>
                                {isItemCollapsed && cfg.title && (
                                  <span className="fb-collapsed-badge">{cfg.title}</span>
                                )}
                              </div>
                              <button
                                type="button"
                                className="fb-icon-action fb-icon-action--delete"
                                onClick={() => handleRemoveConfig(key)}
                                title="Remove configuration"
                              >
                                <Icon name="trash" d={TRASH_ICON} size={14} strokeWidth={2} />
                              </button>
                            </div>

                            {!isItemCollapsed && (
                              <div className="fb-config-card-body">
                                <div className="fb-field-group">
                                  <label className="fb-field-label">DISPLAY LABEL</label>
                                  <input
                                    type="text"
                                    className="fb-input"
                                    placeholder="e.g. Select Status"
                                    value={cfg.title || ''}
                                    onChange={(e) => {
                                      const newTitle = e.target.value
                                      const newCategory = newTitle
                                        .toUpperCase()
                                        .replace(/\s+/g, '_')
                                        .replace(/[^A-Z0-9_]/g, '')
                                      handleUpdateConfig(key, {
                                        title: newTitle,
                                        category: newCategory,
                                      })
                                    }}
                                  />
                                </div>

                                <div className="fb-field-group">
                                  <label className="fb-field-label">DESCRIPTION</label>
                                  <input
                                    type="text"
                                    className="fb-input"
                                    placeholder="Description"
                                    value={cfg.description || ''}
                                    onChange={(e) =>
                                      handleUpdateConfig(key, { description: e.target.value })
                                    }
                                  />
                                </div>

                                <div className="fb-field-group">
                                  <label className="fb-field-label">INPUT TYPE</label>
                                  <select
                                    className="fb-select"
                                    value={cfg.type || 'TEXT'}
                                    onChange={(e) =>
                                      handleUpdateConfig(key, {
                                        type: e.target.value as 'TEXT' | 'DROPDOWN',
                                      })
                                    }
                                  >
                                    <option value="TEXT">Simple Text</option>
                                    <option value="DROPDOWN">Dropdown List</option>
                                  </select>
                                </div>

                                {cfg.type === 'DROPDOWN' && (
                                  <div className="fb-dropdown-options-box">
                                    <div className="fb-options-head">
                                      <span className="fb-field-label">DROPDOWN OPTIONS</span>
                                      <button
                                        type="button"
                                        className="fb-add-opt-btn"
                                        onClick={() => {
                                          const opts = cfg.options || []
                                          handleUpdateConfig(key, {
                                            options: [...opts, { label: '', value: '' }],
                                          })
                                        }}
                                      >
                                        <Icon name="plus" d={PLUS_ICON} size={11} strokeWidth={2} />
                                        Add Option
                                      </button>
                                    </div>

                                    {(!cfg.options || cfg.options.length === 0) && (
                                      <p className="fb-empty-opts">No options added yet.</p>
                                    )}

                                    {cfg.options?.map((opt, optIdx) => (
                                      <div key={optIdx} className="fb-option-row">
                                        <input
                                          type="text"
                                          className="fb-input fb-input--sm"
                                          placeholder="e.g. Completed"
                                          value={opt.label}
                                          onChange={(e) => {
                                            const newVal = e.target.value
                                            const updated = [...(cfg.options || [])]
                                            updated[optIdx] = { label: newVal, value: newVal }
                                            handleUpdateConfig(key, { options: updated })
                                          }}
                                        />
                                        <button
                                          type="button"
                                          className="fb-icon-action fb-icon-action--delete"
                                          onClick={() => {
                                            const updated = (cfg.options || []).filter(
                                              (_, i) => i !== optIdx,
                                            )
                                            handleUpdateConfig(key, { options: updated })
                                          }}
                                        >
                                          <Icon
                                            name="trash"
                                            d={TRASH_ICON}
                                            size={13}
                                            strokeWidth={2}
                                          />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="fb-footer">
            <button
              type="button"
              className="fb-cancel-btn"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="fb-save-btn"
              onClick={handleSaveAll}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="fb-spinner" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Icon name="check" d={CHECK_ICON} size={14} strokeWidth={2.5} />
                  Save All Changes
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
