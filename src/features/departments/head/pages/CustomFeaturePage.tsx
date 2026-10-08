import { SectionCard } from '../../../../components/head/shared/SectionCard'
import type { FeaturePermission } from '../../../permissions/types/permission.types'

/** Generic body for admin-created features that have no dedicated screen yet. */
export function CustomFeaturePage({ feature }: { feature: FeaturePermission }) {
  return (
    <SectionCard title={feature.name} hint={`/head/${feature.slug}`}>
      <div className="hpage-placeholder">
        {feature.description || 'This page was added by the admin.'}
      </div>
    </SectionCard>
  )
}
