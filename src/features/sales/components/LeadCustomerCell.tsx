import { useState } from 'react'
import { Check, Copy, Mail, Phone } from 'lucide-react'
import type { LeadInfo } from '../../../api/leads.api'

function hasValue(value?: string | null): value is string {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return !['', 'na', 'n/a', 'null', 'undefined'].includes(normalized)
}

function getLeadCustomerDisplay(lead: LeadInfo): { name: string; initial: string } {
  if (hasValue(lead.ownerName)) {
    const name = lead.ownerName.trim()
    return { name, initial: name.charAt(0).toUpperCase() }
  }

  if (hasValue(lead.businessName)) {
    const name = lead.businessName.trim()
    return { name, initial: name.charAt(0).toUpperCase() }
  }

  if (lead.businessEmail?.includes('@')) {
    const name = lead.businessEmail
      .split('@')[0]
      .replace(/[._0-9]/g, ' ')
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
    if (name) return { name, initial: name.charAt(0).toUpperCase() }
  }

  const name = lead.contact
    ? `Lead ${lead.contact}`
    : `Lead #${lead.leadId?.slice(-4) || '—'}`
  return { name, initial: 'L' }
}

function CopyValueButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const copyValue = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      // Clipboard access can be unavailable in non-secure browser contexts.
    }
  }

  return (
    <button
      type="button"
      onClick={copyValue}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
      title={copied ? 'Copied' : `Copy ${label}`}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  )
}

export function LeadCustomerCell({ lead }: { lead: LeadInfo }) {
  const customer = getLeadCustomerDisplay(lead)
  const businessName = hasValue(lead.businessName) ? lead.businessName.trim() : ''
  const showBusinessBadge =
    businessName && businessName.toLowerCase() !== customer.name.toLowerCase()

  return (
    <div className="flex min-w-0 items-center gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-base font-semibold text-indigo-600">
        {customer.initial}
      </span>

      <div className="min-w-0 space-y-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <strong className="truncate text-base font-semibold leading-5 text-slate-900" title={customer.name}>
            {customer.name}
          </strong>
          {showBusinessBadge && (
            <span
              className="max-w-[150px] truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600"
              title={businessName}
            >
              {businessName}
            </span>
          )}
        </div>

        {lead.businessEmail && (
          <div className="flex min-w-0 items-center gap-2 text-[13px] leading-5 text-slate-600">
            <Mail size={15} className="shrink-0 text-slate-500" />
            <span className="truncate" title={lead.businessEmail}>{lead.businessEmail}</span>
            <CopyValueButton value={lead.businessEmail} label="email" />
          </div>
        )}

        {lead.contact && (
          <div className="flex min-w-0 items-center gap-2 text-[13px] leading-5 text-slate-600">
            <Phone size={15} className="shrink-0 text-slate-500" />
            <span className="truncate" title={lead.contact}>{lead.contact}</span>
            <CopyValueButton value={lead.contact} label="phone number" />
          </div>
        )}
      </div>
    </div>
  )
}
