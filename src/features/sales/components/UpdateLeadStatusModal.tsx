import React, { useState } from 'react'
import { X, CheckCircle2, Loader2, Link2 } from 'lucide-react'
import { updateLeadStatus } from '../../../api/leads.api'

interface UpdateLeadStatusModalProps {
  isOpen: boolean
  onClose: () => void
  leadId: string
  leadName?: string
  currentStatus: string
  newStatus: string
  onSuccess: () => void
}

export const UpdateLeadStatusModal: React.FC<UpdateLeadStatusModalProps> = ({
  isOpen,
  onClose,
  leadId,
  leadName,
  currentStatus,
  newStatus,
  onSuccess,
}) => {
  const [meetingLink, setMeetingLink] = useState('')
  const [leadTag, setLeadTag] = useState('HOT')
  const [isPaymentDone, setIsPaymentDone] = useState(false)
  const [packageDescription, setPackageDescription] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const isDoneStatus = newStatus === 'DONE'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (isDoneStatus && !meetingLink.trim()) {
      setError('Meeting link is required when marking lead as DONE.')
      return
    }

    if (isDoneStatus && isPaymentDone && !packageDescription.trim()) {
      setError('Package description / amount is required when payment is done.')
      return
    }

    setLoading(true)
    try {
      await updateLeadStatus({
        leadId,
        newLeadStatus: newStatus,
        oldStatus: currentStatus,
        meetingLink: meetingLink.trim() || undefined,
        leadTag,
        isPaymentDone: isPaymentDone ? 'true' : 'false',
        packageDescription: packageDescription.trim() || undefined,
        description: description.trim() || undefined,
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to update lead status.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Update Lead Status: {newStatus.replace(/_/g, ' ')}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Confirm status change for {leadName || `Lead #${leadId}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Lead Tag <span className="text-rose-500">*</span>
            </label>
            <select
              value={leadTag}
              onChange={(e) => setLeadTag(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="HOT">Hot Lead</option>
              <option value="WARM">Warm Lead</option>
              <option value="COLD">Cold Lead</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Meeting / Recording Link {isDoneStatus && <span className="text-rose-500">*</span>}
            </label>
            <div className="relative">
              <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                placeholder="https://..."
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {isDoneStatus && (
            <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={isPaymentDone}
                  onChange={(e) => setIsPaymentDone(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>Payment Completed</span>
              </label>

              {isPaymentDone && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Package / Amount Details <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ₹999 Starter Plan"
                    value={packageDescription}
                    onChange={(e) => setPackageDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Remarks / Notes
            </label>
            <textarea
              rows={2}
              placeholder="Add internal remarks about this customer..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{loading ? 'Updating...' : 'Confirm Update'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
