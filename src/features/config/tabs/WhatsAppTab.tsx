import { useState, useEffect } from 'react'
import { MessageSquare, Plus, Trash2, Save, RefreshCw } from 'lucide-react'
import {
  getWhatsAppConfigs,
  saveWhatsAppConfigs,
} from '../../../api/config.api'

interface WhatsAppTabProps {
  onNotify: (msg: string, type?: 'success' | 'error') => void
}

interface FlowOption {
  key: string
  label: string
  placeholder: string
  apiKey: string
}

const FLOW_OPTIONS: FlowOption[] = [
  { key: 'registrationFlow', label: 'Registration Flow ID', placeholder: 'e.g. 1742814359026', apiKey: 'REGISTRATION_FLOW' },
  { key: 'onboardingConfirmationFlow', label: 'Onboarding Confirmation Flow ID', placeholder: 'e.g. 1742814359027', apiKey: 'ONBOARDING_CONFIRMATION_FLOW' },
  { key: 'motivationalPostWelcomeFlow', label: 'Motivational Post Welcome Flow ID', placeholder: 'e.g. 1742814359028', apiKey: 'MOTIVATIONAL_POST_WELCOME_FLOW' },
  { key: 'inputCollectionFlow', label: 'Input Collection Flow ID', placeholder: 'e.g. 1742814359029', apiKey: 'INPUT_COLLECTION_FLOW' },
  { key: 'detailsCollectionReminderFlow', label: 'Details Collection Reminder Flow ID', placeholder: 'e.g. 1742814359030', apiKey: 'DETAILS_COLLECTION_REMINDER_FLOW' },
  { key: 'thankYouFlow', label: 'Thank You Flow ID', placeholder: 'e.g. 1742814359031', apiKey: 'THANK_YOU_FLOW' },
  { key: 'serviceStatusFlow', label: 'Service Status Flow ID', placeholder: 'e.g. 1743436290760', apiKey: 'SERVICE_STATUS_FLOW' },
  { key: 'reviewReplyFlow', label: 'Review Reply Flow ID', placeholder: 'e.g. 1771923672772', apiKey: 'REVIEW_REPLY_FLOW' },
  { key: 'subServiceApprovalFlow', label: 'Sub Service Approval Flow ID', placeholder: 'e.g. 1771923672773', apiKey: 'SUB_SERVICE_APPROVAL' },
  { key: 'serviceDeliveryFlow', label: 'Service Delivery Flow ID', placeholder: 'e.g. 1771923672774', apiKey: 'SERVICE_DELIVERY_FLOW' },
]

interface FlowRow {
  id: string
  typeKey: string
  value: string
}

export function WhatsAppTab({ onNotify }: WhatsAppTabProps) {
  const [rows, setRows] = useState<FlowRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadFlows = async () => {
    setLoading(true)
    try {
      const data = await getWhatsAppConfigs()
      const initialRows: FlowRow[] = []

      FLOW_OPTIONS.forEach((opt, idx) => {
        const val = data[opt.key] || data[opt.apiKey]
        if (val) {
          initialRows.push({
            id: `row-${idx}`,
            typeKey: opt.key,
            value: String(val),
          })
        }
      })

      if (initialRows.length === 0) {
        setRows([
          { id: 'row-0', typeKey: FLOW_OPTIONS[0].key, value: '' },
        ])
      } else {
        setRows(initialRows)
      }
    } catch {
      onNotify('Failed to load WhatsApp configurations', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFlows()
  }, [])

  const handleAddRow = () => {
    // find next unused option
    const usedKeys = new Set(rows.map((r) => r.typeKey))
    const nextUnused = FLOW_OPTIONS.find((opt) => !usedKeys.has(opt.key)) || FLOW_OPTIONS[0]

    setRows([
      ...rows,
      {
        id: `row-${Date.now()}`,
        typeKey: nextUnused.key,
        value: '',
      },
    ])
  }

  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) {
      setRows([{ id: `row-${Date.now()}`, typeKey: FLOW_OPTIONS[0].key, value: '' }])
      return
    }
    setRows(rows.filter((r) => r.id !== id))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload: Record<string, string> = {}
    rows.forEach((row) => {
      if (row.typeKey && row.value.trim()) {
        payload[row.typeKey] = row.value.trim()
        const opt = FLOW_OPTIONS.find((o) => o.key === row.typeKey)
        if (opt) {
          payload[opt.apiKey] = row.value.trim()
        }
      }
    })

    try {
      await saveWhatsAppConfigs(payload)
      onNotify('WhatsApp Flow IDs saved successfully', 'success')
      loadFlows()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save WhatsApp configurations'
      onNotify(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">WhatsApp Flow Configurations</h3>
            <p className="text-xs text-slate-500">
              Link automated WhatsApp bot interactive flow IDs for customer lifecycle messaging
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadFlows}
          disabled={loading}
          className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-600 font-medium">Loading WhatsApp flows...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-3">
              {rows.map((row) => {
                const opt = FLOW_OPTIONS.find((o) => o.key === row.typeKey)
                return (
                  <div
                    key={row.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200"
                  >
                    <div className="w-full sm:w-1/2">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Flow Type</label>
                      <select
                        value={row.typeKey}
                        onChange={(e) =>
                          setRows(rows.map((r) => (r.id === row.id ? { ...r, typeKey: e.target.value } : r)))
                        }
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      >
                        {FLOW_OPTIONS.map((o) => (
                          <option key={o.key} value={o.key}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-full sm:flex-1">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Flow ID</label>
                      <input
                        type="text"
                        placeholder={opt?.placeholder || 'e.g. 1742814359026'}
                        value={row.value}
                        onChange={(e) =>
                          setRows(rows.map((r) => (r.id === row.id ? { ...r, value: e.target.value } : r)))
                        }
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div className="sm:pt-5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Remove Flow"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Another Flow ID
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save Flow Configurations'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
