import type { FeaturePermission } from '../../../permissions/types/permission.types'

/** Generic body for admin-created features that have no dedicated screen yet. */
export function CustomFeaturePage({ feature }: { feature: FeaturePermission }) {
  return (
    <div className="hpage-coming-soon" role="status">
      <svg
        className="hpage-coming-soon__illustration"
        viewBox="0 0 240 180"
        role="img"
        aria-label="Page under construction"
      >
        <circle cx="120" cy="90" r="76" fill="#e8efff" />
        <path
          d="M53 131h134"
          fill="none"
          stroke="#b9c8e8"
          strokeLinecap="round"
          strokeWidth="5"
        />
        <rect x="74" y="51" width="92" height="69" rx="10" fill="#fff" stroke="#2459e0" strokeWidth="5" />
        <path d="M95 120h50l8 12H87l8-12Z" fill="#2459e0" />
        <path d="m104 78 12 12-12 12M122 102h19" fill="none" stroke="#ffc629" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" />
        <circle cx="177" cy="50" r="20" fill="#ffc629" />
        <path d="m168 50 6 6 12-13" fill="none" stroke="#172554" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
      </svg>

      <h2>This page will be available soon</h2>
      <p>{feature.name} is currently under development.</p>
    </div>
  )
}
