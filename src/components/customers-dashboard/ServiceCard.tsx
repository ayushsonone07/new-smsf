import { Icon } from '../head/shared/Icon'
import type { CustomerServiceItem, ServiceTaskStatus } from './types/customer-dashboard.types'

interface ServiceCardProps {
  service: CustomerServiceItem
}

export function ServiceCard({ service }: ServiceCardProps) {
  const { categoryName, dotColor = 'blue', status, completedCount, totalCount, tasks } = service

  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  function renderTaskStatusIcon(taskStatus: ServiceTaskStatus) {
    if (taskStatus === 'Completed') {
      return (
        <span className="cdb-task-icon is-completed" title="Completed">
          <Icon name="check" size={12} strokeWidth={2.5} />
        </span>
      )
    }

    if (taskStatus === 'In progress') {
      return (
        <span className="cdb-task-icon is-progress" title="In progress">
          <Icon name="progress" size={12} strokeWidth={2.5} />
        </span>
      )
    }

    return (
      <span className="cdb-task-icon is-pending" title="Pending">
        <Icon name="hourglass" size={12} strokeWidth={2.5} />
      </span>
    )
  }

  function getStatusCssClass(taskStatus: ServiceTaskStatus) {
    if (taskStatus === 'Completed') return 'txt-completed'
    if (taskStatus === 'In progress') return 'txt-progress'
    return 'txt-pending'
  }

  return (
    <div className="cdb-svc-card">
      {/* Top Header */}
      <div className="cdb-svc-top">
        <div className="cdb-svc-name-group">
          <span className={`cdb-svc-dot ${dotColor === 'green' ? 'dot-green' : ''}`} />
          <h3 className="cdb-svc-name">{categoryName}</h3>
        </div>

        <span className="cdb-svc-status-badge">{status}</span>
      </div>

      {/* Progress Track */}
      <div className="cdb-svc-progress-row">
        <div className="cdb-svc-track">
          <div className="cdb-svc-fill" style={{ width: `${percent}%` }} />
        </div>
        <span className="cdb-svc-fraction">
          {completedCount}/{totalCount}
        </span>
      </div>

      {/* Tasks List */}
      <div className="cdb-svc-tasks">
        {tasks.map((t) => (
          <div key={t.id} className="cdb-svc-task-item">
            <div className="cdb-svc-task-left">
              {renderTaskStatusIcon(t.status)}
              <span>{t.name}</span>
            </div>

            <span className={`cdb-task-status-txt ${getStatusCssClass(t.status)}`}>
              {t.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
