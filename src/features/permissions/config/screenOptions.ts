import type { IconName } from '../../../components/head/shared/iconPaths'
import type { HeadScreenKey } from '../types/permission.types'

/**
 * Screens the head panel can render. Admin picks one
 * when adding a feature; `custom` gets a generic page.
 */
export const SCREEN_OPTIONS: Array<{
  value: HeadScreenKey
  label: string
  defaultSlug: string
  defaultIcon: IconName
}> = [
  { value: 'dashboard', label: 'Dashboard', defaultSlug: 'dashboard', defaultIcon: 'grid' },
  { value: 'users', label: 'Department Users', defaultSlug: 'users', defaultIcon: 'userPlus' },
  { value: 'customers', label: 'Customer List', defaultSlug: 'customers', defaultIcon: 'list' },
  { value: 'attendance', label: 'Attendance', defaultSlug: 'attendance', defaultIcon: 'clock' },
  { value: 'meeting', label: '15 Days Meeting', defaultSlug: 'meeting', defaultIcon: 'calendar' },
  { value: 'sop', label: 'SOP', defaultSlug: 'sop', defaultIcon: 'flow' },
  { value: 'help-center', label: 'Help Center', defaultSlug: 'help-center', defaultIcon: 'help' },
  { value: 'custom', label: 'Custom page', defaultSlug: '', defaultIcon: 'brief' },
]

export const ICON_OPTIONS: IconName[] = [
  'grid', 'userPlus', 'users', 'list', 'calendar', 'flow', 'help',
  'bar', 'brief', 'book', 'history', 'mail', 'home', 'trend', 'perf',
  'clock',
]
