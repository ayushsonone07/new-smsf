import React, { useState } from 'react'
import { UserPlus, X, AlertCircle, Loader2 } from 'lucide-react'
import {
  createLead,
  type AssignableUser,
  type FunnelItem,
} from '../../../api/leads.api'

interface AddLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  funnels: FunnelItem[]
  leadStatusOptions: string[]
  platformOptions: string[]
  assignableUsers: AssignableUser[]
}

interface LeadForm {
  timeStamp: string
  ownerName: string
  businessName: string
  email: string
  platform: string
  leadStatus: string
  category: string
  city: string
  contact: string
  funnelType: string
  assignedUser: string
}

function nowLocalInput(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** "2026-10-31T14:05" -> "31/10/2026 14:05:00", the format the lead sheet uses. */
function toSheetTimestamp(value: string): string {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}:00` : value
}

function emptyForm(): LeadForm {
  return {
    timeStamp: nowLocalInput(),
    ownerName: '',
    businessName: '',
    email: '',
    platform: '',
    leadStatus: 'PENDING',
    category: '',
    city: '',
    contact: '',
    funnelType: '',
    assignedUser: '',
  }
}

function formatStatus(status: string) {
  return status
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ')
}

const inputClass =
  'w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all'

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-[11px] text-rose-600">{error}</span>}
    </label>
  )
}

export const AddLeadModal: React.FC<AddLeadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  funnels,
  leadStatusOptions,
  platformOptions,
  assignableUsers,
}) => {
  const [form, setForm] = useState<LeadForm>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof LeadForm, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const set = (key: keyof LeadForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const value = e.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const funnelNames = Array.from(
    new Set(funnels.map((f) => f.funnelName || f.funnelType || '').filter(Boolean)),
  )

  function validate(): boolean {
    const next: Partial<Record<keyof LeadForm, string>> = {}
    if (!form.ownerName.trim()) next.ownerName = 'Owner name is required'
    if (!form.businessName.trim()) next.businessName = 'Business name is required'
    if (!form.platform) next.platform = 'Select a platform'
    if (!form.funnelType) next.funnelType = 'Select a funnel type'
    if (form.contact.replace(/\D/g, '').length < 10) next.contact = 'Enter at least 10 digits'
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Enter a valid email'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleClose() {
    if (saving) return
    setForm(emptyForm())
    setErrors({})
    setSubmitError(null)
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    setSubmitError(null)
    try {
      const res = await createLead({
        timeStamp: form.timeStamp ? toSheetTimestamp(form.timeStamp) : undefined,
        ownerName: form.ownerName.trim(),
        businessName: form.businessName.trim(),
        email: form.email.trim() || undefined,
        platform: form.platform.trim(),
        leadStatus: form.leadStatus || undefined,
        category: form.category.trim() || undefined,
        city: form.city.trim() || undefined,
        contact: form.contact.replace(/\D/g, ''),
        funnelType: form.funnelType.trim(),
        assignedUser: form.assignedUser || undefined,
      })
      if (!res.success) {
        setSubmitError(res.message || 'Could not add the lead.')
        return
      }
      setForm(emptyForm())
      setErrors({})
      onSuccess()
      onClose()
    } catch (err: unknown) {
      let msg = err instanceof Error && err.message ? err.message : 'Failed to add the lead. Please try again.'
      try {
        const parsed = JSON.parse(msg)
        if (parsed?.message) msg = parsed.message
      } catch {
        // not JSON
      }
      setSubmitError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <UserPlus className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">Add Lead</h3>
              <p className="text-xs text-slate-500 mt-0.5">The lead is saved to your Leads list.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            aria-label="Close"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0" noValidate>
          <div className="p-6 overflow-y-auto">
            {submitError && (
              <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Time stamp">
                <input type="datetime-local" value={form.timeStamp} onChange={set('timeStamp')} className={inputClass} />
              </Field>

              <Field label="Owner Name" required error={errors.ownerName}>
                <input value={form.ownerName} onChange={set('ownerName')} placeholder="e.g. Satyam Tiwari" className={inputClass} />
              </Field>

              <Field label="Business Name" required error={errors.businessName}>
                <input value={form.businessName} onChange={set('businessName')} placeholder="e.g. Lala Company" className={inputClass} />
              </Field>

              <Field label="Email" error={errors.email}>
                <input type="email" value={form.email} onChange={set('email')} placeholder="name@example.com" className={inputClass} />
              </Field>

              <Field label="Platform" required error={errors.platform}>
                <select value={form.platform} onChange={set('platform')} className={inputClass}>
                  <option value="">Select platform</option>
                  {platformOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Lead Status">
                <select value={form.leadStatus} onChange={set('leadStatus')} className={inputClass}>
                  {leadStatusOptions.map((st) => (
                    <option key={st} value={st}>
                      {formatStatus(st)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Category">
                <input value={form.category} onChange={set('category')} placeholder="e.g. Restaurant" className={inputClass} />
              </Field>

              <Field label="City">
                <input value={form.city} onChange={set('city')} placeholder="e.g. Indore" className={inputClass} />
              </Field>

              <Field label="Contact" required error={errors.contact}>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={form.contact}
                  onChange={set('contact')}
                  placeholder="10-digit mobile number"
                  className={inputClass}
                />
              </Field>

              <Field label="Funnel Type" required error={errors.funnelType}>
                <select value={form.funnelType} onChange={set('funnelType')} className={inputClass} disabled={funnelNames.length === 0}>
                  <option value="">{funnelNames.length === 0 ? 'No funnels found' : 'Select funnel type'}</option>
                  {funnelNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Assigned To">
                <select value={form.assignedUser} onChange={set('assignedUser')} className={inputClass}>
                  <option value="">Not Assigned</option>
                  {assignableUsers.map((user) => {
                    const value = user.email || user.username
                    return (
                      <option key={user.id ?? value} value={value}>
                        {user.username}{user.email && user.email !== user.username ? ` · ${user.email}` : ''}
                      </option>
                    )
                  })}
                </select>
              </Field>
            </div>
          </div>

          <div className="px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100 bg-white">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold text-white rounded-xl transition-colors flex items-center gap-2 shadow-sm bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{saving ? 'Saving…' : 'Add Lead'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
