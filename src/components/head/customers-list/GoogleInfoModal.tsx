import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '../shared/Icon'
import {
  getDepartmentSpecialData,
  updateDepartmentSpecialData,
  type DepartmentSpecialServiceDataDTO,
} from '../../../api/service-flow.api'
import type { OnboardingCustomer } from './CustomersList'
import { RefreshButton } from '../../ui/RefreshButton'

export interface GoogleInfoModalProps {
  customer: OnboardingCustomer | null
  isOpen: boolean
  onClose: () => void
}

const toRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  if (value === undefined || value === null) return {}
  return { value }
}

export function GoogleInfoModal({
  customer,
  isOpen,
  onClose,
}: GoogleInfoModalProps) {
  const [data, setData] = useState<DepartmentSpecialServiceDataDTO | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [draftValues, setDraftValues] = useState<Record<string, Record<string, string>>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (!isOpen || !customer) {
      setData(null)
      setError(null)
      setIsLoading(false)
      setEditingCategory(null)
      setDraftValues({})
      return
    }

    let isCancelled = false
    setIsLoading(true)
    setError(null)

    getDepartmentSpecialData(customer.id, 'GOOGLE_DEPARTMENT')
      .then((res) => {
        if (isCancelled) return
        setData(res)
      })
      .catch((err: any) => {
        if (isCancelled) return
        console.error('Failed to load Google Info special data:', err)
        setError(err?.message || 'Failed to fetch Google Info data.')
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [isOpen, customer])

  // ESC to close
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, isSaving, onClose])

  const categories = useMemo(() => {
    const special = data?.specialServiceData
    if (!special || typeof special !== 'object') return []
    return Object.keys(special).sort((a, b) => a.localeCompare(b))
  }, [data])

  const startEdit = (category: string) => {
    if (!data?.specialServiceData) return
    const val = data.specialServiceData[category]
    const record = toRecord(val)
    const mapped = Object.fromEntries(
      Object.entries(record).map(([k, v]) => [
        k,
        typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v),
      ]),
    )
    setDraftValues((prev) => ({ ...prev, [category]: mapped }))
    setEditingCategory(category)
  }

  // Refresh icon: re-reads the special data while keeping the current view (and any open edit draft) on screen.
  const refreshData = async () => {
    if (!customer) return
    setIsRefreshing(true)
    try {
      const res = await getDepartmentSpecialData(customer.id, 'GOOGLE_DEPARTMENT')
      setData(res)
      setError(null)
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Failed to reload.')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSave = async (category: string) => {
    if (!customer) return
    setIsSaving(true)
    try {
      const payload = draftValues[category] ?? {}
      await updateDepartmentSpecialData(customer.id, payload, 'GOOGLE_DEPARTMENT')
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          specialServiceData: {
            ...prev.specialServiceData,
            [category]: payload,
          },
        }
      })
      setEditingCategory(null)
    } catch (err: any) {
      console.error('Failed to save category:', err)
      alert(err?.message || 'Failed to update Google Info.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen || !customer) return null

  return (
    <AnimatePresence>
      <div className="cl-sf-overlay" onClick={onClose} role="presentation">
        <motion.div
          className="cl-sf-modal cl-gi-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Google Info"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.18 }}
        >
          {/* Header */}
          <div className="cl-sf-header">
            <div className="cl-sf-header-info">
              <div className="cl-sf-header-title-row">
                <span className="cl-gi-badge-tag">Google Info</span>
                <h2 className="cl-sf-title">{customer.businessName}</h2>
              </div>
              <p className="cl-sf-subtitle">
                Department special service configuration & requirements
              </p>
            </div>
            <div className="flex items-center gap-1">
              <RefreshButton
                onRefresh={refreshData}
                isRefreshing={isLoading || isRefreshing}
                label="Google Info"
              />
              <button
                type="button"
                className="cl-sf-close-btn"
                onClick={onClose}
                aria-label="Close modal"
                title="Close"
                disabled={isSaving}
              >
                <Icon name="x" size={16} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div
            className={`cl-sf-body transition-opacity ${isRefreshing ? 'pointer-events-none opacity-60' : ''}`}
            aria-busy={isLoading || isRefreshing}
          >
            {isLoading && (
              <div className="cl-sf-loading">
                <div className="cl-sf-spinner" />
                <p>Loading Google Info...</p>
              </div>
            )}

            {!isLoading && error && (
              <div className="cl-sf-error">
                <Icon name="alert" size={24} strokeWidth={2} />
                <p>{error}</p>
                <button
                  type="button"
                  className="cl-sf-retry-btn"
                  onClick={() => {
                    setIsLoading(true)
                    setError(null)
                    getDepartmentSpecialData(customer.id, 'GOOGLE_DEPARTMENT')
                      .then((res) => setData(res))
                      .catch((err) => setError(err?.message || 'Failed to reload.'))
                      .finally(() => setIsLoading(false))
                  }}
                >
                  Retry
                </button>
              </div>
            )}

            {!isLoading && !error && (
              <>
                {/* Meta Cards */}
                <div className="cl-gi-meta-grid">
                  <div className="cl-gi-meta-card">
                    <span className="cl-gi-meta-label">Service Type</span>
                    <span className="cl-gi-meta-val cl-gi-meta-val--highlight">
                      {data?.serviceType || 'GOOGLE_SERVICE'}
                    </span>
                  </div>
                  <div className="cl-gi-meta-card">
                    <span className="cl-gi-meta-label">Last Updated</span>
                    <span className="cl-gi-meta-val">
                      {data?.updatedAt
                        ? new Date(data.updatedAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Categories */}
                {categories.length === 0 ? (
                  <div className="cl-sf-empty">
                    <Icon name="help" size={28} strokeWidth={1.5} />
                    <p>No special service categories found for this customer.</p>
                  </div>
                ) : (
                  <div className="cl-gi-categories-list">
                    {categories.map((category) => {
                      const value = data?.specialServiceData?.[category]
                      const isEditing = editingCategory === category
                      const record = toRecord(value)
                      const entries = Object.entries(record).sort(([a], [b]) => a.localeCompare(b))
                      const draft = draftValues[category] ?? {}

                      return (
                        <div key={category} className="cl-gi-cat-card">
                          <div className="cl-gi-cat-head">
                            <div className="cl-gi-cat-title-row">
                              <span className="cl-gi-cat-dot" />
                              <h3 className="cl-gi-cat-title">{category}</h3>
                            </div>
                            {!isEditing ? (
                              <button
                                type="button"
                                className="cl-gi-edit-btn"
                                onClick={() => startEdit(category)}
                              >
                                <Icon name="pencil" size={12} strokeWidth={2} />
                                <span>Edit</span>
                              </button>
                            ) : (
                              <div className="cl-gi-edit-actions">
                                <button
                                  type="button"
                                  className="cl-gi-cancel-btn"
                                  onClick={() => setEditingCategory(null)}
                                  disabled={isSaving}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="cl-gi-save-btn"
                                  onClick={() => handleSave(category)}
                                  disabled={isSaving}
                                >
                                  {isSaving ? 'Saving...' : 'Save'}
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="cl-gi-cat-content">
                            {!isEditing ? (
                              entries.length === 0 ? (
                                <p className="cl-gi-cat-empty">No fields in this category.</p>
                              ) : (
                                <div className="cl-gi-fields-grid">
                                  {entries.map(([fKey, fVal]) => (
                                    <div key={fKey} className="cl-gi-field-item">
                                      <span className="cl-gi-field-label">{fKey}</span>
                                      <span className="cl-gi-field-val">
                                        {String(fVal ?? '—')}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )
                            ) : (
                              <div className="cl-gi-edit-fields">
                                {entries.map(([fKey]) => (
                                  <div key={fKey} className="cl-gi-edit-row">
                                    <label className="cl-gi-edit-label">{fKey}</label>
                                    <input
                                      type="text"
                                      className="cl-gi-edit-input"
                                      value={draft[fKey] ?? ''}
                                      onChange={(e) =>
                                        setDraftValues((prev) => ({
                                          ...prev,
                                          [category]: {
                                            ...(prev[category] ?? {}),
                                            [fKey]: e.target.value,
                                          },
                                        }))
                                      }
                                      disabled={isSaving}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="cl-sf-footer">
            <button
              type="button"
              className="cl-sf-close-footer-btn"
              onClick={onClose}
              disabled={isSaving}
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

