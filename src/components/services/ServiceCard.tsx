import type { Service } from '../../features/departments/types/service.types'
import { StatusBadge } from '../common/StatusBadge'

interface ServiceCardProps {
  service: Service
}

export function ServiceCard({
  service,
}: ServiceCardProps) {
  return (
    <article className="service-card">
      <div className="service-header">
        <div className="department-icon">
          ▦
        </div>

        <StatusBadge
          status={service.status}
          variant={
            service.status === 'AVAILABLE'
              ? 'active'
              : 'inactive'
          }
        />
      </div>

      <h3>{service.name}</h3>

      <p>{service.description}</p>

      <span className="service-category">
        {service.category}
      </span>
    </article>
  )
}
