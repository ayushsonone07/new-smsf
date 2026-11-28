import React, { useState, useEffect } from 'react'
import {
  X,
  PhoneCall,
  ShieldCheck,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Eye,
  EyeOff,
  Globe,
  Sliders,
  Plus,
  Trash2,
  Zap,
} from 'lucide-react'
import {
  getVoiceConfig,
  updateVoiceConfig,
  sendTestVoiceCall,
  type VoiceConfig,
  type VoiceEventRule,
} from '../../../api/voice-campaign.api'

const DEFAULT_EVENT_RULES: VoiceEventRule[] = [
  { eventKey: 'TICKET_CREATED', label: 'Ticket Creation', source: 'HELP_CENTER', enabled: true, campaignPrefix: 'TKT_CREATE_', voiceFileId: '', callingNumber: '', builtIn: true, cooldownMinutes: 10 },
  { eventKey: 'TICKET_STATUS_UPDATED', label: 'Ticket Status Update', source: 'HELP_CENTER', enabled: false, campaignPrefix: 'TKT_STATUS_', voiceFileId: '', callingNumber: '', builtIn: true, cooldownMinutes: 2 },
  { eventKey: 'TICKET_DEPARTMENT_TRANSFERRED', label: 'Ticket Department Transfer', source: 'HELP_CENTER', enabled: false, campaignPrefix: 'TKT_XFER_', voiceFileId: '', callingNumber: '', builtIn: true, cooldownMinutes: 10 },
  { eventKey: 'CUSTOMER_REGISTERED', label: 'Customer Register', source: 'SMSB', enabled: false, campaignPrefix: 'CUST_REG_', voiceFileId: '', callingNumber: '', builtIn: true, cooldownMinutes: 10 },
  { eventKey: 'DEPARTMENT_MAIN_STATUS_COMPLETE', label: 'Department Main Status Complete', source: 'SMSB', enabled: false, campaignPrefix: 'DEPT_DONE_', voiceFileId: '', callingNumber: '', builtIn: true, cooldownMinutes: 10 },
  { eventKey: 'SOP_SUB_SERVICE_COMPLETE', label: 'SOP (Sub Service Info) Complete', source: 'SMSB', enabled: false, campaignPrefix: 'SOP_DONE_', voiceFileId: '', callingNumber: '', builtIn: true, cooldownMinutes: 10 },
]

function previewCampaignName(rule: { eventKey?: string; source?: string; campaignPrefix?: string }): string {
  const prefix = (rule.campaignPrefix || '').trim() || 'OBD_'
  if (rule.eventKey?.startsWith('TICKET_')) return `${prefix}TKT-1042`
  if (rule.source === 'SMSB') return `${prefix}1001`
  return `${prefix}9876543210`
}

interface VoiceSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: () => void
}

export function VoiceSettingsModal({ isOpen, onClose, onSaved }: VoiceSettingsModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testCalling, setTestCalling] = useState(false)

  // Form states
  const [enabled, setEnabled] = useState(true)
  const [callingNumber, setCallingNumber] = useState('')
  const [defaultVoiceFileId, setDefaultVoiceFileId] = useState('')
  const [callbackUrl, setCallbackUrl] = useState('')
  const [apiUrl, setApiUrl] = useState('')
  const [newToken, setNewToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [maskedToken, setMaskedToken] = useState('')
  const [tokenConfigured, setTokenConfigured] = useState(false)
  const [activeSection, setActiveSection] = useState<'triggers' | 'global'>('triggers')
  const [eventRules, setEventRules] = useState<VoiceEventRule[]>(DEFAULT_EVENT_RULES)
  const [showAddRule, setShowAddRule] = useState(false)
  const [newRuleLabel, setNewRuleLabel] = useState('')
  const [newRuleKey, setNewRuleKey] = useState('')
  const [newRulePrefix, setNewRulePrefix] = useState('')
  const [newRuleVoiceFileId, setNewRuleVoiceFileId] = useState('')
  const [newRuleCallingNumber, setNewRuleCallingNumber] = useState('')

  // Test call states
  const [testPhone, setTestPhone] = useState('')
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadConfig()
    }
  }, [isOpen])

  async function loadConfig() {
    setLoading(true)
    setErrorMsg(null)
    setSaveSuccessMsg(null)
    setTestResult(null)
    try {
      const cfg: VoiceConfig = await getVoiceConfig()
      setEnabled(cfg.enabled ?? true)
      setCallingNumber(cfg.callingNumber || '')
      setDefaultVoiceFileId(cfg.defaultVoiceFileId || '')
      setCallbackUrl(cfg.callbackUrl || '')
      setApiUrl(cfg.apiUrl || 'https://cloudshope.com/api/v1/voice/voiceCampaign')
      setMaskedToken(cfg.maskedToken || '')
      setTokenConfigured(!!cfg.tokenConfigured)
      setNewToken('')
      setEventRules(
        Array.isArray(cfg.eventRules) && cfg.eventRules.length > 0
          ? cfg.eventRules
          : DEFAULT_EVENT_RULES
      )
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load voice configuration')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErrorMsg(null)
    setSaveSuccessMsg(null)
    try {
      let cleanCallbackUrl = callbackUrl.trim()
      if (cleanCallbackUrl && !cleanCallbackUrl.startsWith('http://') && !cleanCallbackUrl.startsWith('https://')) {
        cleanCallbackUrl = 'https://' + cleanCallbackUrl
      }
      let cleanApiUrl = apiUrl.trim()
      if (cleanApiUrl && !cleanApiUrl.startsWith('http://') && !cleanApiUrl.startsWith('https://')) {
        cleanApiUrl = 'https://' + cleanApiUrl
      }

      const payload: any = {
        enabled,
        callingNumber: callingNumber.trim(),
        defaultVoiceFileId: defaultVoiceFileId.trim(),
        callbackUrl: cleanCallbackUrl,
        apiUrl: cleanApiUrl || 'https://cloudshope.com/api/v1/voice/voiceCampaign',
        eventRules,
      }
      if (newToken.trim()) {
        payload.token = newToken.trim()
      }

      const updated = await updateVoiceConfig(payload)
      setMaskedToken(updated.maskedToken || '')
      setTokenConfigured(!!updated.tokenConfigured)
      if (Array.isArray(updated.eventRules) && updated.eventRules.length > 0) {
        setEventRules(updated.eventRules)
      }
      setNewToken('')
      setSaveSuccessMsg('Voice OBD settings updated and applied successfully!')
      if (onSaved) onSaved()
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update voice configuration')
    } finally {
      setSaving(false)
    }
  }

  async function handleTestCall() {
    if (!testPhone.trim() || testPhone.replace(/\D/g, '').length < 10) {
      setErrorMsg('Please enter a valid 10-digit phone number for the test call.')
      return
    }

    setTestCalling(true)
    setTestResult(null)
    setErrorMsg(null)

    try {
      const res = await sendTestVoiceCall({
        phoneNumber: testPhone.trim(),
        voiceFileId: defaultVoiceFileId.trim() || undefined,
        callingNumber: callingNumber.trim() || undefined,
      })

      if (res && (res.status === 'SUCCESS' || res.success)) {
        setTestResult({
          success: true,
          message: `Test call dispatched successfully to ${testPhone}! Recipient phone should ring shortly.`,
        })
      } else {
        setTestResult({
          success: false,
          message: res?.message || 'Cloudshope test call failed. Check provider token and caller ID.',
        })
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Failed to trigger test call.',
      })
    } finally {
      setTestCalling(false)
    }
  }

  function updateRule(eventKey: string, patch: Partial<VoiceEventRule>) {
    setEventRules((prev) =>
      prev.map((r) => (r.eventKey === eventKey ? { ...r, ...patch } : r))
    )
  }

  function handleAddNewRule() {
    const label = newRuleLabel.trim()
    if (!label) {
      setErrorMsg('Please enter a trigger label (e.g. Payment Reminder).')
      return
    }
    const rawKey = (newRuleKey.trim() || label).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')
    if (!rawKey) {
      setErrorMsg('Please enter a valid event key.')
      return
    }
    if (eventRules.some((r) => r.eventKey === rawKey)) {
      setErrorMsg(`Trigger key "${rawKey}" already exists.`)
      return
    }
    const prefix = newRulePrefix.trim() || `${rawKey.slice(0, 12)}_`
    setEventRules((prev) => [
      ...prev,
      {
        eventKey: rawKey,
        label,
        source: 'CUSTOM',
        enabled: true,
        campaignPrefix: prefix,
        voiceFileId: newRuleVoiceFileId.trim(),
        callingNumber: newRuleCallingNumber.trim(),
        builtIn: false,
      },
    ])
    setNewRuleLabel('')
    setNewRuleKey('')
    setNewRulePrefix('')
    setNewRuleVoiceFileId('')
    setNewRuleCallingNumber('')
    setShowAddRule(false)
    setErrorMsg(null)
  }

  function handleDeleteRule(eventKey: string) {
    setEventRules((prev) => prev.filter((r) => r.eventKey !== eventKey))
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60a5fa',
              }}
            >
              <PhoneCall size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>Voice OBD Settings</h3>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                    color: '#4ade80',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <ShieldCheck size={12} /> SuperAdmin Only
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Manage Cloudshope outbound voice campaign credentials and defaults
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Section Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '10px 24px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveSection('triggers')}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              border: activeSection === 'triggers' ? '1px solid #2563eb' : '1px solid #e2e8f0',
              backgroundColor: activeSection === 'triggers' ? '#eff6ff' : '#ffffff',
              color: activeSection === 'triggers' ? '#1d4ed8' : '#475569',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Zap size={14} />
            <span>OBD Event Triggers ({eventRules.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('global')}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              border: activeSection === 'global' ? '1px solid #2563eb' : '1px solid #e2e8f0',
              backgroundColor: activeSection === 'global' ? '#eff6ff' : '#ffffff',
              color: activeSection === 'global' ? '#1d4ed8' : '#475569',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sliders size={14} />
            <span>Global Credentials &amp; Test Call</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
              <p style={{ fontSize: '13px', margin: 0 }}>Loading voice configuration...</p>
            </div>
          ) : (
            <form id="voice-settings-form" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Alert notifications */}
              {saveSuccessMsg && (
                <div
                  style={{
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#15803d',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* OBD Event Triggers Section */}
              {activeSection === 'triggers' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                        OBD Voice Call Event Triggers
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Configure toggle, campaign prefix, voice file ID, and optional caller ID per event.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddRule((v) => !v)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Plus size={14} />
                      <span>Add New Trigger</span>
                    </button>
                  </div>

                  {showAddRule && (
                    <div
                      style={{
                        padding: '14px',
                        borderRadius: '10px',
                        border: '1px dashed #2563eb',
                        backgroundColor: '#eff6ff',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e40af' }}>
                        New Custom OBD Trigger
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                            Trigger Label *
                          </label>
                          <input
                            type="text"
                            value={newRuleLabel}
                            onChange={(e) => setNewRuleLabel(e.target.value)}
                            placeholder="e.g. Payment Reminder"
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#fff', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                            Event Key (auto if blank)
                          </label>
                          <input
                            type="text"
                            value={newRuleKey}
                            onChange={(e) => setNewRuleKey(e.target.value)}
                            placeholder="e.g. PAYMENT_REMINDER"
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#fff', fontFamily: 'monospace', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                            Campaign Prefix
                          </label>
                          <input
                            type="text"
                            value={newRulePrefix}
                            onChange={(e) => setNewRulePrefix(e.target.value)}
                            placeholder="e.g. PAY_REM_"
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#fff', fontFamily: 'monospace', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                            Voice File ID
                          </label>
                          <input
                            type="text"
                            value={newRuleVoiceFileId}
                            onChange={(e) => setNewRuleVoiceFileId(e.target.value)}
                            placeholder={`Default: ${defaultVoiceFileId || '120447'}`}
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#fff', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                            Calling Number (Optional)
                          </label>
                          <input
                            type="text"
                            value={newRuleCallingNumber}
                            onChange={(e) => setNewRuleCallingNumber(e.target.value)}
                            placeholder={`Default: ${callingNumber || 'Global CLI'}`}
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#fff', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                            Generated Campaign Name
                          </label>
                          <div style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #bfdbfe', backgroundColor: '#ffffff', fontSize: '12px', fontFamily: 'monospace', color: '#1e40af', fontWeight: 600 }}>
                            {previewCampaignName({ eventKey: newRuleKey || newRuleLabel, source: 'CUSTOM', campaignPrefix: newRulePrefix })}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setShowAddRule(false)}
                          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '12px', cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleAddNewRule}
                          style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Add Trigger
                        </button>
                      </div>
                    </div>
                  )}

                  {eventRules.map((rule) => (
                    <div
                      key={rule.eventKey}
                      style={{
                        padding: '14px',
                        borderRadius: '10px',
                        border: rule.enabled ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                        backgroundColor: rule.enabled ? '#fafffe' : '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                            {rule.label}
                          </span>
                          <code style={{ fontSize: '10.5px', backgroundColor: '#e2e8f0', color: '#334155', padding: '2px 6px', borderRadius: '4px' }}>
                            {rule.eventKey}
                          </code>
                          {rule.source && (
                            <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#eef2ff', color: '#4338ca', padding: '2px 6px', borderRadius: '999px' }}>
                              {rule.source}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {!rule.builtIn && (
                            <button
                              type="button"
                              onClick={() => handleDeleteRule(rule.eventKey)}
                              title="Delete custom trigger"
                              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          <label style={{ position: 'relative', display: 'inline-block', width: '42px', height: '22px' }}>
                            <input
                              type="checkbox"
                              checked={rule.enabled}
                              onChange={(e) => updateRule(rule.eventKey, { enabled: e.target.checked })}
                              style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span
                              style={{
                                position: 'absolute',
                                cursor: 'pointer',
                                inset: 0,
                                backgroundColor: rule.enabled ? '#10b981' : '#cbd5e1',
                                borderRadius: '34px',
                                transition: '0.25s',
                              }}
                            >
                              <span
                                style={{
                                  position: 'absolute',
                                  height: '16px',
                                  width: '16px',
                                  left: rule.enabled ? '22px' : '3px',
                                  bottom: '3px',
                                  backgroundColor: '#ffffff',
                                  borderRadius: '50%',
                                  transition: '0.25s',
                                }}
                              />
                            </span>
                          </label>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 110px', gap: '10px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                            Campaign Prefix
                          </label>
                          <input
                            type="text"
                            value={rule.campaignPrefix}
                            onChange={(e) => updateRule(rule.eventKey, { campaignPrefix: e.target.value })}
                            placeholder="e.g. TKT_CREATE_"
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontFamily: 'monospace', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                            Voice File ID
                          </label>
                          <input
                            type="text"
                            value={rule.voiceFileId || ''}
                            onChange={(e) => updateRule(rule.eventKey, { voiceFileId: e.target.value })}
                            placeholder={`Global: ${defaultVoiceFileId || '120447'}`}
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                            Calling Number (Optional)
                          </label>
                          <input
                            type="text"
                            value={rule.callingNumber || ''}
                            onChange={(e) => updateRule(rule.eventKey, { callingNumber: e.target.value })}
                            placeholder={`Global: ${callingNumber || 'CLI'}`}
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                            Cooldown (min)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={rule.cooldownMinutes ?? 10}
                            onChange={(e) => {
                              const parsed = parseInt(e.target.value, 10)
                              updateRule(rule.eventKey, {
                                cooldownMinutes: Number.isNaN(parsed) ? 0 : Math.max(0, parsed),
                              })
                            }}
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#f1f5f9',
                          fontSize: '11.5px',
                        }}
                      >
                        <span style={{ color: '#475569', fontWeight: 600 }}>Generated Campaign Name:</span>
                        <code style={{ color: '#1e40af', fontWeight: 700, fontSize: '12px' }}>
                          {previewCampaignName(rule)}
                        </code>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeSection === 'global' && (
                <>
              {/* Service Enabled Switch */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  backgroundColor: enabled ? '#f0fdf4' : '#f8fafc',
                  border: enabled ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                    Automated Voice Calling Status
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {enabled ? 'Calls are currently ACTIVE upon ticket creation' : 'Outbound calling is DISABLED system-wide'}
                  </div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      inset: 0,
                      backgroundColor: enabled ? '#10b981' : '#cbd5e1',
                      borderRadius: '34px',
                      transition: '0.3s',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        content: '""',
                        height: '20px',
                        width: '20px',
                        left: enabled ? '24px' : '3px',
                        bottom: '3px',
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        transition: '0.3s',
                      }}
                    />
                  </span>
                </label>
              </div>

              {/* Calling Parameters Card */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sliders size={15} style={{ color: '#2563eb' }} />
                  <span>Calling Parameters</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Caller ID (CLI Number)
                    </label>
                    <input
                      type="text"
                      value={callingNumber}
                      onChange={(e) => setCallingNumber(e.target.value)}
                      placeholder="e.g. 6746832325"
                      required
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Must match registered CLI in Cloudshope</span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Voice File ID (Audio Clip)
                    </label>
                    <input
                      type="text"
                      value={defaultVoiceFileId}
                      onChange={(e) => setDefaultVoiceFileId(e.target.value)}
                      placeholder="e.g. 120447"
                      required
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                    <span style={{ fontSize: '11px', color: '#64748b' }}>ID of the uploaded .wav in Cloudshope</span>
                  </div>
                </div>

                <div style={{ marginTop: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Delivery / CDR Webhook Callback URL
                  </label>
                  <input
                    type="text"
                    value={callbackUrl}
                    onChange={(e) => setCallbackUrl(e.target.value)}
                    placeholder="https://your-domain.com/api/v1/voice/callback"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Receives live call answered/failed status from Cloudshope</span>
                </div>
              </div>

              {/* API Security & Credentials Card */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Key size={15} style={{ color: '#2563eb' }} />
                    <span>Cloudshope API Credentials (Secured)</span>
                  </div>
                  {tokenConfigured ? (
                    <span style={{ fontSize: '11px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                      <CheckCircle2 size={13} /> Token Configured
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                      <AlertCircle size={13} /> Token Missing
                    </span>
                  )}
                </div>

                {maskedToken && (
                  <div style={{ marginBottom: '12px', padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '12px', color: '#475569' }}>
                    <span style={{ fontWeight: 600 }}>Active Token: </span>
                    <code style={{ fontSize: '11px', color: '#0f172a' }}>{maskedToken}</code>
                  </div>
                )}

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Update API Bearer Token
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={newToken}
                      onChange={(e) => setNewToken(e.target.value)}
                      placeholder="Paste new JWT token to replace (leave blank to keep existing)"
                      style={{
                        width: '100%',
                        padding: '9px 40px 9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Leave blank to preserve existing token safely</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    API Endpoint URL
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Globe size={15} style={{ color: '#94a3b8' }} />
                    <input
                      type="text"
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Instant Test Call Box */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px dashed #3b82f6',
                  backgroundColor: '#eff6ff',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e40af', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Send size={14} />
                  <span>Verify with a Live Test Call</span>
                </div>
                <p style={{ fontSize: '12px', color: '#3b82f6', margin: '0 0 10px 0' }}>
                  Enter your mobile number to trigger an immediate call using the configured credentials.
                </p>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="tel"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="Enter 10-digit mobile number"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #93c5fd',
                      fontSize: '13px',
                      backgroundColor: '#ffffff',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleTestCall}
                    disabled={testCalling}
                    style={{
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: testCalling ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: testCalling ? 0.7 : 1,
                    }}
                  >
                    {testCalling ? <RefreshCw size={14} className="animate-spin" /> : <PhoneCall size={14} />}
                    <span>{testCalling ? 'Calling...' : 'Send Test Call'}</span>
                  </button>
                </div>

                {testResult && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      backgroundColor: testResult.success ? '#dcfce7' : '#fee2e2',
                      color: testResult.success ? '#15803d' : '#b91c1c',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {testResult.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>
                </>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #f1f5f9',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="voice-settings-form"
            disabled={saving || loading}
            style={{
              padding: '9px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: saving || loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
