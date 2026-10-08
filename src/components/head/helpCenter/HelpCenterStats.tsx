import { Icon } from '../shared/Icon'
import type { IconName } from '../shared/iconPaths'
import './HelpCenterStats.css'

interface HelpCenterStatsProps {
  stats: {
    total: number
    pending: number
    'in-progress': number
    completed: number
  }
}

export function HelpCenterStats({ stats }: HelpCenterStatsProps) {
  const statItems: Array<{ key: string; label: string; value: number; color: string; iconBg: string; icon: IconName }> = [
    { key: 'total', label: 'Total', value: stats.total, color: 'var(--head-blue)', iconBg: 'var(--head-blue-soft)', icon: 'help' },
    { key: 'pending', label: 'Pending', value: stats.pending, color: '#f59e0b', iconBg: '#fffbeb', icon: 'clock' },
    { key: 'in-progress', label: 'In Progress', value: stats['in-progress'], color: '#2563eb', iconBg: '#eff6ff', icon: 'hourglass' },
    { key: 'completed', label: 'Completed', value: stats.completed, color: '#16a34a', iconBg: '#f0fdf4', icon: 'check' },
  ]

  return (
    <div className="hc-stats" role="list" aria-label="Ticket statistics">
      {statItems.map((item) => (
        <article key={item.key} className="hc-stat-card" role="listitem">
          <div className="hc-stat-card__icon" style={{ background: item.iconBg, color: item.color }}>
            <Icon name={item.icon} size={18} strokeWidth={2} />
          </div>
          <div className="hc-stat-card__content">
            <span className="hc-stat-card__label">{item.label}</span>
            <span className="hc-stat-card__value" style={{ color: item.color }}>{item.value}</span>
          </div>
        </article>
      ))}
    </div>
  )
}