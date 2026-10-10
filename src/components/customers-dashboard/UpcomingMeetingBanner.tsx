import type { UpcomingMeeting } from './types/customer-dashboard.types'

interface UpcomingMeetingBannerProps {
  meeting: UpcomingMeeting
}

export function UpcomingMeetingBanner({ meeting }: UpcomingMeetingBannerProps) {
  const { dateMonth, dateDay, title, dateTimeText, executiveText } = meeting

  return (
    <div className="cdb-meeting-banner">
      <div className="cdb-mb-date-block">
        <span className="cdb-mb-month">{dateMonth}</span>
        <span className="cdb-mb-day">{dateDay}</span>
      </div>

      <div className="cdb-mb-content">
        <span className="cdb-mb-label">{title}</span>
        <span className="cdb-mb-time">{dateTimeText}</span>
        <span className="cdb-mb-details">{executiveText}</span>
      </div>
    </div>
  )
}
