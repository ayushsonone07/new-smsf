import type { Service } from '../../features/departments/types/service.types'
import { EmptyState } from '../ui/EmptyState'
import { ServiceCard } from './ServiceCard'

interface ServicesProps {
  services: Service[]
}

export function Services({
  services,
}: ServicesProps) {
  if (services.length === 0) {
    return (
      <EmptyState
        icon="▦"
        title="No services available"
        description="This department has no services yet."
      />
    )
  }

  return (
    <div className="services-grid">
      {services.map((service) => (
        <ServiceCard
          key={service.id}
          service={service}
        />
      ))}
    </div>
  )
}
