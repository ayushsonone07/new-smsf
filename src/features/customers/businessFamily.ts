/**
 * Where a customer sits in an owner's group of businesses, from the admin customer list
 * (/api/auth/admin/customers → CustomerResponse).
 *  - linked: a duplicate business linked to a main one (parentCustomerId set)
 *  - main:   a main business that has linked businesses and/or old-style duplicates
 *  - single: neither
 */
export type BusinessFamilyRole =
  | { kind: 'linked'; parentId?: number | string; parentName: string }
  | { kind: 'main'; duplicateCount: number; oldDuplicateNames: string[] }
  | { kind: 'single' }

interface FamilyFields {
  isLinkedBusiness?: unknown
  parentCustomerId?: unknown
  parentBusinessName?: unknown
  duplicateCount?: unknown
  duplicateCustomers?: unknown
}

export function businessFamilyRole(customer: FamilyFields): BusinessFamilyRole {
  const parentId = customer.parentCustomerId
  const hasParent = parentId !== null && parentId !== undefined && String(parentId).trim() !== ''
  if (customer.isLinkedBusiness === true || hasParent) {
    const parentName = typeof customer.parentBusinessName === 'string' && customer.parentBusinessName.trim()
      ? customer.parentBusinessName.trim()
      : hasParent ? `Customer #${String(parentId)}` : 'main business'
    return {
      kind: 'linked',
      ...(hasParent ? { parentId: parentId as number | string } : {}),
      parentName,
    }
  }

  // Old-style duplicates (separate table, no customer id of their own) are listed by name;
  // duplicateCount covers them plus linked businesses.
  const oldDuplicateNames = Array.isArray(customer.duplicateCustomers)
    ? customer.duplicateCustomers
        .map((dup) => (dup && typeof dup === 'object' ? (dup as { businessName?: unknown }).businessName : null))
        .filter((name): name is string => typeof name === 'string' && name.trim() !== '')
        .map((name) => name.trim())
    : []
  const count = Number(customer.duplicateCount)
  const duplicateCount = Math.max(Number.isFinite(count) ? count : 0, oldDuplicateNames.length)

  return duplicateCount > 0 ? { kind: 'main', duplicateCount, oldDuplicateNames } : { kind: 'single' }
}
