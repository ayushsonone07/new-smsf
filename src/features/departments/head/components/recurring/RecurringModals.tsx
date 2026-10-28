import { useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, X } from 'lucide-react'
import {
  BILLING_CYCLES,
  PAYMENT_MODES,
  getRecurringDetail,
  recordRecurringPayment,
  updateRecurringDue,
  type RecurringDue,
  type RecurringUpdatePayload,
} from '../../../../../api/recurring.api'
import { formatCurrency, formatDate } from './recurringFormat'

const label = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

/** yyyy-MM-dd in the browser's time zone */
const todayIso = () => new Date().toLocaleDateString('en-CA')

const inputClass =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100'

/** Invalidate everything the dashboard shows after a save. */
function useRecurringInvalidation() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['recurring-dues'] }),
      queryClient.invalidateQueries({ queryKey: ['recurring-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['recurring-detail'] }),
    ])
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label: text, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-slate-600">{text}</span>
      {children}
    </label>
  )
}

function ModalFooter({
  onClose,
  pending,
  submitLabel,
  error,
}: {
  onClose: () => void
  pending: boolean
  submitLabel: string
  error: string | null
}) {
  return (
    <div className="border-t border-slate-100 p-5 space-y-3">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Update / follow-up

interface UpdateForm {
  totalAmount: string
  dueDate: string
  billingCycle: string
  nextFollowUpDate: string
  promiseToPayDate: string
  promiseAmount: string
  nonPaymentReason: string
}

function toForm(due: RecurringDue): UpdateForm {
  return {
    totalAmount: due.totalAmount === null ? '' : String(due.totalAmount),
    dueDate: due.dueDate ?? '',
    billingCycle: due.billingCycle ?? '',
    nextFollowUpDate: due.nextFollowUpDate ?? '',
    promiseToPayDate: due.promiseToPayDate ?? '',
    promiseAmount: due.promiseAmount === null ? '' : String(due.promiseAmount),
    nonPaymentReason: due.nonPaymentReason ?? '',
  }
}

export function RecurringUpdateModal({ due, onClose }: { due: RecurringDue; onClose: () => void }) {
  const initial = toForm(due)
  const [form, setForm] = useState<UpdateForm>(initial)
  const [writtenOff, setWrittenOff] = useState(due.stage === 'WRITTEN_OFF')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const invalidate = useRecurringInvalidation()

  const mutation = useMutation({
    mutationFn: (payload: RecurringUpdatePayload) => updateRecurringDue(due.customerId, due.serviceType, payload),
    onSuccess: async () => {
      await invalidate()
      onClose()
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not save'),
  })

  const set = (key: keyof UpdateForm) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }))

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    // Send only what changed; a cleared field is sent as '' so the backend removes it.
    const payload: RecurringUpdatePayload = {}
    ;(Object.keys(form) as (keyof UpdateForm)[]).forEach((key) => {
      if (form[key].trim() !== initial[key]) payload[key] = form[key].trim()
    })
    if (writtenOff !== (due.stage === 'WRITTEN_OFF')) payload.writtenOff = writtenOff
    if (note.trim()) payload.note = note.trim()
    if (Object.keys(payload).length === 0) {
      setError('Nothing changed.')
      return
    }
    mutation.mutate(payload)
  }

  return (
    <ModalShell title="Update account" subtitle={due.businessName ?? undefined} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5">
          <Field label="Total amount (₹)">
            <input
              className={inputClass}
              inputMode="decimal"
              value={form.totalAmount}
              onChange={(e) => set('totalAmount')(e.target.value)}
              placeholder="e.g. 12000"
            />
          </Field>
          <Field label="Billing cycle">
            <select className={inputClass} value={form.billingCycle} onChange={(e) => set('billingCycle')(e.target.value)}>
              <option value="">Not set</option>
              {BILLING_CYCLES.map((cycle) => (
                <option key={cycle} value={cycle}>
                  {label(cycle)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Payment due date">
            <input type="date" className={inputClass} value={form.dueDate} onChange={(e) => set('dueDate')(e.target.value)} />
          </Field>
          <Field label="Next follow-up">
            <input
              type="date"
              className={inputClass}
              value={form.nextFollowUpDate}
              onChange={(e) => set('nextFollowUpDate')(e.target.value)}
            />
          </Field>
          <Field label="Promised to pay on">
            <input
              type="date"
              className={inputClass}
              value={form.promiseToPayDate}
              onChange={(e) => set('promiseToPayDate')(e.target.value)}
            />
          </Field>
          <Field label="Promised amount (₹)">
            <input
              className={inputClass}
              inputMode="decimal"
              value={form.promiseAmount}
              onChange={(e) => set('promiseAmount')(e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Reason for not paying">
              <input
                className={inputClass}
                maxLength={500}
                value={form.nonPaymentReason}
                onChange={(e) => set('nonPaymentReason')(e.target.value)}
                placeholder="e.g. Budget issue, not reachable, wants to cancel"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Note (saved in history)">
              <textarea
                className={`${inputClass} min-h-[72px]`}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What happened on the call?"
              />
            </Field>
          </div>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={writtenOff} onChange={(e) => setWrittenOff(e.target.checked)} />
            Written off (will not be collected)
          </label>
          {!due.amountsFromRecurring && (
            <p className="sm:col-span-2 text-xs text-slate-500">
              The current amounts come from the customer record. Saving copies them here, and Recurring keeps its own
              amounts from then on.
            </p>
          )}
        </div>
        <ModalFooter onClose={onClose} pending={mutation.isPending} submitLabel="Save" error={error} />
      </form>
    </ModalShell>
  )
}

// ---------------------------------------------------------------- Record payment

export function RecordPaymentModal({ due, onClose }: { due: RecurringDue; onClose: () => void }) {
  const [amount, setAmount] = useState(due.amountPending ? String(due.amountPending) : '')
  const [paidAt, setPaidAt] = useState(todayIso())
  const [mode, setMode] = useState<string>('UPI')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const invalidate = useRecurringInvalidation()

  const mutation = useMutation({
    mutationFn: () =>
      recordRecurringPayment(due.customerId, due.serviceType, {
        amount: amount.trim(),
        paidAt,
        mode,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
      }),
    onSuccess: async () => {
      await invalidate()
      onClose()
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not record payment'),
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const value = Number(amount)
    if (!amount.trim() || !Number.isFinite(value) || value <= 0) {
      setError('Enter an amount greater than 0.')
      return
    }
    mutation.mutate()
  }

  return (
    <ModalShell
      title="Record payment"
      subtitle={`${due.businessName ?? ''} · Pending ${formatCurrency(due.amountPending)}`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5">
          <Field label="Amount received (₹)">
            <input
              className={inputClass}
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
          </Field>
          <Field label="Paid on">
            <input type="date" className={inputClass} value={paidAt} max={todayIso()} onChange={(e) => setPaidAt(e.target.value)} />
          </Field>
          <Field label="Mode">
            <select className={inputClass} value={mode} onChange={(e) => setMode(e.target.value)}>
              {PAYMENT_MODES.map((m) => (
                <option key={m} value={m}>
                  {label(m)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Reference / UTR">
            <input className={inputClass} maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Note">
              <input className={inputClass} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </div>
        </div>
        <ModalFooter onClose={onClose} pending={mutation.isPending} submitLabel="Record payment" error={error} />
      </form>
    </ModalShell>
  )
}

// ---------------------------------------------------------------- History

export function RecurringHistoryModal({ due, onClose }: { due: RecurringDue; onClose: () => void }) {
  const detailQuery = useQuery({
    queryKey: ['recurring-detail', due.customerId, due.serviceType],
    queryFn: () => getRecurringDetail(due.customerId, due.serviceType),
  })
  const detail = detailQuery.data

  return (
    <ModalShell title="Payments & history" subtitle={due.businessName ?? undefined} onClose={onClose} wide>
      <div className="p-5 space-y-6">
        {detailQuery.isPending ? (
          <div className="py-10 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : detailQuery.isError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {detailQuery.error instanceof Error ? detailQuery.error.message : 'Could not load history'}
          </p>
        ) : (
          <>
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900">Payments</h3>
              {detail?.payments.length ? (
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Paid on</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Mode</th>
                        <th className="px-3 py-2">Reference</th>
                        <th className="px-3 py-2">Recorded by</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detail.payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-3 py-2">{formatDate(payment.paidAt)}</td>
                          <td className="px-3 py-2 font-semibold text-emerald-700">{formatCurrency(payment.amount)}</td>
                          <td className="px-3 py-2">{label(payment.mode)}</td>
                          <td className="px-3 py-2 text-slate-500">{payment.reference || '—'}</td>
                          <td className="px-3 py-2 text-xs text-slate-500">{payment.recordedBy || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No payments recorded in Recurring yet.</p>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900">Activity</h3>
              {detail?.activity.length ? (
                <ol className="space-y-2">
                  {detail.activity.map((entry, index) => (
                    <li key={`${entry.at}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">{label(entry.type)}</span>
                        <span>
                          {formatDate(entry.at)} · {entry.by}
                        </span>
                      </div>
                      {entry.changes && (
                        <div className="mt-1 text-xs text-slate-600">
                          {Object.entries(entry.changes)
                            .map(([key, value]) => `${key}: ${value === '' ? 'cleared' : String(value)}`)
                            .join(' · ')}
                        </div>
                      )}
                      {entry.note && <p className="mt-1 text-sm text-slate-800">{entry.note}</p>}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-slate-400">No activity yet.</p>
              )}
            </section>
          </>
        )}
      </div>
    </ModalShell>
  )
}
