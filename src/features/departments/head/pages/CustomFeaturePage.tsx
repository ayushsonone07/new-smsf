import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, CheckCircle, Clock, CreditCard, ExternalLink, Eye, FileText, IndianRupee, Receipt, Upload, User, Wallet, X } from 'lucide-react'
import { getSession } from '../../../../app/auth/session'
import {
  getBillingCustomers,
  updateBillingInvoice,
  uploadCustomerBill,
  type BillingCustomer,
} from '../../../../api/billing.api'
import {
  useDynamicColumns,
  useDynamicRoutes,
} from '../../../permissions/hooks/useDynamicPermissions'
import { isRouteMatch } from '../../../permissions/hooks/useDepartmentRoutePermissions'
import type { FeaturePermission } from '../../../permissions/types/permission.types'
import { useDepartmentCustomerRows } from '../../hooks/useDepartmentUsersList'
import type { DepartmentCustomerRowItem } from '../../../../api/department-users.api'
import { applyDynamicColumnOrder, readDynamicColumnOrder } from '../../../../utils/dynamicColumnOrder'
import './CustomFeaturePage.css'

function normalizedKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function valueForColumn(row: DepartmentCustomerRowItem, columnName: string): unknown {
  const nested = row.customerDetails && typeof row.customerDetails === 'object'
    ? row.customerDetails
    : {}
  const values = { ...nested, ...row } as Record<string, unknown>
  const target = normalizedKey(columnName)
  const directKey = Object.keys(values).find((key) => normalizedKey(key) === target)
  if (directKey) return values[directKey]

  const aliases: Record<string, string[]> = {
    customer: ['ownerName', 'customerName', 'name'],
    customername: ['ownerName', 'customerName', 'name'],
    business: ['businessName', 'brandName'],
    phone: ['phoneNumber', 'phone', 'contact'],
    number: ['phoneNumber', 'phone', 'contact'],
    email: ['email'],
    status: ['status', 'onboardingStatus'],
    billupload: ['generatedBillInfo', 'billUrl', 'billingLink', 'paymentLinkSS'],
  }
  for (const alias of aliases[target] ?? []) {
    if (values[alias] !== null && values[alias] !== undefined && values[alias] !== '') {
      return values[alias]
    }
  }
  return '—'
}

function billingObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object') return value as Record<string, unknown>
  if (typeof value !== 'string' || !value.trim()) return {}
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function billUrl(customer: BillingCustomer | null | undefined): string {
  if (!customer) return ''
  const raw = customer.generatedBillInfo
  if (typeof raw === 'string' && /^https?:\/\//i.test(raw.trim())) return raw.trim()
  const info = billingObject(raw)
  for (const key of ['generatedBillInfo', 'billingLink', 'billUrl']) {
    const value = info[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function billText(customer: BillingCustomer, keys: string[]): string {
  const info = billingObject(customer.generatedBillInfo)
  for (const key of keys) {
    const value = info[key]
    if (value !== undefined && value !== null && String(value).trim()) return String(value)
  }
  return ''
}

function currency(value: unknown): string {
  if (value === undefined || value === null || value === '') return '—'
  const number = Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(number)
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(number)
    : String(value)
}

/**
 * Dynamic screen for admin-created custom routes.
 * Displays any dynamic columns / components linked to this route in `access_customer_columns`.
 */
export function CustomFeaturePage({ feature }: { feature: FeaturePermission }) {
  const session = getSession()
  const departmentType = session?.user.departmentType || 'ONBOARDING_DEPARTMENT'
  const isHead = session?.user.role !== 'USER'

  const routesQuery = useDynamicRoutes(departmentType)
  const columnsQuery = useDynamicColumns(departmentType)
  const rowsQuery = useDepartmentCustomerRows(
    { page: 0, size: 2000, compatible: true },
    { enabled: Boolean(session && feature.slug) },
  )
  const hasBillingActions = useMemo(() => {
    const names = (columnsQuery.data ?? []).map((column) => normalizedKey(column.columnName))
    return names.some((name) => name === 'billupload' || name === 'view')
  }, [columnsQuery.data])
  const billingQuery = useQuery({
    queryKey: ['billing-customers', departmentType],
    queryFn: () => getBillingCustomers(100),
    enabled: Boolean(session && hasBillingActions),
    staleTime: 15_000,
  })
  const [uploadCustomer, setUploadCustomer] = useState<BillingCustomer | null>(null)
  const [detailsCustomer, setDetailsCustomer] = useState<BillingCustomer | null>(null)
  const [closingModal, setClosingModal] = useState<'upload' | 'details' | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [invoice, setInvoice] = useState({ invoiceNo: '', date: '', amount: '', status: 'PENDING', billingLink: '' })
  const [rowSearch, setRowSearch] = useState('')

  const closeUploadModal = () => {
    if (busy || closingModal) return
    setClosingModal('upload')
    window.setTimeout(() => {
      setUploadCustomer(null)
      setUploadFile(null)
      setClosingModal(null)
    }, 180)
  }

  const closeDetailsModal = () => {
    if (busy || closingModal) return
    setClosingModal('details')
    window.setTimeout(() => {
      setDetailsCustomer(null)
      setClosingModal(null)
    }, 180)
  }

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3500)
    return () => window.clearTimeout(timer)
  }, [toast])

  const billingById = useMemo(() => new Map(
    (billingQuery.data ?? []).map((customer) => [String(customer.id), customer]),
  ), [billingQuery.data])

  const customerForRow = (row: DepartmentCustomerRowItem): BillingCustomer => {
    const rowId = row.customerId ?? row.id
    const found = rowId !== undefined ? billingById.get(String(rowId)) : undefined
    if (found) return found
    const details = row.customerDetails ?? {}
    return {
      ...row,
      ...details,
      id: Number(rowId),
      ownerName: details.ownerName ?? row.ownerName,
      businessName: details.businessName ?? row.businessName,
      phoneNumber: details.phoneNumber ?? row.phoneNumber,
      email: details.email ?? row.email,
    } as BillingCustomer
  }

  const openDetails = (customer: BillingCustomer) => {
    const date = billText(customer, ['invoiceDate', 'date', 'generatedAt']) || customer.lastUpdated || customer.createdAt || ''
    setDetailsCustomer(customer)
    setInvoice({
      invoiceNo: billText(customer, ['invoiceNo', 'invoiceNumber', 'billId', 'id']) || `INV-${customer.id}`,
      date: date.slice(0, 10),
      amount: billText(customer, ['invoiceAmount', 'amount']) || String(customer.amountPending ?? customer.amountPaid ?? ''),
      status: customer.billStatus || 'PENDING',
      billingLink: billUrl(customer),
    })
    setError('')
  }

  const refreshBilling = async () => {
    const refreshed = await billingQuery.refetch()
    await rowsQuery.refetch()
    return refreshed.data ?? []
  }

  const saveInvoice = async () => {
    if (!detailsCustomer || !Number.isFinite(detailsCustomer.id)) return
    setBusy(true)
    setError('')
    try {
      const updated = await updateBillingInvoice(detailsCustomer.id, {
        invoiceNo: invoice.invoiceNo,
        invoiceDate: invoice.date,
        invoiceAmount: invoice.amount,
        status: invoice.status,
        billingLink: invoice.billingLink,
      })
      const customers = await refreshBilling()
      setDetailsCustomer(updated ?? customers.find((item) => item.id === detailsCustomer.id) ?? detailsCustomer)
      setToast({ type: 'success', message: 'Bill details saved successfully' })
    } catch (saveError) {
      setError((saveError as Error).message)
      setToast({ type: 'error', message: 'Failed to save bill details' })
    } finally {
      setBusy(false)
    }
  }

  const uploadBill = async () => {
    if (!uploadCustomer || !uploadFile) {
      setError('Select a bill file to upload.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await uploadCustomerBill(uploadCustomer.id, uploadFile)
      await refreshBilling()
      setUploadCustomer(null)
      setUploadFile(null)
      setToast({ type: 'success', message: 'Bill uploaded successfully' })
    } catch (uploadError) {
      setError((uploadError as Error).message)
      setToast({ type: 'error', message: 'Bill upload failed' })
    } finally {
      setBusy(false)
    }
  }

  const matchedRoute = useMemo(() => {
    return (routesQuery.data ?? []).find((r) => isRouteMatch(r, feature.slug))
  }, [routesQuery.data, feature.slug])

  const routeColumns = useMemo(() => {
    const allCols = columnsQuery.data ?? []
    if (!matchedRoute) return []
    const visibleColumns = allCols.filter((col) => {
      if (col.visibility === false || (col.visibility as unknown) === 0) {
        return false
      }
      if (isHead && (col.enableHead === false || (col.enableHead as unknown) === 0)) {
        return false
      }
      if (!isHead && (col.enableUser === false || (col.enableUser as unknown) === 0)) {
        return false
      }
      if (
        col.routeId === matchedRoute.routeId ||
        col.routesType === matchedRoute.routeId
      ) {
        return true
      }
      const colRoute = (col.routeName || '').trim().toLowerCase()
      const targetRoute = (matchedRoute.routeName || '').trim().toLowerCase()
      return Boolean(colRoute && colRoute === targetRoute)
    })
    return applyDynamicColumnOrder(
      visibleColumns,
      readDynamicColumnOrder(departmentType, matchedRoute.routeId),
    )
  }, [columnsQuery.data, matchedRoute, isHead, departmentType])

  const renderCell = (row: DepartmentCustomerRowItem, columnName: string) => {
    const key = normalizedKey(columnName)
    const customer = customerForRow(row)
    if (key === 'customer' || key === 'customername') {
      return (
        <div className="dynamic-customer-cell">
          <span>{displayValue(valueForColumn(row, columnName))}</span>
          <button className="dynamic-eye-button" type="button" title="Open billing details" aria-label={`Open billing details for ${customer.ownerName || 'customer'}`} onClick={() => openDetails(customer)}>
            <Eye size={16} />
          </button>
        </div>
      )
    }
    if (key === 'billupload') {
      return (
        <button className="dynamic-action-button" type="button" onClick={() => { setUploadCustomer(customer); setUploadFile(null); setError('') }} disabled={!Number.isFinite(customer.id)}>
          <Upload size={15} /> Upload
        </button>
      )
    }
    if (key === 'view') {
      const url = billUrl(customer)
      return url ? (
        <button className="dynamic-action-button dynamic-view-button" type="button" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
          <FileText size={15} /> View <ExternalLink size={12} />
        </button>
      ) : <span style={{ color: '#94a3b8' }}>No bill</span>
    }
    return displayValue(valueForColumn(row, columnName))
  }

  const filteredRows = useMemo(() => {
    const search = rowSearch.trim().toLowerCase()
    return (rowsQuery.data?.customers ?? []).filter((row) => {
      if (!search) return true
      return routeColumns.some((column) => displayValue(valueForColumn(row, column.columnName)).toLowerCase().includes(search))
    })
  }, [rowsQuery.data?.customers, rowSearch, routeColumns])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#2563eb',
            }}
          >
            {departmentType} • Dynamic Workspace
          </span>
          <h2 style={{ margin: '0.25rem 0', fontSize: '1.25rem', color: '#0f172a' }}>
            {feature.name}
          </h2>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
            {matchedRoute
              ? `Connected to dynamic route "${matchedRoute.routeName}" (ID: ${matchedRoute.routeId})`
              : feature.description}
          </p>
        </div>

        <div
          style={{
            padding: '0.45rem 0.85rem',
            borderRadius: '999px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1d4ed8',
            fontSize: '0.8125rem',
            fontWeight: 600,
          }}
        >
          {routeColumns.length} Active Dynamic Column{routeColumns.length === 1 ? '' : 's'}
        </div>
      </div>

      {routeColumns.length > 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '1.25rem 1.5rem',
          }}
        >
          <div className="dynamic-route-toolbar">
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>Route Data</h3>
            <span className="dynamic-route-count">
              {filteredRows.length} row{filteredRows.length === 1 ? '' : 's'}
            </span>
          </div>
          <label className="dynamic-search-field dynamic-search-field--full">
            <span aria-hidden="true">⌕</span>
            <input value={rowSearch} onChange={(event) => setRowSearch(event.target.value)} placeholder="Search by name, number or email" aria-label="Search customers" />
          </label>

          {rowsQuery.isPending ? (
            <div className="loading-state">Loading rows...</div>
          ) : rowsQuery.isError ? (
            <div className="error-state">
              <strong>Unable to load route rows</strong>
              <p>{rowsQuery.error.message}</p>
              <button className="primary-button" onClick={() => rowsQuery.refetch()}>Try Again</button>
            </div>
          ) : (
            <div className="table-wrapper" style={{ width: '100%', overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    {routeColumns.map((col) => <th key={col.columnId}>{col.columnName}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length > 0 ? (
                    filteredRows.map((row, index) => (
                      <tr key={String(row.customerId ?? row.id ?? index)}>
                        {routeColumns.map((col) => (
                          <td key={col.columnId}>{renderCell(row, col.columnName)}</td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={routeColumns.length} className="table-empty-cell">
                        No rows match your search or status filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="hpage-coming-soon" role="status">
          <svg
            className="hpage-coming-soon__illustration"
            viewBox="0 0 240 180"
            role="img"
            aria-label="Dynamic route ready"
          >
            <circle cx="120" cy="90" r="76" fill="#e8efff" />
            <path
              d="M53 131h134"
              fill="none"
              stroke="#b9c8e8"
              strokeLinecap="round"
              strokeWidth="5"
            />
            <rect
              x="74"
              y="51"
              width="92"
              height="69"
              rx="10"
              fill="#fff"
              stroke="#2459e0"
              strokeWidth="5"
            />
            <path d="M95 120h50l8 12H87l8-12Z" fill="#2459e0" />
            <path
              d="m104 78 12 12-12 12M122 102h19"
              fill="none"
              stroke="#ffc629"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="7"
            />
            <circle cx="177" cy="50" r="20" fill="#ffc629" />
            <path
              d="m168 50 6 6 12-13"
              fill="none"
              stroke="#172554"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="5"
            />
          </svg>

          <h2>{feature.name} Workspace Ready</h2>
          <p>
            You can attach dynamic columns and components to this route from{' '}
            <strong>Admin → Department Features → Add Dynamic Column</strong>.
          </p>
        </div>
      )}

      {uploadCustomer ? (
        <div className={`modal-backdrop billing-modal-backdrop${closingModal === 'upload' ? ' is-closing' : ''}`} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeUploadModal() }}>
          <div className={`modal billing-modal${closingModal === 'upload' ? ' is-closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="upload-bill-title">
            <div className="billing-modal__header">
              <div>
                <h2 className="billing-modal__title" id="upload-bill-title"><Upload size={20} color="#0284c7" /> Upload Bill</h2>
                <p className="billing-modal__subtitle">{uploadCustomer.ownerName || 'Customer'}{uploadCustomer.businessName ? ` · ${uploadCustomer.businessName}` : ''}</p>
              </div>
              <button className="close-button" type="button" aria-label="Close" disabled={busy} onClick={closeUploadModal}><X size={18} /></button>
            </div>
            <div className="billing-modal__body">
              <label className="billing-upload-drop">
                <Upload size={30} />
                <strong>{uploadFile ? 'Bill file selected' : 'Choose bill file'}</strong>
                <span>PDF, image, or document file</span>
                <input type="file" accept="application/pdf,image/*,.doc,.docx" onChange={(event) => { setUploadFile(event.target.files?.[0] ?? null); setError('') }} />
              </label>
              {uploadFile ? <p className="billing-upload-file">{uploadFile.name}</p> : null}
              {error ? <p className="billing-error" role="alert">{error}</p> : null}
              <div className="modal-actions">
                <button className="secondary-button" type="button" disabled={busy} onClick={closeUploadModal}>Cancel</button>
                <button className="primary-button" type="button" disabled={busy || !uploadFile} onClick={uploadBill}><Upload size={15} /> {busy ? 'Uploading...' : 'Upload Bill'}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {detailsCustomer ? (
        <div className={`modal-backdrop billing-modal-backdrop${closingModal === 'details' ? ' is-closing' : ''}`} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDetailsModal() }}>
          <div className={`modal billing-modal billing-modal--details${closingModal === 'details' ? ' is-closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="billing-details-title">
            <div className="billing-modal__header">
              <div>
                <h2 className="billing-modal__title" id="billing-details-title"><Receipt size={20} color="#2563eb" /> Billing &amp; Bills</h2>
                <p className="billing-modal__subtitle">{detailsCustomer.ownerName || 'Customer'}{detailsCustomer.businessName ? ` · ${detailsCustomer.businessName}` : ''} billing summary and payment information</p>
              </div>
              <button className="close-button" type="button" aria-label="Close" disabled={busy} onClick={closeDetailsModal}><X size={18} /></button>
            </div>
            <div className="billing-modal__body">
              <div className="billing-summary-grid">
                <div className="billing-summary-card"><i className="billing-summary-card__icon is-green"><CheckCircle size={18} /></i><span>Total Paid</span><strong>{currency(detailsCustomer.amountPaid)}</strong><small>Lifetime, incl. GST</small></div>
                <div className="billing-summary-card"><i className="billing-summary-card__icon is-amber"><Clock size={18} /></i><span>Outstanding</span><strong>{currency(detailsCustomer.amountPending)}</strong><small>Awaiting bill generation</small></div>
                <div className="billing-summary-card"><i className="billing-summary-card__icon is-blue"><CreditCard size={18} /></i><span>Active Subscriptions</span><strong>{detailsCustomer.status ? '1' : '—'}</strong><small>{detailsCustomer.status || '—'}</small></div>
                <div className="billing-summary-card billing-summary-card--due"><i className="billing-summary-card__icon is-due"><IndianRupee size={18} /></i><span>Payment Due</span><strong>{currency(detailsCustomer.amountPending)}</strong><small>{detailsCustomer.lastUpdated ? `Last updated ${new Date(detailsCustomer.lastUpdated).toLocaleDateString('en-IN')}` : '—'}</small></div>
              </div>
              <div className="billing-info-grid">
                <section className="billing-info-card">
                  <h3><User size={15} /> Customer Information</h3>
                  <div className="billing-detail-grid">
                    <div><span>Customer Name</span><strong>{detailsCustomer.ownerName || '—'}</strong></div>
                    <div><span>Business Name</span><strong>{detailsCustomer.businessName || '—'}</strong></div>
                    <div><span>Phone</span><strong>{detailsCustomer.phoneNumber || '—'}</strong></div>
                    <div><span>Email</span><strong>{detailsCustomer.email || '—'}</strong></div>
                    <div><span>Address</span><strong>{detailsCustomer.address || '—'}</strong></div>
                  </div>
                </section>
                <section className="billing-info-card">
                  <h3><Wallet size={15} /> Payment &amp; GST</h3>
                  <div className="billing-detail-grid">
                    <div><span>Billing Address</span><strong>{detailsCustomer.billingAddress || '—'}</strong></div>
                    <div><span>GST Number</span><strong>{detailsCustomer.gstNumber || '—'}</strong></div>
                    <div><span>Information Status</span><strong>{detailsCustomer.informationStatus || '—'}</strong></div>
                    <div><span>Uploaded Bill</span><strong>{billUrl(detailsCustomer) ? 'Available' : 'Not uploaded'}</strong></div>
                  </div>
                </section>
              </div>
              <div className="billing-bottom-grid">
              <section className="billing-info-card billing-invoice">
                <h3><FileText size={15} /> Invoices</h3>
                <div className="billing-invoice-head"><span>Invoice</span><span>Date</span><span>Amount</span><span>Status</span></div>
                <div className="billing-invoice-grid">
                  <div className="billing-field"><label htmlFor="invoice-number">Invoice No</label><input id="invoice-number" value={invoice.invoiceNo} onChange={(event) => setInvoice((value) => ({ ...value, invoiceNo: event.target.value }))} /></div>
                  <div className="billing-field"><label htmlFor="invoice-date">Date</label><input id="invoice-date" type="date" value={invoice.date} onChange={(event) => setInvoice((value) => ({ ...value, date: event.target.value }))} /></div>
                  <div className="billing-field"><label htmlFor="invoice-amount">Amount</label><input id="invoice-amount" value={invoice.amount} onChange={(event) => setInvoice((value) => ({ ...value, amount: event.target.value }))} /></div>
                  <div className="billing-field"><label htmlFor="invoice-status">Status</label><select id="invoice-status" value={invoice.status} onChange={(event) => setInvoice((value) => ({ ...value, status: event.target.value }))}><option value="PENDING">Pending</option><option value="IN_PROGRESS">In Progress</option><option value="GENERATED">Generated</option></select></div>
                </div>
                <div className="billing-link-row">
                  <div className="billing-field"><label htmlFor="invoice-link">Invoice / Bill Link</label><input id="invoice-link" value={invoice.billingLink} placeholder="https://..." onChange={(event) => setInvoice((value) => ({ ...value, billingLink: event.target.value }))} /></div>
                  <button className="primary-button" type="button" disabled={busy} onClick={saveInvoice}><Check size={15} /> {busy ? 'Saving...' : 'Save Invoice'}</button>
                </div>
                {error ? <p className="billing-error" role="alert">{error}</p> : null}
              </section>
              <aside className="billing-side-stack">
                <section className="billing-info-card billing-purchase-card">
                  <h3><Receipt size={15} /> What You Purchased</h3>
                  <p>No purchase history available</p>
                </section>
                <section className="billing-info-card">
                  <h3><CreditCard size={15} /> Payment &amp; GST</h3>
                  <div className="billing-side-row"><span>GST Number</span><strong>{detailsCustomer.gstNumber || '—'}</strong></div>
                  <div className="billing-side-row"><span>Total Paid</span><strong>{currency(detailsCustomer.amountPaid)}</strong></div>
                  <div className="billing-side-row"><span>Outstanding</span><strong>{currency(detailsCustomer.amountPending)}</strong></div>
                </section>
              </aside>
              </div>
              <div className="modal-actions"><button className="secondary-button" type="button" onClick={closeDetailsModal}>Close</button></div>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? <div className={`billing-toast billing-toast--${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>{toast.message}</div> : null}
    </div>
  )
}
