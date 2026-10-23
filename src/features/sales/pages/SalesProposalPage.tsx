import { useEffect, useMemo, useState } from 'react'
import { Copy, Eye, EyeOff, ExternalLink, Loader2, Mail, RefreshCw } from 'lucide-react'
import {
  generateSalesPaymentLink,
  getSalesPackages,
  previewSalesProposal,
  sendSalesProposal,
  verifySalesKey,
  type SalesPackage,
  type SalesProposalPayload,
} from '../../../api/sales-proposal.api'

type FormState = Omit<SalesProposalPayload, 'amount' | 'secretKey'> & { amount: string }
type PendingAction = 'link' | 'send'
const KEY_STORAGE = 'sales-proposal-verified-key'
const MIN_AMOUNT = 100
const MAX_AMOUNT = 500000

const initialForm: FormState = {
  packageKey: '', ownerName: '', businessName: '', customerEmail: '', customerPhone: '',
  salesName: '', designation: '', salesPhone: '', salesEmail: '', ccType: 'cc', amount: '', paymentLink: '',
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

export function SalesProposalPage() {
  const [form, setForm] = useState<FormState>(initialForm)
  const [packages, setPackages] = useState<SalesPackage[]>([])
  const [preview, setPreview] = useState('')
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [loading, setLoading] = useState<PendingAction | null>(null)
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [secretOpen, setSecretOpen] = useState(false)
  const [secretVisible, setSecretVisible] = useState(false)
  const [secret, setSecret] = useState('')
  const [verifiedSecret, setVerifiedSecret] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction>('link')

  const set = (key: keyof FormState, value: string) => {
    setNotice(null)
    setForm((current) => {
      const next = { ...current, [key]: value }
      if (['customerPhone', 'customerEmail', 'amount', 'packageKey'].includes(key)) next.paymentLink = ''
      return next
    })
  }

  const payload = useMemo<SalesProposalPayload>(() => ({
    ...form,
    customerPhone: form.customerPhone.replace(/\D/g, '').slice(-10),
    amount: form.amount.trim() ? Number(form.amount) : null,
  }), [form])

  const linkErrors = useMemo(() => {
    const errors: string[] = []
    if (!payload.packageKey) errors.push('package')
    if (!payload.ownerName.trim()) errors.push('customer name')
    if (!/^\S+@\S+\.\S+$/.test(payload.customerEmail)) errors.push('customer email')
    if (!/^[6-9]\d{9}$/.test(payload.customerPhone)) errors.push('10-digit customer phone')
    if (payload.amount == null || !Number.isFinite(payload.amount) || payload.amount < MIN_AMOUNT || payload.amount > MAX_AMOUNT) errors.push(`amount (₹${MIN_AMOUNT.toLocaleString('en-IN')}–₹${MAX_AMOUNT.toLocaleString('en-IN')})`)
    if (!payload.salesName.trim()) errors.push('sales person name')
    return errors
  }, [payload])

  const sendErrors = useMemo(() => {
    const errors = [...linkErrors]
    if (!payload.salesPhone.trim()) errors.push('sales person phone')
    if (payload.salesEmail && !/^\S+@\S+\.\S+$/.test(payload.salesEmail)) errors.push('sales person email')
    if (!payload.paymentLink) errors.push('generated payment link')
    return errors
  }, [linkErrors, payload])

  useEffect(() => {
    let active = true
    getSalesPackages().then((list) => {
      if (!active) return
      setPackages(list)
      setForm((current) => current.packageKey || !list.length ? current : { ...current, packageKey: list[0].key })
    }).catch((error) => active && setNotice({ kind: 'error', text: errorText(error, 'Could not load packages') }))
    return () => { active = false }
  }, [])

  async function refreshPreview() {
    if (!payload.packageKey) return
    setLoadingPreview(true)
    try { setPreview(await previewSalesProposal(payload)) }
    catch (error) { setPreview(''); setNotice({ kind: 'error', text: errorText(error, 'Preview unavailable') }) }
    finally { setLoadingPreview(false) }
  }

  useEffect(() => { void refreshPreview() }, [payload.packageKey]) // package template only; refresh after field edits is manual

  function requireKey(action: PendingAction) {
    if (action === 'link' && linkErrors.length) {
      setNotice({ kind: 'error', text: `Complete: ${linkErrors.join(', ')}.` }); return
    }
    if (action === 'send' && sendErrors.length) {
      setNotice({ kind: 'error', text: `Complete: ${sendErrors.join(', ')}.` }); return
    }
    if (verifiedSecret) { void runAction(action, verifiedSecret); return }
    setPendingAction(action); setSecretOpen(true)
  }

  async function runAction(action: PendingAction, key: string) {
    setLoading(action); setNotice(null)
    try {
      if (action === 'link') {
        const link = await generateSalesPaymentLink({ ...payload, secretKey: key })
        setForm((current) => ({ ...current, paymentLink: link }))
        setNotice({ kind: 'success', text: 'Payment link generated. Refresh preview to include it in the email.' })
      } else {
        const message = await sendSalesProposal({ ...payload, secretKey: key })
        setNotice({ kind: 'success', text: message })
      }
    } catch (error) { setNotice({ kind: 'error', text: errorText(error, `Could not ${action === 'link' ? 'generate the link' : 'send the proposal'}`) }) }
    finally { setLoading(null) }
  }

  async function verifyAndContinue() {
    if (!secret.trim()) return
    setVerifying(true)
    try {
      await verifySalesKey(secret.trim())
      window.sessionStorage.setItem(KEY_STORAGE, secret.trim())
      setVerifiedSecret(secret.trim()); setSecretOpen(false)
      await runAction(pendingAction, secret.trim())
    } catch (error) { setNotice({ kind: 'error', text: errorText(error, 'Invalid sales key') }) }
    finally { setVerifying(false) }
  }

  useEffect(() => {
    const stored = window.sessionStorage.getItem(KEY_STORAGE)
    if (!stored) return
    verifySalesKey(stored).then(() => { setSecret(stored); setVerifiedSecret(stored) }).catch(() => window.sessionStorage.removeItem(KEY_STORAGE))
  }, [])

  async function copyLink() {
    if (!form.paymentLink) return
    await navigator.clipboard.writeText(form.paymentLink)
    setNotice({ kind: 'success', text: 'Payment link copied.' })
  }

  const input = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
  const label = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600'

  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">MBG Sales</p><h1 className="mt-1 text-3xl font-extrabold text-slate-950">Sales Proposal & Payment Link</h1><p className="mt-1 text-sm text-slate-500">Generate a Razorpay link, preview the approved package email, then send it to the customer.</p></div>
        {verifiedSecret && <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">Key verified for this tab</span>}
      </header>
      {notice && <div className={`mb-5 rounded-xl border px-4 py-3 text-sm font-medium ${notice.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{notice.text}</div>}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className={label}>Package *</label><select className={input} value={form.packageKey} onChange={(e) => set('packageKey', e.target.value)}>{packages.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></div>
            <div><label className={label}>Customer name *</label><input className={input} value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} /></div>
            <div><label className={label}>Business name</label><input className={input} value={form.businessName} onChange={(e) => set('businessName', e.target.value)} /></div>
            <div className="sm:col-span-2"><label className={label}>Customer email *</label><input className={input} type="email" value={form.customerEmail} onChange={(e) => set('customerEmail', e.target.value)} placeholder="customer@example.com" /></div>
            <div><label className={label}>Customer phone *</label><input className={input} inputMode="numeric" maxLength={10} value={form.customerPhone} onChange={(e) => set('customerPhone', e.target.value.replace(/\D/g, ''))} placeholder="10-digit number" /></div>
            <div><label className={label}>Amount (₹) *</label><input className={input} inputMode="decimal" value={form.amount} onChange={(e) => /^\d{0,6}(\.\d{0,2})?$/.test(e.target.value) && set('amount', e.target.value)} placeholder="101.00" /></div>
            <div><label className={label}>Sales person name *</label><input className={input} value={form.salesName} onChange={(e) => set('salesName', e.target.value)} /></div>
            <div><label className={label}>Designation</label><input className={input} value={form.designation} onChange={(e) => set('designation', e.target.value)} placeholder="Business Consultant" /></div>
            <div><label className={label}>Sales phone *</label><input className={input} value={form.salesPhone} onChange={(e) => set('salesPhone', e.target.value)} /></div>
            <div><label className={label}>Sales email (optional)</label><input className={input} type="email" value={form.salesEmail} onChange={(e) => set('salesEmail', e.target.value)} /></div>
            <div><label className={label}>Sales email as</label><select className={input} value={form.ccType} onChange={(e) => set('ccType', e.target.value)}><option value="cc">CC</option><option value="bcc">BCC</option></select></div>
            <div className="sm:col-span-2"><label className={label}>Payment link *</label><div className="flex gap-2"><input className={`${input} bg-slate-50`} readOnly value={form.paymentLink} placeholder="Generate link first" /><button type="button" title="Copy link" onClick={() => void copyLink()} disabled={!form.paymentLink} className="rounded-xl border border-slate-300 px-3 text-slate-600 disabled:opacity-40"><Copy size={17} /></button>{form.paymentLink && <a title="Open payment link" href={form.paymentLink} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-300 px-3 py-2 text-slate-600"><ExternalLink size={17} /></a>}</div></div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => requireKey('link')} disabled={loading !== null} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">{loading === 'link' && <Loader2 size={17} className="animate-spin" />}{form.paymentLink ? 'Regenerate payment link' : 'Generate payment link'}</button><button type="button" onClick={() => requireKey('send')} disabled={loading !== null} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">{loading === 'send' ? <Loader2 size={17} className="animate-spin" /> : <Mail size={17} />}Send proposal email</button></div>
          <p className="mt-3 text-xs text-slate-500">The link is generated for this customer phone and amount. Editing package, phone, email or amount clears the old link.</p>
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-3"><div><h2 className="font-bold text-slate-900">Email preview</h2><p className="text-xs text-slate-500">Use Refresh after editing customer details.</p></div><button type="button" onClick={() => void refreshPreview()} disabled={loadingPreview} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"> <RefreshCw size={14} className={loadingPreview ? 'animate-spin' : ''} />Refresh</button></div><iframe title="Sales proposal email preview" srcDoc={preview} className="h-[720px] w-full bg-white" /></section>
      </div>
    </div>
    {secretOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-lg font-extrabold text-slate-950">Verify sales key</h2><p className="mt-1 text-sm text-slate-500">Required before generating a payment link or sending an email. It is retained only for this browser tab.</p><label className={`${label} mt-5`}>Sales key</label><div className="relative"><input autoFocus className={`${input} pr-11`} type={secretVisible ? 'text' : 'password'} value={secret} onChange={(e) => setSecret(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void verifyAndContinue()} /><button type="button" onClick={() => setSecretVisible((v) => !v)} className="absolute inset-y-0 right-0 px-3 text-slate-500">{secretVisible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setSecretOpen(false)} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancel</button><button type="button" onClick={() => void verifyAndContinue()} disabled={verifying || !secret.trim()} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{verifying ? 'Verifying…' : pendingAction === 'link' ? 'Verify & generate' : 'Verify & send'}</button></div></div></div>}
  </main>
}
