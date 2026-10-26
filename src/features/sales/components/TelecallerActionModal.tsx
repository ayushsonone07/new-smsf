import React, { useState } from 'react'
import { X, Calendar, User, Loader2 } from 'lucide-react'
import {
  updateTelecallerStatus,
  type AssignableUser,
  type LeadInfo,
} from '../../../api/leads.api'

interface TelecallerActionModalProps {
  isOpen: boolean
  onClose: () => void
  lead: LeadInfo | null
  mode: 'follow_up' | 'assign'
  assignableUsers: AssignableUser[]
  onSuccess: () => void
}

export const TelecallerActionModal: React.FC<TelecallerActionModalProps> = ({
  isOpen,
  onClose,
  lead,
  mode,
  assignableUsers,
  onSuccess,
}) => {
  const [followUpDate, setFollowUpDate] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !lead) return null

  const isFollowUp = mode === 'follow_up'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (isFollowUp && !followUpDate) {
      setError('Please select a valid follow-up date and time.')
      return
    }

    if (!isFollowUp && !selectedUser) {
      setError('Please choose a sales representative.')
      return
    }

    setLoading(true)
    try {
      await updateTelecallerStatus({
        leadId: lead.leadId,
        status: isFollowUp ? 'FOLLOW_UP' : 'ASSIGNED',
        assignedSalesPerson: !isFollowUp ? selectedUser : undefined,
        meetingScheduledAt: followUpDate ? new Date(followUpDate).toISOString().split('.')[0] : undefined,
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to update telecaller status.')
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
              {isFollowUp ? 'Schedule Follow-up' : 'Assign Sales Rep'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isFollowUp
                ? `Set next callback date for ${lead.ownerName || 'Lead'}`
                : `Assign ${lead.ownerName || 'Lead'} to a sales executive`}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          {!isFollowUp && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Assign Sales User <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                >
                  <option value="">Select sales user...</option>
                  {assignableUsers.map((u) => (
                    <option key={u.email || u.username} value={u.email || u.username}>
                      {u.username} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {isFollowUp ? 'Follow-up Date & Time' : 'Meeting / Call Time'}{' '}
              <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="datetime-local"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{loading ? 'Saving...' : 'Save & Update'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
