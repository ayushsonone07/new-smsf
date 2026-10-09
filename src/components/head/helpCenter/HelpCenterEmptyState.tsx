import { motion } from 'framer-motion'
import { Icon } from '../shared/Icon'
import './HelpCenterEmptyState.css'

const emptyVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.24 } },
}

export function HelpCenterEmptyState() {
  return (
    <motion.div
      className="hc-empty"
      initial="hidden"
      animate="visible"
      variants={emptyVariants}
    >
      <div className="hc-empty__icon">
        <Icon name="help" size={48} strokeWidth={1.5} />
      </div>
      <h3 className="hc-empty__title">No tickets found</h3>
      <p className="hc-empty__description">
        Try adjusting your search or filters to find tickets.
      </p>
    </motion.div>
  )
}