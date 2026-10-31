import React, { useState, useMemo } from 'react'
import {
  X,
  ArrowRightLeft,
  User,
  Users,
  Building,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
  PhoneCall,
  Briefcase,
} from 'lucide-react'
import {
  assignLeadToUser,
  bulkAssignLeads,
  type LeadInfo,
  type AssignableUser,
} from '../../../api/leads.api'

interface TransferLeadModalProps {
  isOpen: boolean
  onClose: () => void
  /** Either a single lead or multiple selected leads */
  leads: LeadInfo[]
  assignableUsers: AssignableUser[]
  onTransferred: () => void
}

export const TransferLeadModal: React.FC<TransferLeadModalProps> = ({
  isOpen,
  onClose,
  leads,
  assignableUsers,
  onTransferred,
}) => {
  const [assignmentType, setAssignmentType] = useState<'sales' | 'telesales'>('sales')
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>('')
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    return assignableUsers.filter((u) => {
      const matchSearch =
        !userSearchTerm.trim() ||
        u.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearchTerm.toLowerCase())

      return matchSearch
    })
  }, [assignableUsers, userSearchTerm])

  if (!isOpen || leads.length === 0) return null

  const isBulk = leads.length > 1
  const singleLead = !isBulk ? leads[0] : null
  const currentAssignee = singleLead
    ? (assignmentType === 'sales' ? singleLead.assginedUser : singleLead.telecallerAssigned) || 'Unassigned'
    : 'Multiple Reps'

  const selectedUserDetails = assignableUsers.find(
    (u) => (u.email || u.username) === selectedUserEmail,
  )

  const handleConfirmTransfer = async () => {
    if (!selectedUserEmail) {
      setError('Please select a team member to transfer to.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      if (isBulk) {
        // Bulk transfer
        const leadIds = leads.map((l) => l.leadId)
        await bulkAssignLeads({
          leadIds,
          salesMembers: [selectedUserEmail],
          assignmentType: 'manual',
        })
      } else if (singleLead) {
        // Single lead transfer
        await assignLeadToUser(singleLead.leadId, selectedUserEmail, assignmentType)
      }

      onTransferred()
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to transfer lead. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 shadow-xs">
              <ArrowRightLeft className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {isBulk ? `Transfer ${leads.length} Leads` : 'Transfer Lead'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isBulk
                  ? 'Reassign selected leads to another representative'
                  : `Reassign ${singleLead?.ownerName || singleLead?.businessName || 'lead'} to a new owner`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Transfer Summary Card */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">
                {isBulk ? 'Target Selection' : 'Current Lead'}
              </span>
              <span className="font-semibold text-slate-800">
                {isBulk
                  ? `${leads.length} leads selected`
                  : singleLead?.businessName || singleLead?.ownerName || singleLead?.leadId}
              </span>
            </div>

            {/* Current to New preview */}
            <div className="mt-3 flex items-center justify-between rounded-lg bg-white p-2.5 border border-slate-200/60">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <User className="h-3.5 w-3.5" />
                </span>
                <div className="truncate">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Current Assignee</p>
                  <p className="text-xs font-semibold text-slate-700 truncate">{currentAssignee}</p>
                </div>
              </div>

              <ArrowRightLeft className="h-4 w-4 text-blue-500 shrink-0 mx-2" />

              <div className="flex items-center gap-2 min-w-0 text-right">
                <div className="truncate">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">New Assignee</p>
                  <p className="text-xs font-semibold text-blue-700 truncate">
                    {selectedUserDetails?.username || 'Select Rep Below'}
                  </p>
                </div>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </div>

          {/* Role / Assignment Type selector (only for single lead or when applicable) */}
          {!isBulk && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Target Role / Department
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAssignmentType('sales')}
                  className={`flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-semibold border transition-all ${
                    assignmentType === 'sales'
                      ? 'border-blue-500 bg-blue-50/70 text-blue-700 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Briefcase className="h-4 w-4" />
                  <span>Sales Executive</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentType('telesales')}
                  className={`flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-semibold border transition-all ${
                    assignmentType === 'telesales'
                      ? 'border-purple-500 bg-purple-50/70 text-purple-700 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <PhoneCall className="h-4 w-4" />
                  <span>Telesales Rep</span>
                </button>
              </div>
            </div>
          )}

          {/* Destination User Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Transfer To <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {filteredUsers.length} representative{filteredUsers.length === 1 ? '' : 's'} available
              </span>
            </div>

            {/* Quick search input */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search representative by name or email..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
              />
            </div>

            {/* User List Radio items */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-xl border border-slate-200 p-2 bg-slate-50/30">
              {filteredUsers.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No representatives found matching your search.
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const emailKey = u.email || u.username
                  const isSelected = selectedUserEmail === emailKey
                  return (
                    <div
                      key={emailKey}
                      onClick={() => setSelectedUserEmail(emailKey)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/80 text-blue-900 shadow-xs'
                          : 'border-slate-100 bg-white text-slate-700 hover:bg-slate-100/70 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {u.username.charAt(0).toUpperCase()}
                        </span>
                        <div className="truncate">
                          <p className="font-semibold text-slate-900 truncate">{u.username}</p>
                          <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                        </div>
                      </div>

                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => setSelectedUserEmail(emailKey)}
                        className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Informational note */}
          <div className="rounded-xl bg-blue-50/50 border border-blue-100 p-3 text-[11px] text-blue-800 flex items-start gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
            <p className="leading-relaxed">
              Once transferred, ownership and responsibility for future calls, scheduled meetings, and
              updates will immediately shift to the selected representative.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmTransfer}
            disabled={!selectedUserEmail || isSubmitting}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-xs disabled:opacity-50 transition-all flex items-center gap-1.5"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span>{isSubmitting ? 'Transferring...' : 'Confirm Transfer'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default TransferLeadModal

