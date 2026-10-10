import { Icon } from '../head/shared/Icon'
import type { CustomerProfile } from './types/customer-dashboard.types'

interface CustomerWelcomeBannerProps {
  profile: CustomerProfile
}

export function CustomerWelcomeBanner({
  profile,
}: CustomerWelcomeBannerProps) {
  const {
    clientName,
    companyName,
    status,
    packageName,
    packageDuration,
    onboardingStepText,
    onboardingProgressPercent,
    executive,
  } = profile

  return (
    <div className="cdb-welcome-banner">
      {/* Left info */}
      <div className="cdb-wb-left">
        <p className="cdb-wb-greeting">Welcome back, {clientName}</p>
        <h2 className="cdb-wb-company">{companyName}</h2>

        <div className="cdb-wb-badges">
          <span className="cdb-wb-status-pill">{status}</span>
          <span className="cdb-wb-pkg-pill">
            {packageName} · {packageDuration}
          </span>
        </div>
      </div>

      {/* Center Progress */}
      <div className="cdb-wb-center">
        <div className="cdb-wb-progress-header">
          <span className="cdb-wb-percent">{onboardingProgressPercent}%</span>
          <span className="cdb-wb-progress-sub">{onboardingStepText}</span>
        </div>

        <div className="cdb-wb-track">
          <div
            className="cdb-wb-fill"
            style={{ width: `${Math.min(100, Math.max(0, onboardingProgressPercent))}%` }}
          />
        </div>
      </div>

      {/* Right Executive Box */}
      <div className="cdb-wb-exec-card">
        <div className="cdb-wb-exec-avatar">{executive.initial}</div>

        <div className="cdb-wb-exec-details">
          <span className="cdb-wb-exec-role">{executive.roleTitle}</span>
          <span className="cdb-wb-exec-name">{executive.name}</span>
        </div>

        <div className="cdb-wb-exec-actions">
          {executive.phone ? (
            <a
              href={`tel:${executive.phone}`}
              className="cdb-wb-btn-icon"
              title={`Call ${executive.name}`}
            >
              <Icon name="phone" size={16} />
            </a>
          ) : null}

          {executive.whatsapp ? (
            <a
              href={`https://wa.me/${executive.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="cdb-wb-btn-icon is-whatsapp"
              title={`WhatsApp ${executive.name}`}
            >
              <Icon name="mail" size={16} />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  )
}
