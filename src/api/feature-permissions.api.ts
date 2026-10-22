import type {
  CreateFeaturePermissionRequest,
  FeaturePermission,
  UpdateFeaturePermissionRequest,
} from '../features/permissions/types/permission.types'

const STORAGE_KEY = 'smsf.feature-permissions'

function loadStore(): FeaturePermission[] {
  try {
    if (typeof window === 'undefined') return []
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as FeaturePermission[]) : []
  } catch {
    return []
  }
}

function saveStore(): void {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(featurePermissions))
  } catch {
    // ignore — permissions simply stay in memory
  }
}

const featurePermissions: FeaturePermission[] = loadStore()

let featureIdCounter = featurePermissions.length + 1

function nextFeatureId(): string {
  const id = `feat-${featureIdCounter}`
  featureIdCounter += 1
  return id
}

function byOrder(a: FeaturePermission, b: FeaturePermission) {
  return a.order - b.order
}

/**
 * Features of a department, optionally limited to one
 * category (menu items and each column list are moved and
 * re-indexed independently).
 */
function ofDepartment(
  departmentId: string,
  category?: FeaturePermission['category'],
) {
  return featurePermissions
    .filter(
      (feature) =>
        feature.departmentId === departmentId &&
        (!category || feature.category === category),
    )
    .sort(byOrder)
}

function reindex(departmentId: string, category: FeaturePermission['category']) {
  ofDepartment(departmentId, category).forEach((feature, i) => {
    feature.order = i
  })
}

export async function getFeaturePermissions(
  departmentId: string,
): Promise<FeaturePermission[]> {
  return structuredClone(ofDepartment(departmentId))
}

export async function createFeaturePermission(
  departmentId: string,
  data: CreateFeaturePermissionRequest,
): Promise<FeaturePermission> {
  const category = data.category ?? 'screens'
  const kind = data.kind ?? 'screen'

  const slugTaken = ofDepartment(departmentId).some(
    (feature) => feature.slug === data.slug,
  )
  if (slugTaken) {
    throw new Error(`Slug "${data.slug}" is already used in this department`)
  }

  const siblings = ofDepartment(departmentId, category)

  const feature: FeaturePermission = {
    id: nextFeatureId(),
    departmentId,
    category,
    kind,
    columnKey: data.columnKey,
    order: (siblings[siblings.length - 1]?.order ?? -1) + 1,
    name: data.name,
    description: data.description,
    screen: data.screen,
    slug: data.slug,
    icon: data.icon,
    enabled: data.enabled,
    roleAPermission: data.roleAPermission,
    roleBPermission: data.roleBPermission,
  }

  featurePermissions.push(feature)
  saveStore()
  return structuredClone(feature)
}

export async function updateFeaturePermission(
  id: string,
  data: UpdateFeaturePermissionRequest,
): Promise<FeaturePermission> {
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

  const patch = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as UpdateFeaturePermissionRequest

  Object.assign(feature, patch)
  saveStore()
  return structuredClone(feature)
}

export async function deleteFeaturePermission(id: string): Promise<void> {
  const index = featurePermissions.findIndex((item) => item.id === id)
  if (index === -1) {
    throw new Error('Feature permission not found')
  }

  const [removed] = featurePermissions.splice(index, 1)

  // close the gap inside the removed feature's own category
  reindex(removed.departmentId, removed.category)
  saveStore()
}

export async function moveFeaturePermission(
  id: string,
  direction: 'up' | 'down',
): Promise<void> {
  const feature = featurePermissions.find((item) => item.id === id)
  if (!feature) {
    throw new Error('Feature permission not found')
  }

  const siblings = ofDepartment(feature.departmentId, feature.category)
  const index = siblings.findIndex((item) => item.id === id)
  const swapWith = direction === 'up' ? index - 1 : index + 1

  if (swapWith < 0 || swapWith >= siblings.length) {
    return
  }

  const other = siblings[swapWith]
  ;[feature.order, other.order] = [other.order, feature.order]
  saveStore()
}
