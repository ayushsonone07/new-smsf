import { useSyncExternalStore } from 'react'
import { getSession } from '../../../../app/auth/session'

/**
 * Which Help & Support sub-tab is open. Shared between the sidebar (where the
 * sub-tabs live) and HelpCenterPage, without adding search params to the route.
 */
export type HelpCenterTab = 'assigned-tickets' | 'analytics' | 'department-members'

export const HELP_CENTER_TABS: { key: HelpCenterTab; label: string; headOnly: boolean }[] = [
  { key: 'assigned-tickets', label: 'Assign Tickets', headOnly: false },
  { key: 'analytics', label: 'Analytics', headOnly: false },
  { key: 'department-members', label: 'Department User', headOnly: true },
]

const STORAGE_KEY = 'helpCenterTab'
const listeners = new Set<() => void>()

function readInitial(): HelpCenterTab {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved && HELP_CENTER_TABS.some((t) => t.key === saved)) return saved as HelpCenterTab
  } catch {
    // storage unavailable
  }
  return 'assigned-tickets'
}

let current: HelpCenterTab = readInitial()

export function setHelpCenterTab(tab: HelpCenterTab) {
  if (tab === current) return
  current = tab
  try {
    sessionStorage.setItem(STORAGE_KEY, tab)
  } catch {
    // storage unavailable
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useHelpCenterTab(): HelpCenterTab {
  return useSyncExternalStore(subscribe, () => current, () => current)
}

/** Department heads and admins also see the "Department User" sub-tab. */
export function canSeeHelpCenterMembers(): boolean {
  const role = getSession()?.user?.role || 'HEAD'
  return role === 'HEAD' || role === 'ADMIN'
}

/** True for the sidebar entry that opens the Help Center screen. */
export function isHelpSupportNavItem(item: { key: string; label: string; to?: string }): boolean {
  const label = item.label.toLowerCase().trim()
  return (
    item.key === 'help-support' ||
    item.key === 'help-center' ||
    label === 'help & support' ||
    label === 'help center' ||
    /\/help-(support|center)$/.test(item.to ?? '')
  )
}
