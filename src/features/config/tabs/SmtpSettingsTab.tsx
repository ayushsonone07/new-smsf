import { useState, useEffect } from 'react'
import {
  Mail,
  Server,
  Lock,
  Plus,
  Trash2,
  Edit,
  Send,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  RefreshCw,
  X,
  ShieldCheck,
} from 'lucide-react'
import {
  getSmtpConfigs,
  createSmtpConfig,
  updateSmtpConfig,
  deleteSmtpConfig,
  testSmtpEmail,
  type SmtpConfigDTO,
} from '../../../api/config.api'

interface SmtpSettingsTabProps {
  onNotify: (msg: string, type?: 'success' | 'error') => void
}

const EMPTY_FORM: SmtpConfigDTO = {
  host: '',
  port: 587,
  username: '',
  password: '',
  fromEmail: '',
  fromName: '',
  authEnabled: true,
  starttlsEnabled: true,
  sslEnabled: false,
  active: true,
}

export function SmtpSettingsTab({ onNotify }: SmtpSettingsTabProps) {
  const [configs, setConfigs] = useState<SmtpConfigDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<SmtpConfigDTO | null>(null)
  const [formData, setFormData] = useState<SmtpConfigDTO>(EMPTY_FORM)
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)

  // Test Email Modal
  const [testModalOpen, setTestModalOpen] = useState(false)
  const [testTargetConfig, setTestTargetConfig] = useState<SmtpConfigDTO | null>(null)
  const [testRecipient, setTestRecipient] = useState('')
  const [testing, setTesting] = useState(false)

  const loadConfigs = async () => {
    setLoading(true)
    try {
      const data = await getSmtpConfigs()
      setConfigs(data)
    } catch {
      onNotify('Failed to load SMTP configurations', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfigs()
  }, [])

  const handleOpenAdd = () => {
    setEditingConfig(null)
    setFormData(EMPTY_FORM)
    setShowPassword(false)
    setModalOpen(true)
  }

  const handleOpenEdit = (config: SmtpConfigDTO) => {
    setEditingConfig(config)
    setFormData({ ...config, password: config.password || '' })
    setShowPassword(false)
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.host || !formData.username || !formData.fromEmail) {
      onNotify('Please fill in all required fields (Host, Username, From Email)', 'error')
      return
    }

    setSaving(true)
    try {
      if (editingConfig) {
        await updateSmtpConfig(formData)
        onNotify('SMTP configuration updated successfully', 'success')
      } else {
        await createSmtpConfig(formData)
        onNotify('SMTP configuration created successfully', 'success')
      }
      setModalOpen(false)
      loadConfigs()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save SMTP configuration'
      onNotify(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id?: number) => {
    if (!id) return
    if (!window.confirm('Are you sure you want to delete this SMTP configuration?')) return
    try {
      await deleteSmtpConfig(id)
      onNotify('SMTP configuration deleted', 'success')
      loadConfigs()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete SMTP configuration'
      onNotify(msg, 'error')
    }
  }

  const handleOpenTest = (config: SmtpConfigDTO) => {
    setTestTargetConfig(config)
    setTestRecipient('')
    setTestModalOpen(true)
  }

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testRecipient || !testTargetConfig) {
      onNotify('Please enter a recipient email address', 'error')
      return
    }
    setTesting(true)
    try {
      await testSmtpEmail(testRecipient, testTargetConfig)
      onNotify(`Test email sent successfully to ${testRecipient}!`, 'success')
      setTestModalOpen(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Test email failed to send'
      onNotify(msg, 'error')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">SMTP Server Configurations</h3>
            <p className="text-xs text-slate-500">Configure outbound email mailers and delivery credentials</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadConfigs}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add SMTP Configuration
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-600 font-medium">Loading SMTP configurations...</p>
        </div>
      ) : configs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Server className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-700">No SMTP Configurations</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            You haven't added any SMTP servers yet. Add your Gmail, SendGrid, or custom mailer to start sending emails.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add First SMTP
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {configs.map((config, idx) => (
            <div
              key={config.id || idx}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      {config.host}:{config.port}
                      {config.active && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          <Check className="w-3 h-3" /> Active
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-500">{config.fromName || config.fromEmail}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenTest(config)}
                    title="Send Test Email"
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(config)}
                    title="Edit Configuration"
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  {config.id && (
                    <button
                      type="button"
                      onClick={() => handleDelete(config.id)}
                      title="Delete Configuration"
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Username</span>
                  <span className="font-medium truncate block">{config.username}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">From Address</span>
                  <span className="font-medium truncate block">{config.fromEmail}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Auth: {config.authEnabled ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  <span>StartTLS: {config.starttlsEnabled ? 'Enabled' : 'Disabled'}</span>
                </div>
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
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {editingConfig ? 'Edit SMTP Configuration' : 'Add SMTP Configuration'}
                  </h3>
                  <p className="text-xs text-slate-500">Provide outbound server connection credentials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SMTP Host <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. smtp.gmail.com"
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Port <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="587"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username / Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@domain.com"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password / App Password {editingConfig && <span className="text-slate-400 font-normal">(Leave blank to keep current)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={formData.password || ''}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 pr-9 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    From Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="noreply@domain.com"
                    value={formData.fromEmail}
                    onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">From Name</label>
                  <input
                    type="text"
                    placeholder="MBG System"
                    value={formData.fromName}
                    onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
                  <span>Enable Authentication</span>
                  <input
                    type="checkbox"
                    checked={formData.authEnabled}
                    onChange={(e) => setFormData({ ...formData, authEnabled: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                </label>
                <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
                  <span>Enable StartTLS</span>
                  <input
                    type="checkbox"
                    checked={formData.starttlsEnabled}
                    onChange={(e) => setFormData({ ...formData, starttlsEnabled: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                </label>
                <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
                  <span>Active Default Configuration</span>
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingConfig ? 'Update Config' : 'Create Config'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test Email Modal */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Send Test Email</h3>
                  <p className="text-xs text-slate-500">
                    Verify connectivity with {testTargetConfig?.host}:{testTargetConfig?.port}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTestModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendTest} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recipient Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="your-email@example.com"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  We will dispatch a sample diagnostic email through this SMTP channel.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTestModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={testing}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {testing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Send Test
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
