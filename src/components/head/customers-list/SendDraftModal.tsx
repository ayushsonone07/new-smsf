import React, { useState } from 'react'
import { Loader2, FileText, Send, X } from 'lucide-react'

export interface SendDraftModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (draftLink: string, remark: string) => Promise<void> | void
  customerName: string
  customerEmail: string
  isLoading?: boolean
}

export const SendDraftModal: React.FC<SendDraftModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  customerName,
  customerEmail,
  isLoading = false,
}) => {
  const [draftLink, setDraftLink] = useState('')
  const [remark, setRemark] = useState('')
  const [error, setError] = useState('')

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleSubmit = () => {
    setError('')

    if (!draftLink.trim()) {
      setError('Draft link is required')
      return
    }

    if (!validateUrl(draftLink.trim())) {
      setError('Please enter a valid URL')
      return
    }

    onSubmit(draftLink.trim(), remark.trim())
  }

  const handleClose = () => {
    setDraftLink('')
    setRemark('')
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150"
      onClick={!isLoading ? handleClose : undefined}
    >
      <div
        className="w-full max-w-[500px] bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <FileText className="h-5 w-5 text-teal-600" />
              <span>Send Website Draft</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Send the website draft link to the client via email
            </p>
          </div>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            onClick={handleClose}
            disabled={isLoading}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <label htmlFor="customerName" className="block text-xs font-semibold text-slate-700">
              Client Name
            </label>
            <input
              id="customerName"
              type="text"
              value={customerName}
              disabled
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="customerEmail" className="block text-xs font-semibold text-slate-700">
              Client Email
            </label>
            <input
              id="customerEmail"
              type="email"
              value={customerEmail}
              disabled
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="draftLink" className="block text-xs font-semibold text-slate-700">
              Draft Link <span className="text-red-500">*</span>
            </label>
            <input
              id="draftLink"
              type="url"
              placeholder="https://example.com/draft"
              value={draftLink}
              onChange={(e) => {
                setDraftLink(e.target.value)
                setError('')
              }}
              disabled={isLoading}
              className={`w-full px-3 py-2 text-sm bg-white border rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors ${
                error ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'
              }`}
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="remark" className="block text-xs font-semibold text-slate-700">
              Remark <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="remark"
              placeholder="Add any notes about this draft..."
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              disabled={isLoading}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Send Draft</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SendDraftModal
