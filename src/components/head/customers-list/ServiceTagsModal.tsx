import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '../shared/Icon'
import { editServiceTag } from '../../../api/service-flow.api'
import type { OnboardingCustomer } from './CustomersList'
import './ServiceTagsModal.css'

export interface ServiceTagsModalProps {
  isOpen: boolean
  onClose: () => void
  customer: OnboardingCustomer | null
  serviceType?: string
  onTagsUpdated?: () => void
}

interface TagItem {
  id: string
  name: string
}

interface TagCategory {
  category: string
  pillClass: string
  isSparkle?: boolean
  tags: TagItem[]
}

const ALL_PREDEFINED_CATEGORIES: TagCategory[] = [
  {
    category: 'PENDING FROM DEPARTMENT',
    pillClass: 'stm-tag-pill--dept',
    isSparkle: true,
    tags: [
      { id: 'WEBSITE_DEPARTMENT', name: 'Website Department' },
      { id: 'AUTOMATION_DEPARTMENT', name: 'Automation Department' },
      { id: 'GOOGLE_OPTIMISATION_DEPARTMENT', name: 'Google Optimisation Department' },
      { id: 'SMO_DEPARTMENT', name: 'Smo Department' },
    ],
  },
  {
    category: 'PENDING FROM CLIENT',
    pillClass: 'stm-tag-pill--client',
    tags: [
      { id: 'WEBSITE_CLIENT', name: 'Website Client' },
      { id: 'NUMBER_CLIENT', name: 'Number Client' },
      { id: 'FACEBOOK_CLIENT', name: 'Facebook Client' },
      { id: 'INSTA_ID_CLIENT', name: 'Insta Id Client' },
      { id: 'AUTOMATION_CLIENT', name: 'Automation Client' },
      { id: 'GOOGLE_OPTIMISATION_CLIENT', name: 'Google Optimisation Client' },
      { id: 'SMO_PENDING_CLIENT', name: 'Smo Pending Client' },
      { id: 'ACKNOWLEDGEMENT_PENDING', name: 'Acknowledgement Pending' },
    ],
  },
  {
    category: 'PRIORITY',
    pillClass: 'stm-tag-pill--priority',
    tags: [
      { id: 'URGENT', name: 'Urgent' },
      { id: 'HIGH_PRIORITY', name: 'High Priority' },
      { id: 'LOW_PRIORITY', name: 'Low Priority' },
    ],
  },
  {
    category: 'STATUS',
    pillClass: 'stm-tag-pill--status',
    tags: [
      { id: 'FOLLOW_UP', name: 'Follow Up' },
      { id: 'ON_HOLD', name: 'On Hold' },
      { id: 'ESCALATED', name: 'Escalated' },
      { id: 'APPROVED', name: 'Approved' },
    ],
  },
  {
    category: 'CUSTOMER TYPE',
    pillClass: 'stm-tag-pill--client',
    tags: [
      { id: 'VIP', name: 'Vip' },
      { id: 'NEW_CUSTOMER', name: 'New Customer' },
      { id: 'RETURNING_CUSTOMER', name: 'Returning Customer' },
      { id: 'POTENTIAL_LEAD', name: 'Potential Lead' },
    ],
  },
  {
    category: 'SERVICE SPECIFIC',
    pillClass: 'stm-tag-pill--dept',
    tags: [
      { id: 'WEBSITE_REVIEW', name: 'Website Review' },
      { id: 'SEO_OPTIMIZATION', name: 'Seo Optimization' },
      { id: 'SOCIAL_MEDIA_SETUP', name: 'Social Media Setup' },
      { id: 'AUTOMATION_CONFIG', name: 'Automation Config' },
      { id: 'GOOGLE_ADS', name: 'Google Ads' },
    ],
  },
  {
    category: 'COMMUNICATION',
    pillClass: 'stm-tag-pill--client',
    tags: [
      { id: 'RESPONSIVE', name: 'Responsive' },
      { id: 'SLOW_RESPONSE', name: 'Slow Response' },
      { id: 'NEEDS_CALLBACK', name: 'Needs Callback' },
      { id: 'EMAIL_PREFERRED', name: 'Email Preferred' },
    ],
  },
  {
    category: 'PAYMENT',
    pillClass: 'stm-tag-pill--status',
    tags: [
      { id: 'PAYMENT_PENDING', name: 'Payment Pending' },
      { id: 'PAYMENT_COMPLETED', name: 'Payment Completed' },
      { id: 'PAYMENT_OVERDUE', name: 'Payment Overdue' },
    ],
  },
  {
    category: 'GENERAL',
    pillClass: 'stm-tag-pill--dept',
    tags: [
      { id: 'SATISFIED', name: 'Satisfied' },
      { id: 'DISSATISFIED', name: 'Dissatisfied' },
      { id: 'REFERRAL', name: 'Referral' },
      { id: 'COMPLAINT', name: 'Complaint' },
      { id: 'FEEDBACK', name: 'Feedback' },
    ],
  },
  {
    category: 'SEO',
    pillClass: 'stm-tag-pill--dept',
    tags: [
      { id: 'SEO_PENDING', name: 'Seo Pending' },
    ],
  },
]

interface ActiveTagItem {
  id: string
  name: string
  date?: string
}

function parseActiveTags(raw: any): ActiveTagItem[] {
  if (!raw) return []
  let obj = raw
  if (typeof obj === 'string') {
    try {
      obj = JSON.parse(obj)
    } catch {
      return [{ id: obj, name: obj.replace(/_/g, ' ') }]
    }
  }

  if (Array.isArray(obj)) {
    return obj.map((t, idx) => {
      const tagId = typeof t === 'string' ? t : (t?.id || t?.tagName || t?.name || Object.values(t)[0] || `tag_${idx}`)
      return {
        id: String(tagId),
        name: String(tagId).replace(/_/g, ' '),
      }
    })
  }

  if (typeof obj === 'object' && obj !== null) {
    return Object.entries(obj).map(([k, val]) => {
      const isValTag = typeof val === 'string' && val.trim().length > 0 && !val.includes('{')
      const tagId = isValTag ? String(val) : k
      const dateStr = isValTag ? k : undefined
      return {
        id: tagId,
        name: tagId.replace(/_/g, ' '),
        date: dateStr,
      }
    })
  }

  return []
}

export function ServiceTagsModal({
  isOpen,
  onClose,
  customer,
  serviceType = 'GOOGLE SERVICE',
  onTagsUpdated,
}: ServiceTagsModalProps) {
  const [search, setSearch] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTagLoading, setActiveTagLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Local active tags state for immediate feedback
  const [localTags, setLocalTags] = useState<ActiveTagItem[]>([])

  useEffect(() => {
    if (customer?.serviceTags) {
      setLocalTags(parseActiveTags(customer.serviceTags))
    } else {
      setLocalTags([])
    }
  }, [customer?.serviceTags])

  // Custom Tag Section state
  const [showCustomSection, setShowCustomSection] = useState(false)
  const [customTagName, setCustomTagName] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [customOperation, setCustomOperation] = useState<'add' | 'remove'>('add')

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return ALL_PREDEFINED_CATEGORIES
    const q = search.toLowerCase()
    return ALL_PREDEFINED_CATEGORIES.map((cat) => ({
      ...cat,
      tags: cat.tags.filter(
        (t) => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q),
      ),
    })).filter((cat) => cat.tags.length > 0)
  }, [search])

  if (!isOpen || !customer) return null

  const effectiveServiceType =
    serviceType || customer.serviceType || 'GOOGLE SERVICE'

  async function handleQuickAdd(tag: TagItem) {
    if (!customer) return
    setActiveTagLoading(tag.name)
    setMessage(null)

    try {
      await editServiceTag({
        operation: 'add',
        customerId: customer.id,
        serviceType: effectiveServiceType,
        tagName: tag.id,
        timestamp: new Date().toISOString(),
      })
      setMessage({
        type: 'success',
        text: `Tag "${tag.name}" added successfully!`,
      })
      // Optimistic update
      setLocalTags((prev) => {
        if (prev.some((t) => t.id === tag.id)) return prev
        return [...prev, { id: tag.id, name: tag.name }]
      })
      onTagsUpdated?.()
    } catch (err: any) {
      console.error('Failed to add tag:', err)
      setMessage({
        type: 'error',
        text: err?.message || 'Failed to add service tag.',
      })
    } finally {
      setActiveTagLoading(null)
    }
  }

  async function handleDeleteActiveTag(tagId: string, displayName: string) {
    if (!customer) return
    setIsSubmitting(true)
    setMessage(null)

    try {
      await editServiceTag({
        operation: 'remove',
        customerId: customer.id,
        serviceType: effectiveServiceType,
        tagName: tagId,
        timestamp: new Date().toISOString(),
      })
      setMessage({
        type: 'success',
        text: `Tag "${displayName}" removed successfully!`,
      })
      // Optimistic update
      setLocalTags((prev) => prev.filter((t) => t.id !== tagId))
      onTagsUpdated?.()
    } catch (err: any) {
      console.error('Failed to remove tag:', err)
      setMessage({
        type: 'error',
        text: err?.message || 'Failed to remove service tag.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault()
    const rawTag = customTagName.trim().toUpperCase().replace(/\s+/g, '_')
    if (!rawTag || !customer) return

    setIsSubmitting(true)
    setMessage(null)

    try {
      await editServiceTag({
        operation: customOperation,
        customerId: customer.id,
        serviceType: effectiveServiceType,
        tagName: rawTag,
        description: customDescription.trim() || undefined,
        timestamp: new Date().toISOString(),
      })
      setMessage({
        type: 'success',
        text: `Tag "${rawTag}" ${customOperation === 'add' ? 'added' : 'removed'} successfully!`,
      })
      if (customOperation === 'add') {
        setLocalTags((prev) => {
          if (prev.some((t) => t.id === rawTag)) return prev
          return [...prev, { id: rawTag, name: rawTag.replace(/_/g, ' ') }]
        })
      } else {
        setLocalTags((prev) => prev.filter((t) => t.id !== rawTag))
      }
      setCustomTagName('')
      setCustomDescription('')
      setShowCustomSection(false)
      onTagsUpdated?.()
    } catch (err: any) {
      console.error('Failed to execute tag operation:', err)
      setMessage({
        type: 'error',
        text: err?.message || 'Failed to update custom tag.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="stm-overlay" onClick={onClose} role="presentation">
        <motion.div
          className="stm-modal"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.18 }}
        >
          {/* Header */}
          <div className="stm-header">
            <div className="stm-header-title-row">
              <h2 className="stm-title">Manage Service Tags</h2>
              <span className="stm-case-badge">CASE_INSENSITIVE</span>
            </div>
            <button
              type="button"
              className="stm-close-btn"
              onClick={onClose}
              aria-label="Close"
              title="Close"
            >
              <Icon name="x" size={16} strokeWidth={2.2} />
            </button>
          </div>
          <p className="stm-subtitle">
            Add or remove service tags for <strong>{effectiveServiceType.replace(/_/g, ' ')}</strong>
          </p>

          {/* Alert Message */}
          {message && (
            <div className={`stm-alert stm-alert--${message.type}`}>
              <span>{message.text}</span>
              <button
                type="button"
                className="stm-alert-close"
                onClick={() => setMessage(null)}
              >
                <Icon name="x" size={12} strokeWidth={2} />
              </button>
            </div>
          )}

          {/* Active Tags list */}
          {localTags.length > 0 && (
            <div className="stm-active-tags-section">
              <span className="stm-active-tags-label">Current Tags:</span>
              <div className="stm-active-tags-wrap">
                {localTags.map((t) => (
                  <span key={t.id} className="stm-active-tag-pill" title={t.date ? `Added: ${t.date}` : undefined}>
                    {t.name}
                    <button
                      type="button"
                      className="stm-active-tag-remove"
                      onClick={() => handleDeleteActiveTag(t.id, t.name)}
                      disabled={isSubmitting}
                      title={`Remove tag ${t.name}`}
                    >
                      <Icon name="x" size={11} strokeWidth={2.5} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quick Add Predefined Tags box */}
          {!showCustomSection ? (
            <div className="stm-quick-section">
              <div className="stm-quick-heading">
                <span className="stm-lightning-icon">⚡</span>
                <span className="stm-quick-title">Quick Add Predefined Tags</span>
              </div>

              <div className="stm-quick-box">
                {/* Search bar */}
                <div className="stm-search-wrap">
                  <span className="stm-search-icon">
                    <Icon name="search" size={14} strokeWidth={2} />
                  </span>
                  <input
                    type="text"
                    className="stm-search-input"
                    placeholder="Search predefined tags..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button
                      type="button"
                      className="stm-search-clear"
                      onClick={() => setSearch('')}
                    >
                      <Icon name="x" size={13} strokeWidth={2} />
                    </button>
                  )}
                </div>

                <div className="stm-tags-scroll" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                  {filteredCategories.map((cat) => (
                    <div key={cat.category} className="stm-category-group" style={{ marginBottom: '12px' }}>
                      <h4 className="stm-category-title">
                        {cat.category} {cat.isSparkle && <span className="stm-sparkle">✨</span>}
                      </h4>
                      <div className="stm-tags-pill-list">
                        {cat.tags.map((tag) => {
                          const isLoading = activeTagLoading === tag.name
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              className={`stm-tag-pill ${cat.pillClass} ${
                                isLoading ? 'stm-tag-pill--loading' : ''
                              }`}
                              onClick={() => handleQuickAdd(tag)}
                              disabled={Boolean(activeTagLoading)}
                            >
                              {isLoading ? 'Adding...' : tag.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  {filteredCategories.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '16px', color: '#64748b', fontSize: '0.85rem' }}>
                      No tags found matching "{search}"
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Custom Tag Form */
            <form className="stm-custom-form" onSubmit={handleCustomSubmit}>
              <div className="stm-custom-field">
                <label className="stm-custom-label">
                  Operation <span className="stm-required">*</span>
                </label>
                <div className="stm-custom-op-toggle">
                  <button
                    type="button"
                    className={`stm-op-btn ${customOperation === 'add' ? 'stm-op-btn--active' : ''}`}
                    onClick={() => setCustomOperation('add')}
                  >
                    Add Tag
                  </button>
                  <button
                    type="button"
                    className={`stm-op-btn ${customOperation === 'remove' ? 'stm-op-btn--active-remove' : ''}`}
                    onClick={() => setCustomOperation('remove')}
                  >
                    Remove Tag
                  </button>
                </div>
              </div>

              <div className="stm-custom-field">
                <label htmlFor="custom-tag-name" className="stm-custom-label">
                  Tag Name <span className="stm-required">*</span>
                </label>
                <input
                  id="custom-tag-name"
                  type="text"
                  className="stm-custom-input"
                  placeholder="e.g. CUSTOM_FLAG"
                  value={customTagName}
                  onChange={(e) => setCustomTagName(e.target.value)}
                  required
                />
              </div>

              <div className="stm-custom-field">
                <label htmlFor="custom-tag-desc" className="stm-custom-label">
                  Description <span className="stm-optional">(Optional)</span>
                </label>
                <textarea
                  id="custom-tag-desc"
                  className="stm-custom-textarea"
                  placeholder="Reason or context for this tag..."
                  rows={2}
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                />
              </div>

              <div className="stm-custom-actions">
                <button
                  type="button"
                  className="stm-btn-cancel"
                  onClick={() => setShowCustomSection(false)}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="stm-btn-submit"
                  disabled={isSubmitting || !customTagName.trim()}
                >
                  {isSubmitting
                    ? 'Processing...'
                    : customOperation === 'add'
                      ? 'Add Custom Tag'
                      : 'Remove Tag'}
                </button>
              </div>
            </form>
          )}

          {/* Toggle between Predefined & Custom */}
          <div className="stm-footer-toggle">
            <button
              type="button"
              className="stm-toggle-link"
              onClick={() => {
                setShowCustomSection(!showCustomSection)
                setMessage(null)
              }}
            >
              <Icon name="settings" size={13} strokeWidth={2} />
              <span>
                {showCustomSection ? 'Back to Predefined Tags' : 'Need a custom tag? Click here'}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
