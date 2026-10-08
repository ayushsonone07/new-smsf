import { useRef, useState, useEffect } from 'react'
import { Icon } from '../shared/Icon'

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
 * Lined-up Meetings card grid component with horizontal carousel.
 */
export function LinedUpMeetings({
  meetings = DEFAULT_MEETINGS,
}: LinedUpMeetingsProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  // Check scroll position to show/hide arrows
  const checkScrollPosition = () => {
    if (!trackRef.current) return
    const track = trackRef.current
    const scrollLeft = track.scrollLeft
    const maxScrollLeft = track.scrollWidth - track.clientWidth
    setShowLeftArrow(scrollLeft > 10)
    setShowRightArrow(scrollLeft < maxScrollLeft - 10)
  }

  // Check on mount and when meetings change
  useEffect(() => {
    checkScrollPosition()
    // Also check after layout
    requestAnimationFrame(checkScrollPosition)
  }, [meetings])

  // Check on scroll
  const handleScroll = () => {
    checkScrollPosition()
  }

  // Check on resize
  useEffect(() => {
    const handleResize = () => checkScrollPosition()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const scrollAmount = 380 // Approximate card width + gap

  const scrollLeft = () => {
    if (trackRef.current) {
      trackRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (trackRef.current) {
      trackRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

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

      {/* Carousel Viewport */}
      <div className="hdb-meetings-carousel">
        {/* Left Arrow */}
        <button
          type="button"
          className={`hdb-carousel-arrow hdb-carousel-arrow--left ${showLeftArrow ? 'is-visible' : ''}`}
          onClick={scrollLeft}
          aria-label="Scroll meetings left"
          disabled={!showLeftArrow}
        >
          <Icon name="chevronDown" size={18} strokeWidth={2.5} className="hdb-carousel-arrow__icon--left" />
        </button>

        {/* Carousel Viewport - contains horizontal overflow */}
        <div className="hdb-meetings-viewport" onScroll={handleScroll}>
          <div className="hdb-meetings-track" ref={trackRef} role="list">
            {meetings.map((m) => (
              <div key={m.id} className="hdb-meeting-item" role="listitem">
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
        </div>

        {/* Right Arrow */}
        <button
          type="button"
          className={`hdb-carousel-arrow hdb-carousel-arrow--right ${showRightArrow ? 'is-visible' : ''}`}
          onClick={scrollRight}
          aria-label="Scroll meetings right"
          disabled={!showRightArrow}
        >
          <Icon name="chevronDown" size={18} strokeWidth={2.5} className="hdb-carousel-arrow__icon--right" />
        </button>
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