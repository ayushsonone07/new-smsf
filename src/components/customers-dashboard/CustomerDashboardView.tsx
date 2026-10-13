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

export function CustomerDashboardView() {
  const [data, setData] = useState<CustomerDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [billOptionsOpen, setBillOptionsOpen] = useState(false)
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
      setBillOptionsOpen(false)
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

      <div className="cdb-bill-action">
        <button
          type="button"
          className="cdb-bill-action__trigger"
          aria-expanded={billOptionsOpen}
          onClick={() => setBillOptionsOpen((open) => !open)}
        >
          <Icon name="download" size={17} />
          <span>My Bill</span>
          <Icon name="chevronDown" size={15} />
        </button>

        {billOptionsOpen ? (
          <div className="cdb-bill-action__menu">
            <button
              type="button"
              className="cdb-bill-action__download"
              disabled={!data.billUrl || isDownloadingBill}
              onClick={handleDownloadBill}
            >
              <Icon name="download" size={17} />
              <span>
                {isDownloadingBill
                  ? 'Downloading bill...'
                  : data.billUrl
                    ? 'Download bill'
                    : 'Bill not available yet'}
              </span>
            </button>
          </div>
        ) : null}
      </div>

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
