import { useState, useEffect } from 'react'
import {
  Info,
  Mail,
  Phone,
  Building2,
  Globe,
  Palette,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { sendOnboardingConfirmationMail } from '../../../api/department-users.api'
import type { OnboardingCustomer } from './CustomersList'

interface OnboardingConfirmationModalProps {
  open: boolean
  customer: OnboardingCustomer | null
  onClose: () => void
  onSuccess?: () => void
}

export function OnboardingConfirmationModal({
  open,
  customer,
  onClose,
  onSuccess,
}: OnboardingConfirmationModalProps) {
  const [email, setEmail] = useState('')
  const [contact, setContact] = useState('')
  const [domainConnect, setDomainConnect] = useState(false)
  const [themeSelection, setThemeSelection] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (customer) {
      setEmail(customer.email || '')
      setContact(customer.phone || '')
      setDomainConnect(false)
      setThemeSelection(false)
      setError(null)
    }
  }, [customer, open])

  if (!customer) return null

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Recipient email is required')
      return
    }
    if (!contact.trim()) {
      setError('Contact number is required')
      return
    }

    if ((domainConnect && !themeSelection) || (!domainConnect && themeSelection)) {
      setError('Please select both options (Domain Connect & Theme Selection) or neither option.')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      await sendOnboardingConfirmationMail({
        recipientUsername: email.trim(),
        contact: contact.trim(),
        isDuplicate: Boolean(customer.hasDuplicateCustomer),
        domainConnect,
        themeSelection,
      })

      onSuccess?.()
      onClose()
    } catch (err: unknown) {
      console.error('Failed to send confirmation email:', err)
      const msg = err instanceof Error ? err.message : 'Failed to send onboarding confirmation email.'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={isSubmitting ? () => {} : onClose}
      title="Complete Onboarding"
      description="Send acknowledgement confirmation email to customer"
      size="md"
    >
      <form onSubmit={handleSend} className="space-y-4 pt-1">
        {/* Notice Card */}
        <div className="flex items-start gap-3 p-3.5 bg-blue-50/80 border border-blue-200/90 rounded-xl text-blue-900">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <span className="font-semibold block mb-0.5 text-blue-950">
              Customer Acknowledgement Required
            </span>
            <span className="text-blue-900/90">
              The status will <strong>not</strong> change directly. An acknowledgement email with a confirmation link will be sent to the customer. Once confirmed by the customer, the status will automatically update to <strong>Completed</strong>.
            </span>
          </div>
        </div>

        {/* Customer Info Card */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-800">
                {customer.businessName || customer.contactName}
              </div>
              {customer.contactName && customer.contactName !== customer.businessName && (
                <div className="text-[11px] text-slate-500">Contact: {customer.contactName}</div>
              )}
            </div>
          </div>
          {customer.hasDuplicateCustomer && (
            <span className="text-[11px] px-2 py-0.5 font-medium rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              Duplicate
            </span>
          )}
        </div>

        {/* Email & Contact Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="inline-label block text-xs font-semibold text-slate-700 mb-1.5">
              Recipient Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                disabled={isSubmitting}
                required
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                style={{ paddingLeft: '2.25rem', paddingRight: '0.75rem', marginTop: 0 }}
              />
            </div>
          </div>

          <div>
            <label className="inline-label block text-xs font-semibold text-slate-700 mb-1.5">
              Contact Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="tel"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Phone number"
                disabled={isSubmitting}
                required
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                style={{ paddingLeft: '2.25rem', paddingRight: '0.75rem', marginTop: 0 }}
              />
            </div>
          </div>
        </div>

        {/* Service Options (Domain Connect & Theme Selection) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Services & Requirements</span>
            <span className="text-[11px] text-slate-500 italic">Both required or neither</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`inline-label flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                domainConnect
                  ? 'border-blue-500 bg-blue-50/60 shadow-xs'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
              }`}
            >
              <input
                type="checkbox"
                checked={domainConnect}
                onChange={(e) => setDomainConnect(e.target.checked)}
                disabled={isSubmitting}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-semibold text-slate-800">Domain Connect</span>
                </div>
                <span className="text-[11px] text-slate-500 block mt-0.5 leading-tight">
                  Connect custom domain
                </span>
              </div>
            </label>

            <label
              className={`inline-label flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                themeSelection
                  ? 'border-blue-500 bg-blue-50/60 shadow-xs'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
              }`}
            >
              <input
                type="checkbox"
                checked={themeSelection}
                onChange={(e) => setThemeSelection(e.target.checked)}
                disabled={isSubmitting}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-xs font-semibold text-slate-800">Theme Selection</span>
                </div>
                <span className="text-[11px] text-slate-500 block mt-0.5 leading-tight">
                  Select portal theme
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end items-center gap-2.5 pt-2 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </span>
            ) : (
              'Send Acknowledgement'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

