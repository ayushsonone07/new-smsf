import React from 'react'
import {
  X,
  User,
  Building,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Tag,
  CreditCard,
  FileText,
  Clock,
  ArrowRightLeft,
} from 'lucide-react'
import type { LeadInfo } from '../../../api/leads.api'

interface LeadDetailsModalProps {
  onTransferClick?: (lead: LeadInfo) => void
  isOpen: boolean
  onClose: () => void
  lead: LeadInfo | null
}

export const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({
  isOpen,
  onClose,
  lead,
  onTransferClick,
}) => {
  if (!isOpen || !lead) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base">
              {(lead.ownerName || 'L').charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {lead.ownerName || 'Lead Details'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ID: {lead.leadId} &bull; Category: {lead.category || 'General'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Main Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <Building className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Business Name</p>
                <p className="font-semibold text-slate-800 mt-0.5">{lead.businessName || '—'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <Mail className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Business Email</p>
                <p className="font-semibold text-slate-800 mt-0.5">{lead.businessEmail || '—'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Contact Number</p>
                <p className="font-semibold text-slate-800 mt-0.5">{lead.contact || '—'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">City / Location</p>
                <p className="font-semibold text-slate-800 mt-0.5">{lead.city || '—'}</p>
              </div>
            </div>
          </div>

          {/* Status & Funnel Details */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Status & Assignments
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-400 block mb-1">Sales Status</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                  {lead.leadStatus?.replace(/_/g, ' ') || 'PENDING'}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-400 block mb-1">Telecaller Status</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">
                  {lead.telecallerStatus?.replace(/_/g, ' ') || 'PENDING'}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-400 block mb-1">Funnel Type</span>
                <span className="text-xs font-semibold text-slate-800">
                  {lead.funnelType || 'N/A'}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-400 block mb-1">Assigned Sales User</span>
                <span className="text-xs font-semibold text-slate-800">
                  {lead.assginedUser || 'Not Assigned'}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-400 block mb-1">Telecaller</span>
                <span className="text-xs font-semibold text-slate-800">
                  {lead.telecallerAssigned || 'Not Assigned'}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-400 block mb-1">Lead Type</span>
                <span className="text-xs font-semibold text-slate-800">
                  {lead.leadType || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Additional details */}
          {(lead.description || lead.packageDescription || lead.paymentLink) && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Remarks & Payment
              </h4>
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                {lead.description && (
                  <div>
                    <span className="font-semibold text-slate-700">Description: </span>
                    <span className="text-slate-600">{lead.description}</span>
                  </div>
                )}
                {lead.packageDescription && (
                  <div>
                    <span className="font-semibold text-slate-700">Package Details: </span>
                    <span className="text-slate-600">{lead.packageDescription}</span>
                  </div>
                )}
                {lead.paymentLink && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">Payment Link: </span>
                    <a
                      href={lead.paymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline truncate max-w-sm"
                    >
                      {lead.paymentLink}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
