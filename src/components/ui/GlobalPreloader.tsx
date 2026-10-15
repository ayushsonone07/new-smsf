import { useEffect, useState } from 'react'
import { subscribeToApiActivity } from '../../api/client'

export function GlobalPreloader() {
  const [activeRequests, setActiveRequests] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => subscribeToApiActivity(setActiveRequests), [])

  useEffect(() => {
    if (activeRequests === 0) {
      setVisible(false)
      return
    }

    const timer = window.setTimeout(() => setVisible(true), 250)
    return () => window.clearTimeout(timer)
  }, [activeRequests])

  if (
    !visible ||
    document.querySelector('[data-suppress-global-preloader]')
  ) {
    return null
  }

  return (
    <div className="global-preloader" role="status" aria-live="polite" aria-label="Loading data">
      <div className="global-preloader__card">
        <img className="global-preloader__brand" src="/mbg-card-logo.svg" alt="" />
        <span className="global-preloader__spinner" aria-hidden="true" />
        <strong>Loading data...</strong>
      </div>
    </div>
  )
}
