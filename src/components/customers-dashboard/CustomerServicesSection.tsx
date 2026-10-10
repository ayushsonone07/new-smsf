import { ServiceCard } from './ServiceCard'
import type { CustomerServiceItem } from './types/customer-dashboard.types'

interface CustomerServicesSectionProps {
  services: CustomerServiceItem[]
}

export function CustomerServicesSection({ services }: CustomerServicesSectionProps) {
  return (
    <section className="cdb-services-section">
      <div className="cdb-services-header">
        <h2 className="cdb-services-title">Your services</h2>
        <span className="cdb-services-count-badge">{services.length}</span>
      </div>

      <div className="cdb-services-grid">
        {services.map((s) => (
          <ServiceCard key={s.id} service={s} />
        ))}
      </div>
    </section>
  )
}
