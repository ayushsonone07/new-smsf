import { useState, useEffect, useRef } from 'react'
import { Send, Eye, EyeOff, Save, Mail, CheckCircle2 } from 'lucide-react'
import {
  getHrmSmtpConfig,
  saveHrmSmtpConfig,
  testHrmSmtpEmail,
  type HrmSmtpConfig,
} from '../../../api/config.api'
import { RefreshButton } from '../../../components/ui/RefreshButton'

interface HrmSmtpTabProps {
  onNotify: (msg: string, type?: 'success' | 'error') => void
}

const DEFAULT_HRM_SMTP: HrmSmtpConfig = {
  host: 'smtp.gmail.com',
  port: 587,
  username: '',
  password: '',
  fromEmail: '',
  fromName: 'HRM System',
  authEnabled: true,
  starttlsEnabled: true,
  active: true,
}

export function HrmSmtpTab({ onNotify }: HrmSmtpTabProps) {
  const [formData, setFormData] = useState<HrmSmtpConfig>(DEFAULT_HRM_SMTP)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  // Bumped by the refresh button to re-run the config load below.
  const [reloadKey, setReloadKey] = useState(0)
  // Last config loaded from the server, used to warn before a refresh discards unsaved edits.
  const loadedConfigRef = useRef(JSON.stringify(DEFAULT_HRM_SMTP))

  // Test modal/input
  const [testEmail, setTestEmail] = useState('')
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    let cancelled = false
    getHrmSmtpConfig().then((cfg: HrmSmtpConfig | null) => {
      if (!cancelled) {
        // Re-sync the form with the server (falls back to defaults when nothing is saved).
        const next = { ...DEFAULT_HRM_SMTP, ...(cfg ?? {}) }
        loadedConfigRef.current = JSON.stringify(next)
        setFormData(next)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const handleRefresh = () => {
    if (
      JSON.stringify(formData) !== loadedConfigRef.current &&
      !window.confirm('Discard your unsaved HRM SMTP changes and reload from the server?')
    ) {
      return
    }
    setLoading(true)
    setReloadKey((key) => key + 1)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await saveHrmSmtpConfig(formData)
      loadedConfigRef.current = JSON.stringify(formData)
      onNotify('HRM SMTP settings saved successfully', 'success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save HRM SMTP configuration'
      onNotify(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testEmail) {
      onNotify('Please enter a recipient email address for testing', 'error')
      return
    }
    setTesting(true)
    try {
      await testHrmSmtpEmail(testEmail)
      onNotify(`Test email dispatched to ${testEmail}!`, 'success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send test email'
      onNotify(msg, 'error')
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-600 font-medium">Loading HRM SMTP configuration...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">HRM Mailer Configuration</h3>
            <p className="text-xs text-slate-500">
              Manage outgoing SMTP mail relay for HRM notifications, payslips, and attendance alerts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton
            onRefresh={handleRefresh}
            isRefreshing={loading}
            label="HRM SMTP configuration"
          />
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
            <CheckCircle2 className="w-3.5 h-3.5" /> HRM Module
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">SMTP Host</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. smtp.gmail.com"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Port</label>
                <input
                  type="number"
                  required
                  placeholder="587"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Username / Email</label>
              <input
                type="email"
                required
                placeholder="hrm@yourcompany.com"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={formData.password || ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 pr-9 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">From Email</label>
                <input
                  type="email"
                  required
                  placeholder="hrm@yourcompany.com"
                  value={formData.fromEmail}
                  onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">From Name</label>
                <input
                  type="text"
                  placeholder="Company HR Department"
                  value={formData.fromName}
                  onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
                <span>Enable Authentication (AUTH)</span>
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
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save HRM Settings'}
              </button>
            </div>
          </form>
        </div>

        {/* Test Email Box */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 text-slate-800 font-bold text-sm">
              <Send className="w-4 h-4 text-purple-600" />
              <span>Test Connection</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Send a test verification message to ensure your HRM credentials authenticate without rejection.
            </p>

            <form onSubmit={handleTest} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Recipient Email</label>
                <input
                  type="email"
                  required
                  placeholder="recipient@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <button
                type="submit"
                disabled={testing}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
              >
                {testing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Send Test Email
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-6 p-3 bg-purple-50 rounded-xl border border-purple-100 text-purple-900 text-[11px] leading-relaxed">
            <strong>Security Tip:</strong> When using Google Workspace, ensure an App Password is used if 2-Step Verification is active.
          </div>
        </div>
      </div>
    </div>
  )
}
