import { useState, useEffect } from 'react'
import {
  Webhook as WebhookIcon,
  Plus,
  Trash2,
  Edit,
  RefreshCw,
  X,
  Key,
} from 'lucide-react'
import {
  getWebhooks,
  getWebhookEventTypes,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  type WebhookConfig,
} from '../../../api/config.api'

interface WebhooksTabProps {
  onNotify: (msg: string, type?: 'success' | 'error') => void
}

const EMPTY_WEBHOOK: WebhookConfig = {
  name: '',
  url: '',
  token: '',
  enabled: true,
  eventTypes: [],
}

const maskToken = (t?: string) => (t ? `${t.slice(0, 3)}••••${t.slice(-2)}` : '—')

export function WebhooksTab({ onNotify }: WebhooksTabProps) {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([])
  const [eventTypes, setEventTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null)
  const [formData, setFormData] = useState<WebhookConfig>(EMPTY_WEBHOOK)
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [wList, eList] = await Promise.all([
        getWebhooks(),
        getWebhookEventTypes(),
      ])
      setWebhooks(wList)
      setEventTypes(eList)
    } catch {
      onNotify('Failed to load webhooks', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenAdd = () => {
    setEditingWebhook(null)
    setFormData(EMPTY_WEBHOOK)
    setModalOpen(true)
  }

  const handleOpenEdit = (hook: WebhookConfig) => {
    setEditingWebhook(hook)
    setFormData(hook)
    setModalOpen(true)
  }

  const handleToggleEventType = (ev: string) => {
    const current: string[] = formData.eventTypes || []
    if (current.includes(ev)) {
      setFormData({ ...formData, eventTypes: current.filter((e: string) => e !== ev) })
    } else {
      setFormData({ ...formData, eventTypes: [...current, ev] })
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.url.trim()) {
      onNotify('Name and Destination URL are required', 'error')
      return
    }

    setSaving(true)
    try {
      if (editingWebhook && editingWebhook.id) {
        await updateWebhook(editingWebhook.id, formData)
        onNotify('Webhook updated successfully', 'success')
      } else {
        await createWebhook(formData)
        onNotify('Webhook registered successfully', 'success')
      }
      setModalOpen(false)
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save webhook'
      onNotify(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id?: string) => {
    if (!id) return
    if (!window.confirm('Delete this webhook endpoint?')) return
    try {
      await deleteWebhook(id)
      onNotify('Webhook deleted', 'success')
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete webhook'
      onNotify(msg, 'error')
    }
  }

  const handleToggleEnabled = async (hook: WebhookConfig) => {
    if (!hook.id) return
    const updated = { ...hook, enabled: !hook.enabled }
    try {
      await updateWebhook(hook.id, updated)
      setWebhooks(webhooks.map((w) => (w.id === hook.id ? updated : w)))
      onNotify(`Webhook ${updated.enabled ? 'Enabled' : 'Disabled'}`, 'success')
    } catch {
      onNotify('Failed to toggle webhook status', 'error')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-600">
            <WebhookIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Event Webhook Dispatchers</h3>
            <p className="text-xs text-slate-500">
              Subscribe external applications and automation servers to real-time CRM events
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Webhook
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-600 font-medium">Loading webhook endpoints...</p>
        </div>
      ) : webhooks.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <WebhookIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-700">No Webhooks Configured</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Connect Zapier, Make, Pabbly, or custom backend services to receive instant event pings.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Webhook
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {webhooks.map((hook, idx) => (
            <div
              key={hook.id || idx}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        hook.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    />
                    <h4 className="text-sm font-bold text-slate-800">{hook.name}</h4>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(hook)}
                      className="p-1 text-slate-400 hover:text-violet-600 rounded-lg hover:bg-violet-50"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {hook.id && (
                      <button
                        type="button"
                        onClick={() => handleDelete(hook.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs font-mono text-slate-600 truncate mb-3">
                  <span className="text-slate-400 select-none">POST </span>
                  {hook.url}
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {hook.eventTypes && hook.eventTypes.length > 0 ? (
                    hook.eventTypes.map((ev: string) => (
                      <span
                        key={ev}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-100"
                      >
                        {ev}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">No events subscribed</span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                  <Key className="w-3 h-3" />
                  <span>Token: {maskToken(hook.token)}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleEnabled(hook)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${
                    hook.enabled
                      ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  {hook.enabled ? 'Active' : 'Disabled'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                  <WebhookIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {editingWebhook ? 'Edit Webhook Endpoint' : 'Register New Webhook'}
                  </h3>
                  <p className="text-xs text-slate-500">Configure URL receiver and event triggers</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Webhook Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Slack Operations Alert"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Destination URL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bearer / Secret Token <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="whsec_..."
                  value={formData.token || ''}
                  onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Subscribed Event Topics
                </label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-48 overflow-y-auto">
                  {eventTypes.map((ev) => {
                    const checked = (formData.eventTypes || []).includes(ev)
                    return (
                      <label
                        key={ev}
                        className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleEventType(ev)}
                          className="rounded border-slate-300 text-violet-600 focus:ring-violet-500 h-3.5 w-3.5"
                        />
                        <span className="truncate">{ev}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
                  <span>Enable Webhook Deliveries</span>
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="rounded border-slate-300 text-violet-600 focus:ring-violet-500 h-4 w-4"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingWebhook ? 'Update Webhook' : 'Register Webhook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
