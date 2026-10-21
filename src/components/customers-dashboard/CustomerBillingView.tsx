import React, { useEffect, useState } from 'react'
import {
  fetchCustomerBillingDetails,
  saveCustomerBillingDetails,
  uploadBillingScreenshot,
  type CustomerBillingDetails,
} from './api/customer-features.api'
import { useCustomerSession } from '../../features/customers/hooks/useCustomerSession'
import {
  FileText,
  Download,
  Eye,
  CheckCircle,
  AlertCircle,
  Save,
  Upload,
  X,
  Loader2,
  RefreshCw,
  ExternalLink,
  Receipt,
} from 'lucide-react'

function formatMoney(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function getInvoiceStatusBadge(status?: string) {
  const s = (status || '').toUpperCase()
  if (s === 'PAID') {
    return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0', label: 'Paid' }
  }
  if (s === 'OVERDUE') {
    return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', label: 'Overdue' }
  }
  return { bg: '#fffbeb', text: '#d97706', border: '#fde68a', label: 'Due' }
}

export function CustomerBillingView() {
  const { session } = useCustomerSession()
  const [details, setDetails] = useState<CustomerBillingDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'invoices' | 'details'>('invoices')

  // Form State
  const [billingAddress, setBillingAddress] = useState('')
  const [hasGst, setHasGst] = useState<'yes' | 'no'>('no')
  const [gstNumber, setGstNumber] = useState('')
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingSS, setIsUploadingSS] = useState(false)

  // Preview Bill Modal
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewBillUrl, setPreviewBillUrl] = useState('')
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadData = async () => {
    if (!session?.email && !session?.customerId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const contact = session?.email || session?.username || ''
      const res = await fetchCustomerBillingDetails(contact)
      setDetails(res)
      setBillingAddress(res.billingAddress || '')
      const gst = res.gstNumber && res.gstNumber !== 'null' ? res.gstNumber : ''
      setGstNumber(gst)
      setHasGst(gst ? 'yes' : 'no')
      setPaymentScreenshotUrl(res.paymentLinkSS || '')
    } catch {
      setDetails(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [session?.email, session?.customerId])

  // Save Billing Information
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const payload = {
        ...details,
        billingAddress,
        gstNumber: hasGst === 'yes' ? gstNumber.trim().toUpperCase() : '',
        paymentLinkSS: paymentScreenshotUrl,
        email: session?.email || details?.email,
        phone: details?.phone || '',
      }
      await saveCustomerBillingDetails(payload)
      showToast('Billing details saved successfully!')
      await loadData()
    } catch (err: any) {
      showToast(err.message || 'Failed to save billing details', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  // Upload Payment Screenshot
  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingSS(true)
    try {
      const res = await uploadBillingScreenshot(file)
      if (res.url) {
        setPaymentScreenshotUrl(res.url)
        showToast('Payment screenshot uploaded!')
      }
    } catch {
      showToast('Failed to upload screenshot', 'error')
    } finally {
      setIsUploadingSS(false)
    }
  }

  // Parse invoices
  let billUrl = ''
  if (details?.generatedBillInfo) {
    if (typeof details.generatedBillInfo === 'string') {
      try {
        const parsed = JSON.parse(details.generatedBillInfo)
        billUrl = parsed.generatedBillInfo || parsed.billingLink || parsed.billUrl || details.generatedBillInfo
      } catch {
        billUrl = details.generatedBillInfo
      }
    } else if (typeof details.generatedBillInfo === 'object') {
      billUrl =
        details.generatedBillInfo.generatedBillInfo ||
        details.generatedBillInfo.billingLink ||
        details.generatedBillInfo.billUrl ||
        ''
    }
  }

  const invoices = Array.isArray(details?.invoices) && details?.invoices.length > 0
    ? details.invoices
    : billUrl
    ? [
        {
          id: 'INV-' + (session?.customerId || '101'),
          date: new Date().toISOString(),
          description: 'Package Subscription & Services',
          amount: details?.amountPaid || details?.totalPaid || 0,
          status: 'Paid',
          billUrl,
        },
      ]
    : []

  const totalPaid = details?.totalPaid ?? details?.amountPaid ?? 0
  const outstanding = details?.outstandingAmount ?? details?.amountPending ?? 0
  const activeSubs = details?.activeSubscriptions ?? (details?.serviceExpiration ? 1 : 0)
  const paymentDue = details?.paymentDue ?? details?.amountPending ?? 0

  return (
    <div style={{ padding: '24px 32px', minHeight: 'calc(100vh - 64px)', background: '#f8fafc' }}>
      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: '8px',
            background: toastMessage.type === 'success' ? '#10b981' : '#ef4444',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontWeight: 500,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {toastMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toastMessage.text}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Receipt size={18} />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Billing & Invoices
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Manage your billing profile, download invoices and monitor payments
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            fontSize: '13px',
            fontWeight: 600,
            color: '#334155',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        {/* Total Paid */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Total Paid</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#059669' }}>{formatMoney(totalPaid)}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Settled payments</div>
        </div>

        {/* Outstanding Balance */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
            Outstanding Balance
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: outstanding > 0 ? '#dc2626' : '#0f172a' }}>
            {formatMoney(outstanding)}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            {details?.outstandingNote || 'Current balance'}
          </div>
        </div>

        {/* Active Subscriptions */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
            Active Subscriptions
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#2563eb' }}>{activeSubs} Active</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            Exp: {formatDate(details?.serviceExpiration)}
          </div>
        </div>

        {/* Payment Due */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Payment Due</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: paymentDue > 0 ? '#d97706' : '#0f172a' }}>
            {formatMoney(paymentDue)}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            {details?.paymentDueNote || 'Latest invoice'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('invoices')}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            border: 'none',
            background: activeTab === 'invoices' ? '#0f172a' : 'transparent',
            color: activeTab === 'invoices' ? '#ffffff' : '#64748b',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Invoices & Receipts ({invoices.length})
        </button>

        <button
          onClick={() => setActiveTab('details')}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            border: 'none',
            background: activeTab === 'details' ? '#0f172a' : 'transparent',
            color: activeTab === 'details' ? '#ffffff' : '#64748b',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Billing Address & GST
        </button>
      </div>

      {/* Tab 1: Invoices */}
      {activeTab === 'invoices' && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          {loading ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: '#64748b' }}>
              <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block', color: '#4f46e5' }} />
              <span>Loading invoice history...</span>
            </div>
          ) : invoices.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: '#94a3b8' }}>
              <FileText size={36} style={{ margin: '0 auto 10px', display: 'block' }} />
              <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#1e293b' }}>No invoices generated yet</h4>
              <p style={{ margin: 0, fontSize: '13px' }}>Your bills and payment receipts will appear here automatically.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 }}>
                    <th style={{ padding: '12px 18px' }}>Invoice ID</th>
                    <th style={{ padding: '12px 18px' }}>Date</th>
                    <th style={{ padding: '12px 18px' }}>Description</th>
                    <th style={{ padding: '12px 18px' }}>Amount</th>
                    <th style={{ padding: '12px 18px' }}>Status</th>
                    <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, idx) => {
                    const badge = getInvoiceStatusBadge(inv.status)
                    const targetBillUrl = inv.billUrl || inv.billingLink || billUrl

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 18px', fontWeight: 600, color: '#0f172a' }}>{inv.id}</td>
                        <td style={{ padding: '14px 18px', color: '#64748b' }}>{formatDate(inv.date)}</td>
                        <td style={{ padding: '14px 18px', color: '#334155' }}>{inv.description}</td>
                        <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0f172a' }}>
                          {formatMoney(inv.amount)}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '999px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: badge.bg,
                              color: badge.text,
                              border: `1px solid ${badge.border}`,
                            }}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            {targetBillUrl ? (
                              <>
                                <button
                                  onClick={() => {
                                    setPreviewBillUrl(targetBillUrl)
                                    setPreviewOpen(true)
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    color: '#334155',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Eye size={12} /> Preview
                                </button>
                                <a
                                  href={targetBillUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  download
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: '#0f172a',
                                    color: '#ffffff',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                  }}
                                >
                                  <Download size={12} /> Download
                                </a>
                              </>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Generating...</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Billing & GST Form */}
      {activeTab === 'details' && (
        <form
          onSubmit={handleSaveDetails}
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            maxWidth: '680px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
            Billing Address & Tax Details
          </h3>

          {/* Billing Address */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Registered Billing Address
            </label>
            <textarea
              rows={3}
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              placeholder="Enter complete company legal billing address..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Has GST Toggle */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Are you registered for GST?
            </label>
            <div style={{ display: 'flex', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="hasGst"
                  checked={hasGst === 'yes'}
                  onChange={() => setHasGst('yes')}
                />
                Yes, I have GSTIN
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="hasGst"
                  checked={hasGst === 'no'}
                  onChange={() => {
                    setHasGst('no')
                    setGstNumber('')
                  }}
                />
                No (Unregistered)
              </label>
            </div>
          </div>

          {/* GSTIN Input */}
          {hasGst === 'yes' && (
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                GSTIN Number (15 Digits)
              </label>
              <input
                type="text"
                value={gstNumber}
                maxLength={15}
                onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                placeholder="22AAAAA0000A1Z5"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  textTransform: 'uppercase',
                }}
              />
            </div>
          )}

          {/* Payment Link Screenshot */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Payment Screenshot / Proof (Optional)
            </label>

            {paymentScreenshotUrl ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >
                <img
                  src={paymentScreenshotUrl}
                  alt="Proof"
                  style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>Screenshot attached</div>
                  <a
                    href={paymentScreenshotUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '11px', color: '#2563eb', textDecoration: 'none' }}
                  >
                    View Full Image
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentScreenshotUrl('')}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626' }}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  cursor: 'pointer',
                }}
              >
                {isUploadingSS ? (
                  <Loader2 size={20} className="animate-spin" color="#4f46e5" />
                ) : (
                  <>
                    <Upload size={20} color="#94a3b8" style={{ marginBottom: '6px' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      Click to upload payment screenshot
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>PNG, JPG or JPEG up to 5MB</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleScreenshotUpload}
                />
              </label>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSaving}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: '#0f172a',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Billing Changes
          </button>
        </form>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* BILL PREVIEW MODAL */}
      {/* ────────────────────────────────────────────────────────────── */}
      {previewOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '850px',
              width: '100%',
              height: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Invoice Document Preview</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a
                  href={previewBillUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    color: '#2563eb',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  Open in New Tab <ExternalLink size={13} />
                </a>
                <button
                  onClick={() => setPreviewOpen(false)}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, background: '#f1f5f9' }}>
              <iframe
                src={previewBillUrl}
                title="Bill Preview"
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
