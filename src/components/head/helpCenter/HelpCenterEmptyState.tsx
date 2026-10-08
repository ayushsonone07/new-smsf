import { Icon } from '../shared/Icon'
import './HelpCenterEmptyState.css'

export function HelpCenterEmptyState() {
  return (
    <div className="hc-empty">
      <div className="hc-empty__icon">
        <Icon name="help" size={48} strokeWidth={1.5} />
      </div>
      <h3 className="hc-empty__title">No tickets found</h3>
      <p className="hc-empty__description">
        Try adjusting your search or filters to find tickets.
      </p>
    </div>
  )
}