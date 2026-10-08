import type { ActivityItem } from '../../features/departments/types/dashboard.types'
import { EmptyState } from '../ui/EmptyState'

interface DashboardActivityProps {
  activity: ActivityItem[]
}

export function DashboardActivity({
  activity,
}: DashboardActivityProps) {
  if (activity.length === 0) {
    return (
      <EmptyState
        icon="⌛"
        title="No recent activity"
        description="Activity for this department will appear here."
      />
    )
  }

  return (
    <ul className="activity-list">
      {activity.map((item) => (
        <li
          key={item.id}
          className="activity-item"
        >
          <span className="activity-dot" />

          <div className="activity-content">
            <strong>{item.title}</strong>

            <p>{item.description}</p>
          </div>

          <span className="activity-time">
            {item.time}
          </span>
        </li>
      ))}
    </ul>
  )
}
