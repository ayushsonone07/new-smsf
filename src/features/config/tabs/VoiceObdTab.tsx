import { useState, useEffect } from 'react'
import { Cloud, Mic, Phone, Search, CheckCircle, XCircle, Setting, Eye, EyeOff, ToggleLeft, Loader2, AlertCircle } from 'lucide-react'
import { getCloudshopeConfigs, saveCloudshopeConfigs, testCloudshopeConnection } from '../../../api/config.api'

interface VoiceObdTabProps {
  onNotify: (msg: string, type?: 'success' | 'error') => void
}

interface VoiceObdConfig {
  key: string
  label: string
  placeholder: string
  type: 'text' | 'number' | 'toggle'
  masked?: boolean
  showToggle?: boolean
}

const VOB_CONFIGS: VoiceObdConfig[] = [
  {
    key: 'cloudshopeToken',
    label: 'Cloudshope API Token',
    placeholder: 'eyJhbGci... (JWT Token)',
    type: 'text',
    masked: true,
  },
  {
    key: 'cloudshopeCallingNumber',
    label: 'Caller ID / CLI Number',
    placeholder: 'e.g. 6746832325',
    type: 'text',
  },
  {
    key: 'cloudshopeVoiceFileId',
    label: 'Voice File ID',
    placeholder: 'e.g. 120447',
    type: 'number',
  },
  {
    key: 'cloudshopeCallbackUrl',
    label: 'Delivery / CDR Callback Webhook URL',
    placeholder: 'https://your-domain.com/api/v1/voice/callback',
    type: 'text',
  },
  {
    key: 'cloudshopeEnabled',
    label: 'Voice Calling Status',
    type: 'toggle',
    showToggle: true,
  },
]

export function VoiceObdTab({ onNotify }: VoiceObdTabProps) {
  const [configs, setConfigs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [testPhone, setTestPhone] = useState<string>('')
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const loadConfigs = async () => {
    setLoading(true)
    try {
      const data = await getCloudshopeConfigs()
      setConfigs(data)
    } catch (err) {
      onNotify('Failed to load Voice OBD configurations', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfigs()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await saveCloudshopeConfigs(configs)
      onNotify('Voice OBD configurations saved successfully', 'success')
      loadConfigs()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save Voice OBD configurations'
      onNotify(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleTestCall = async () => {
    if (!testPhone.trim()) {
      onNotify('Please enter a phone number to test', 'error')
      return
    }

    setTestLoading(true)
    setTestResult(null)

    try {
      const result = await testCloudshopeConnection(testPhone.trim())
      setTestResult(result)

      if (result.success) {
        onNotify('Test call successful! ' + result.message, 'success')
      } else {
        onNotify('Test call failed: ' + result.message, 'error')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Test call failed with unknown error'
      onNotify(msg, 'error')
    } finally {
      setTestLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Voice OBD Configurations</h3>
            <p className="text-xs text-slate-500">
              Configure Cloudshope Bulk Voice Campaign settings. These settings power automated outbound calls to customers.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadConfigs}
          disabled={loading}
          className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-600 font-medium">Loading Voice OBD configurations...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Token Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-700">Cloudshope API Token</h4>
                <small className="text-xs text-slate-500">
                  Authentication token from Cloudshope dashboard. Expires or needs rotation when re-generated.
                </small>
              </div>

              <div className="space-y-3">
                {VOB_CONFIGS.filter((c) => c.key === 'cloudshopeToken').map((config) => (
                  <div
                    key="token-config"
                    className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 ${configs[config.key] ? 'border-emerald-200' : ''}`}
                  >
                                    {/* Token Input with Masked Toggle */}
                                    <div className="flex-1 relative">
                                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                        {config.label}
                                        {config.masked && (
                                          <span className="absolute right-2 text-slate-400 text-xs pointer-events-none">
                                            {configs[config.key]?.length > 16
                                              ? configs[config.key].substring(0, 10) + '...' + configs[config.key].substring(configs[config.key].length - 6) + ' (len=' + configs[config.key].length + ')'
                                              : '***'
                                          }
                                        )}
                                      </label>

                                      {/* Show/Hide Toggle */}
                                      {config.masked && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            // Toggle visibility - we'll handle this with state
                                          }}
                                          className="absolute right-1 text-slate-400 hover:text-slate-700 text-sm p-1 rounded-md transition-colors"
                                          aria-label={configs[config.key] ? 'Hide token' : 'Show token'}
                                        >
                                          {configs[config.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                      )}

                                      {/* Input Field */}
                                      <input
                                        type={configs[config.key] && !config.masked ? 'text' : 'password'}
                                        placeholder={config.placeholder}
                                        value={configs[config.key] || ''}
                                        onChange={(e) =>
                                          setConfigs({
                                            ...configs,
                                            [config.key]: e.target.value,
                                          })
                                        }
                                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                                        aria-describedby="token-help"
                                        title={configs[config.key] ? 'Token partially visible' : 'Enter Cloudshope API token'}
                                      />
                                    </div>

                                    <div id="token-help" className="text-xs text-slate-400 mt-1">
                                      {configs[config.key]?.length > 0 && configs[config.key].length < 20
                                        ? 'Token is short (may be invalid)'
                                        : configs[config.key]?.length > 20
                                        ? 'Token is displayed masked for security'
                                        : 'Enter your Cloudshope API token'}
                                    </div>
                                  </div>
                                ))}
              </div>
            </div>

            {/* Calling Number */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-700">Caller ID / CLI Number</h4>
                <small className="text-xs text-slate-500">
                  The official CLI / Calling number displayed to the customer when they answer.
                </small>
              </div>

              <VOB_CONFIGs.map((config) => {
                if (config.key === 'cloudshopeCallingNumber') {
                  return (
                    <div
                      key="calling-number-config"
                      className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 ${configs[config.key] ? 'border-emerald-200' : ''}`}
                    >
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        {config.label}
                        <span className="text-xs text-slate-500">(e.g. 6746832325)</span>
                      </label>

                      <input
                        type="text"
                        placeholder={config.placeholder}
                        value={configs[config.key] || ''}
                        onChange={(e) =>
                          setConfigs({
                            ...configs,
                            [config.key]: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                        maxLength="15"
                        inputMode="numeric"
                        ariaLabel="Caller ID number"
                      />
                    </div>
                  )
                }
                return null
              })()
            </div>

            {/* Voice File ID */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-700">Voice File ID</h4>
                <small className="text-xs text-slate-500">
                  The audio recording played to the customer when they answer. Upload to Cloudshope first.
                </small>
              </div>

              {VOB_CONFIGS.map((config) => {
                if (config.key === 'cloudshopeVoiceFileId') {
                  return (
                    <div
                      key="voice-file-id-config"
                      className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 ${configs[config.key] ? 'border-emerald-200' : ''}`}
                    >
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        {config.label}
                        <span className="text-xs text-slate-500">(e.g. 120447 - 15 minutes mbg.wav)</span>
                      </label>

                      <input
                        type="number"
                        placeholder={config.placeholder}
                        value={configs[config.key] || '' || '120447'}
                        onChange={(e) =>
                          setConfigs({
                            ...configs,
                            [config.key]: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                        min="1"
                        ariaLabel="Voice file ID"
                      />
                    </div>
                  )
                }
                return null
              })()}
            </div>

            {/* Voice Enabled Toggle */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-700">Voice Calling Status</h4>
                <small className="text-xs text-slate-500">
                  Master on/off switch for automated calling. Turn off during holidays, maintenance, or testing.
                </small>
              </div>

              {VOB_CONFIGS.map((config) => {
                if (config.key === 'cloudshopeEnabled') {
                  return (
                    <div
                      key="voice-enabled-config"
                      className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 ${configs[config.key] === 'true' ? 'border-emerald-200' : 'border-rose-200'}`}
                    >
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <ToggleLeft
                          className="w-5 h-3 rounded-full bg-slate-200 transition-colors peer checked:bg-purple-600 peer-checked:bg-emerald-600"
                          type="checkbox"
                          checked={configs[config.key] === 'true'}
                          onChange={(e) =>
                            setConfigs({
                              ...configs,
                              [config.key]: e.target.checked ? 'true' : 'false',
                            })
                          }
                        />
                        <span>Voice Calling {'<span className="text-emerald-600 font-medium">Active</span>'} {'<span className="text-rose-600 font-medium">Disabled</span>'}</span>
                      </label>
                    </div>
                  )
                }
                return null
              })()}
            </div>

            {/* Test Call Section */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-sm font-semibold text-slate-700">Test Call</h4>
              <p className="text-xs text-slate-500 mb-3">
                Enter your phone number to verify if the token, caller ID, and voice file ID are valid before saving.
              </p>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                    maxLength="15"
                    inputMode="numeric"
                    ariaLabel="Test phone number"
                  />

                  <button
                    type="button"
                    onClick={handleTestCall}
                    disabled={testLoading || !testPhone.trim()}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50 bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm"
                  >
                    <Loader2 className={`w-3.5 h-3.5 ${testLoading ? 'animate-spin' : ''}`} />
                    <span>{testLoading ? 'Testing...' : 'Test Call'}</span>
                  </button>
                </div>

                {testResult && (
                  <div className={`p-3 rounded-lg ${testResult.success ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                    <div className="flex items-center gap-2">
                      <Icon className={testResult.success ? 'w-4 h-4 text-emerald-600' : 'w-4 h-4 text-rose-600'} />
                      <span>{testResult.message}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTestPhone('')}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save Configurations'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}