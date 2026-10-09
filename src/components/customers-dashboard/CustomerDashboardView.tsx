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

  if (isLoading || !data) {
    return (
      <div className="cdb-body" style={{ opacity: 0.7, padding: '40px 0', textAlign: 'center' }}>
        Loading dashboard...
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

      {/* 2. Upcoming Meeting Banner */}
      <UpcomingMeetingBanner meeting={data.meeting} />

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
