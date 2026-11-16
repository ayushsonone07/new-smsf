import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bell, CheckCircle2, Circle, RefreshCw, Search } from 'lucide-react'
import { fetchNotificationPage } from '../../../api/notifications.api'
import { PageHeader } from '../../../components/layout/PageHeader'
import { PageLayout } from '../../../components/layout/PageLayout'
import { Card } from '../../../components/ui/Card'
import './NotificationHistoryPage.css'

export function NotificationHistoryPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const notificationsQuery = useQuery({
    queryKey: ['notification-history', page],
    queryFn: () => fetchNotificationPage(page, 20),
    refetchOnWindowFocus: true,
  })

  const notifications = useMemo(() => {
    const value = search.trim().toLowerCase()
    const items = notificationsQuery.data?.items ?? []
    if (!value) return items
    return items.filter((item) =>
      [item.title, item.message, item.kind, item.audience, item.departmentType]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(value),
    )
  }, [notificationsQuery.data, search])

  return (
    <PageLayout>
      <PageHeader
        breadcrumb={<><span>Administration</span> / Notification History</>}
        title="Notification History"
        description="View every notification available from the backend notification feed."
        actions={(
          <button
            className="notification-history__refresh"
            type="button"
            onClick={() => void notificationsQuery.refetch()}
            disabled={notificationsQuery.isFetching}
          >
            <RefreshCw size={16} className={notificationsQuery.isFetching ? 'is-spinning' : ''} />
            Refresh
          </button>
        )}
      />

      <Card className="notification-history">
        <div className="notification-history__heading">
          <div>
            <h2>All Notifications</h2>
            <p>{notificationsQuery.data?.totalElements ?? 0} notification(s) from the backend</p>
          </div>
          <label className="notification-history__search">
            <Search size={16} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, message, type or audience..."
              aria-label="Search notification history"
            />
          </label>
        </div>

        {notificationsQuery.isLoading ? (
          <div className="notification-history__state">Loading notification history...</div>
        ) : notificationsQuery.isError ? (
          <div className="notification-history__state is-error">
            Unable to load notifications from the backend.
          </div>
        ) : notifications.length === 0 ? (
          <div className="notification-history__state">
            <Bell size={30} />
            {search ? 'No notifications match your search.' : 'No notifications are available.'}
          </div>
        ) : (
          <div className="notification-history__list">
            {notifications.map((item) => (
              <article className="notification-history__item" key={item.id}>
                <span className={`notification-history__icon${item.read ? '' : ' is-unread'}`}>
                  <Bell size={17} />
                </span>
                <div className="notification-history__content">
                  <div className="notification-history__title-row">
                    <h3>{item.title || 'Notification'}</h3>
                    <span className={`notification-history__status${item.read ? '' : ' is-unread'}`}>
                      {item.read ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                      {item.read ? 'Read' : 'Unread'}
                    </span>
                  </div>
                  <p>{item.message}</p>
                  <div className="notification-history__meta">
                    <time>{formatDate(item.createdAt)}</time>
                    <span>{formatLabel(item.kind ?? 'general')}</span>
                    <span>{formatLabel(item.audience)}</span>
                    {item.departmentType ? <span>{formatLabel(item.departmentType)}</span> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        {(notificationsQuery.data?.totalPage ?? 0) > 1 ? (
          <div className="notification-history__pagination">
            <button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>
              Previous
            </button>
            <span>Page {page + 1} of {notificationsQuery.data?.totalPage}</span>
            <button
              type="button"
              disabled={page + 1 >= (notificationsQuery.data?.totalPage ?? 0)}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </button>
          </div>
        ) : null}
      </Card>
    </PageLayout>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function formatLabel(value: string) {
  return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}
