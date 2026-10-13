import { useState, useEffect } from 'react'
import { CustomerWelcomeBanner } from './CustomerWelcomeBanner'
import { UpcomingMeetingBanner } from './UpcomingMeetingBanner'
import { CustomerServicesSection } from './CustomerServicesSection'
import { LatestUpdatesCard } from './LatestUpdatesCard'
import { CustomerHelpCenterCard } from './CustomerHelpCenterCard'
import { Icon } from '../head/shared/Icon'
import {
  fetchCustomerDashboardData,
  submitCustomerTicket,
} from './api/customer-dashboard.api'
import type {
  CreateTicketInput,
  CustomerDashboardData,
} from './types/customer-dashboard.types'

function formatStatus(value?: string) {
  const normalized = (value || 'PENDING').replace(/_/g, ' ').toLowerCase()
  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function statusClass(value?: string) {
  const normalized = (value || '').toUpperCase()
  if (normalized === 'GENERATED' || normalized === 'COMPLETED') return 'complete'
  if (normalized.includes('PROGRESS')) return 'progress'
  return 'pending'
}

export function CustomerDashboardView() {
  const [data, setData] = useState<CustomerDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isDownloadingBill, setIsDownloadingBill] = useState(false)

  useEffect(() => {
    let isMounted = true
    async function loadData() {
      try {
        const res = await fetchCustomerDashboardData()
        if (isMounted) {
          setData(res)
        }
      } catch (err) {
        console.error('Failed to load customer dashboard data:', err)
        if (isMounted) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load dashboard data.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }
    loadData()
    return () => {
      isMounted = false
    }
  }, [])

  async function handleTicketSubmit(input: CreateTicketInput) {
    const newTicket = await submitCustomerTicket(input)
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        tickets: [newTicket, ...prev.tickets],
      }
    })
  }

  async function handleDownloadBill() {
    if (!data?.billUrl || isDownloadingBill) return
    setIsDownloadingBill(true)
    try {
      const response = await fetch(data.billUrl)
      if (!response.ok) throw new Error('Unable to download bill')
      const blobUrl = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = getBillFileName(data.billUrl)
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(data.billUrl, '_blank', 'noopener,noreferrer')
    } finally {
      setIsDownloadingBill(false)
    }
  }

  function getBillFileName(url: string) {
    try {
      return decodeURIComponent(new URL(url).pathname.split('/').pop() || 'MBG-Card-Bill.pdf')
    } catch {
      return 'MBG-Card-Bill.pdf'
    }
  }

  if (isLoading) {
    return (
      <div className="cdb-body" style={{ opacity: 0.7, padding: '40px 0', textAlign: 'center' }}>
        Loading dashboard...
      </div>
    )
  }

  if (loadError || !data) {
    return (
      <div className="cdb-body" role="alert" style={{ padding: '40px 0', textAlign: 'center' }}>
        {loadError || 'Dashboard data is unavailable.'}
      </div>
    )
  }

  return (
    <div className="cdb-body">
      {/* Subtitle preview bar */}
      <div className="cdb-preview-bar">
        <span className="cdb-preview-icon">
          <Icon name="eye" size={16} />
        </span>
        <span>
          Preview of <strong>{data.profile.companyName} ’s dashboard</strong> — every step, call and reply your team makes shows here live.
        </span>
      </div>

      {/* 1. Welcome Banner (Blue Gradient) */}
      <CustomerWelcomeBanner profile={data.profile} />

      <section className="cdb-invoice-card" aria-labelledby="customer-invoice-title">
        <div className="cdb-invoice-card__heading">
          <span className="cdb-invoice-card__icon"><Icon name="eye" size={18} d="M6 2h9l5 5v15H6V2Zm9 0v6h5M9 13h8M9 17h8" /></span>
          <div>
            <h2 id="customer-invoice-title">Invoices</h2>
            <p>Your latest bill and payment details</p>
          </div>
        </div>
        <div className="cdb-invoice-card__table">
          <div className="cdb-invoice-card__labels" aria-hidden="true">
            <span>Invoice</span><span>Description</span><span>Status</span><span>Actions</span>
          </div>
          <div className="cdb-invoice-card__row">
            <strong>{data.bill?.invoiceNo || 'Your invoice'}</strong>
            <span>Billing invoice</span>
            <span><span className={`cdb-invoice-status cdb-invoice-status--${statusClass(data.bill?.status)}`}>{formatStatus(data.bill?.status)}</span></span>
            <div className="cdb-invoice-actions">
              <a className={`cdb-invoice-icon-button${data.billUrl ? '' : ' is-disabled'}`} href={data.billUrl || undefined} target="_blank" rel="noopener noreferrer" aria-label="View bill" title={data.billUrl ? 'View bill' : 'Bill not available'} onClick={(event) => { if (!data.billUrl) event.preventDefault() }}>
                <Icon name="eye" size={17} />
              </a>
              <button className="cdb-invoice-icon-button" type="button" disabled={!data.billUrl || isDownloadingBill} aria-label="Download bill" title={data.billUrl ? 'Download bill' : 'Bill not available'} onClick={handleDownloadBill}>
                <Icon name="download" size={17} />
              </button>
            </div>
          </div>
        </div>
        {!data.billUrl ? <p className="cdb-invoice-card__empty">Your bill has not been uploaded yet.</p> : null}
      </section>

      {/* 2. Upcoming Meeting Banner */}
      {data.meeting ? <UpcomingMeetingBanner meeting={data.meeting} /> : null}

      {/* 3. Services Section */}
      <CustomerServicesSection services={data.services} />

      {/* 4. Lower Two-Column Layout */}
      <div className="cdb-bottom-grid">
        <LatestUpdatesCard updates={data.updates} />
        <CustomerHelpCenterCard
          tickets={data.tickets}
          onSubmitTicket={handleTicketSubmit}
        />
      </div>
    </div>
  )
}
