export interface MeetingCardData {
  id: string
  company: string
  month: string
  day: string
  timeAndMode: string
  executiveAndPurpose: string
}

const DEFAULT_MEETINGS: MeetingCardData[] = [
  {
    id: 'meet-1',
    company: 'Lala Company (Sector 15)',
    month: 'SEP',
    day: '30',
    timeAndMode: '12:30 pm · Google Meet',
    executiveAndPurpose: 'By Abhishek Sahu · Branch form walkthrough',
  },
  {
    id: 'meet-2',
    company: 'Lala Company',
    month: 'OCT',
    day: '1',
    timeAndMode: '11:00 am · Google Meet',
    executiveAndPurpose: 'By Abhishek Sahu · Website theme demo',
  },
  {
    id: 'meet-3',
    company: 'Lala Company (NIT)',
    month: 'OCT',
    day: '2',
    timeAndMode: '3:30 pm · Phone call',
    executiveAndPurpose: 'By Mahima · GMB verification follow-up',
  },
  {
    id: 'meet-4',
    company: 'Ananya Florals',
    month: 'OCT',
    day: '3',
    timeAndMode: '12:00 pm · Client visit',
    executiveAndPurpose: 'By Gungun · Collect product photos',
  },
]

export interface LinedUpMeetingsProps {
  meetings?: MeetingCardData[]
}

/**
 * Lined-up Meetings card grid component.
 */
export function LinedUpMeetings({
  meetings = DEFAULT_MEETINGS,
}: LinedUpMeetingsProps) {
  return (
    <div className="hdb-meetings-card">
      <div className="hdb-card__header">
        <div className="hdb-card__title-group">
          <h3 className="hdb-card__title">Lined-up Meetings</h3>
          <span className="hdb-card__badge hdb-card__badge--blue">
            {meetings.length} booked
          </span>
        </div>
        <span className="hdb-card__subtitle">
          View only · booked by executives
        </span>
      </div>

      <div className="hdb-meetings-grid">
        {meetings.map((m) => (
          <div key={m.id} className="hdb-meeting-item">
            <div className="hdb-calendar-block">
              <span className="hdb-calendar-month">{m.month}</span>
              <span className="hdb-calendar-day">{m.day}</span>
            </div>

            <div className="hdb-meeting-details">
              <h4 className="hdb-meeting-name">{m.company}</h4>
              <p className="hdb-meeting-time">{m.timeAndMode}</p>
              <p className="hdb-meeting-exec">{m.executiveAndPurpose}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="hdb-meetings__footer">
        <a href="/head/meeting" className="hdb-meetings__see-more">
          See more meetings
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </div>
  )
}
