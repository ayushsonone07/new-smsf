import { useEffect, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { router } from '../../app/router'

interface RouteLoadingSkeletonProps {
  overlay?: boolean
  leaving?: boolean
}

export function RouteLoadingSkeleton({
  overlay = false,
  leaving = false,
}: RouteLoadingSkeletonProps) {
  return (
    <div
      className={`route-skeleton${overlay ? ' route-skeleton--overlay' : ''}${leaving ? ' is-leaving' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <span className="sr-only">Loading page…</span>
      <div className="route-skeleton__sidebar" aria-hidden="true">
        <div className="route-skeleton__brand skeleton-shimmer" />
        {Array.from({ length: 6 }, (_, index) => (
          <div className="route-skeleton__nav skeleton-shimmer" key={index} />
        ))}
      </div>
      <div className="route-skeleton__main" aria-hidden="true">
        <div className="route-skeleton__topbar skeleton-shimmer" />
        <div className="route-skeleton__cards">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="route-skeleton__card skeleton-shimmer" key={index} />
          ))}
        </div>
        <div className="route-skeleton__content skeleton-shimmer">
          {Array.from({ length: 7 }, (_, index) => (
            <div className="route-skeleton__row" key={index}>
              <span />
              <span />
              <span />
              <span />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function GlobalPreloader() {
  const routeIsLoading = useRouterState({
    router,
    select: (state) => state.isLoading,
  })
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    // Only show full-screen skeleton if page loading takes longer than 250ms
    // to prevent jarring flash on quick tab clicks
    let delayTimer: number | undefined
    if (routeIsLoading) {
      delayTimer = window.setTimeout(() => {
        setLeaving(false)
        setVisible(true)
      }, 250)
      return () => {
        if (delayTimer) window.clearTimeout(delayTimer)
      }
    }

    if (!visible) return
    setLeaving(true)
    const timer = window.setTimeout(() => {
      setVisible(false)
      setLeaving(false)
    }, 150)
    return () => window.clearTimeout(timer)
  }, [routeIsLoading, visible])

  if (!visible) return null

  return <RouteLoadingSkeleton overlay leaving={leaving} />
}
