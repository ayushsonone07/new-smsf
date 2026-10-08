import { delay, featurePermissions, nextFeatureId } from './mock/db'
import type {
  CreateFeaturePermissionRequest,
  FeaturePermission,
  UpdateFeaturePermissionRequest,
} from '../features/permissions/types/permission.types'

function byOrder(a: FeaturePermission, b: FeaturePermission) {
  return a.order - b.order
}

function ofDepartment(departmentId: string) {
  return featurePermissions
    .filter((feature) => feature.departmentId === departmentId)
    .sort(byOrder)
}

export async function getFeaturePermissions(
  departmentId: string,
): Promise<FeaturePermission[]> {
  await delay()
  return structuredClone(ofDepartment(departmentId))
}

export async function createFeaturePermission(
  departmentId: string,
  data: CreateFeaturePermissionRequest,
): Promise<FeaturePermission> {
  await delay(250)

  const slugTaken = ofDepartment(departmentId).some(
    (feature) => feature.slug === data.slug,
  )
  if (slugTaken) {
    throw new Error(`Slug "${data.slug}" is already used in this department`)
  }

  const feature: FeaturePermission = {
    id: nextFeatureId(),
    departmentId,
    order: ofDepartment(departmentId).length,
    ...data,
  }

  featurePermissions.push(feature)
  return structuredClone(feature)
}

export async function updateFeaturePermission(
  id: string,
  data: UpdateFeaturePermissionRequest,
): Promise<FeaturePermission> {
  await delay(250)

  const feature = featurePermissions.find((item) => item.id === id)
  if (!feature) {
    throw new Error('Feature permission not found')
  }

  if (data.slug && data.slug !== feature.slug) {
    const slugTaken = ofDepartment(feature.departmentId).some(
      (item) => item.id !== id && item.slug === data.slug,
    )
    if (slugTaken) {
      throw new Error(`Slug "${data.slug}" is already used in this department`)
    }
  }

  Object.assign(feature, data)
  return structuredClone(feature)
}

export async function deleteFeaturePermission(id: string): Promise<void> {
  await delay(250)

  const index = featurePermissions.findIndex((item) => item.id === id)
  if (index === -1) {
    throw new Error('Feature permission not found')
  }

  const [removed] = featurePermissions.splice(index, 1)

  // close the gap in ordering
  ofDepartment(removed.departmentId).forEach((feature, i) => {
    feature.order = i
  })
}

export async function moveFeaturePermission(
  id: string,
  direction: 'up' | 'down',
): Promise<void> {
  await delay(150)

  const feature = featurePermissions.find((item) => item.id === id)
  if (!feature) {
    throw new Error('Feature permission not found')
  }

  const siblings = ofDepartment(feature.departmentId)
  const index = siblings.findIndex((item) => item.id === id)
  const swapWith = direction === 'up' ? index - 1 : index + 1

  if (swapWith < 0 || swapWith >= siblings.length) {
    return
  }

  const other = siblings[swapWith]
  ;[feature.order, other.order] = [other.order, feature.order]
}
