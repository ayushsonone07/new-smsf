import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  getCurrentPhoneNumber,
  getSession,
  updateSessionPhoneNumber,
} from '../../app/auth/session'
import { fetchCurrentUserProfileMeta } from '../../api/department-users.api'
import { buildDepartmentRoute } from '../../features/departments/head/utils/routeUtils'

interface ProfileMenuProps {
  /** Called after a menu item navigates (to close the panel/dropdown). */
  onNavigate?: () => void
  /** 'dark' for the admin sidebar, 'light' everywhere else. */
  variant?: 'dark' | 'light'
}

interface MenuEntry {
  icon: string
  label: string
  description: string
  to: string
}

/**
 * SMSF-style profile settings menu: Profile Update,
 * My Airtel Calls, Manage Services, Salary Management.
 * Visibility mirrors SMSF's Sidebar settingsMenuItems.
 */
export function ProfileMenu({ onNavigate, variant = 'light' }: ProfileMenuProps) {
  const navigate = useNavigate()
  const session = getSession()
  const role = session?.user.role
  const departmentType = session?.user.departmentType

  const [phone, setPhone] = useState<string>(() => getCurrentPhoneNumber())

  useEffect(() => {
    const current = getCurrentPhoneNumber()
    if (current) {
      setPhone(current)
      return
    }
    let cancelled = false
    fetchCurrentUserProfileMeta().then((meta) => {
      if (!cancelled && meta.phoneNumber) {
        updateSessionPhoneNumber(meta.phoneNumber)
        setPhone(meta.phoneNumber)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!session || !role || role === 'CUSTOMER') {
    return null
  }

  const entries: MenuEntry[] = []

  // Profile Update — everyone except CUSTOMER (SMSF reference)
  entries.push({
    icon: '◉',
    label: 'Profile Update',
    description: 'Update your phone and contact details',
    to: '/profile-update',
  })

  // My Airtel Calls — HEAD + USER only (SMSF hides for SUPERADMIN/CUSTOMER)
  if (role === 'HEAD' || role === 'USER') {
    entries.push({
      icon: '☎',
      label: 'My Airtel Calls',
      description: 'Your personal call history',
      to: buildDepartmentRoute('airtel-calls', departmentType, role),
    })
  }

  // Manage Services — HEAD (+ ADMIN so the admin portal can reach it)
  if (role === 'HEAD' || role === 'ADMIN') {
    entries.push({
      icon: '⚙',
      label: 'Manage Services',
      description: 'Manage Services configuration',
      to: buildDepartmentRoute('manage-services', departmentType, role === 'ADMIN' ? 'HEAD' : role),
    })
  }

  // Airtel Service — ADMIN only (SMSF reference: SuperAdmin only)
  if (role === 'ADMIN') {
    entries.push({
      icon: '☎',
      label: 'Airtel Service',
      description: 'Inbound call records, durations & call outcomes',
      to: '/admin/airtel-service',
    })
  }

  // Salary Management — everyone except CUSTOMER (SMSF reference)
  entries.push({
    icon: '₹',
    label: 'Salary Management',
    description: 'Manage employee salaries',
    to: buildDepartmentRoute('salary-management', departmentType, role === 'ADMIN' ? 'HEAD' : role),
  })

  function handleSelect(to: string) {
    onNavigate?.()
    navigate({ to: to as never })
  }

  return (
    <div className={`profile-menu profile-menu--${variant}`}>
      <div className="profile-menu__phone">
        <span className="profile-menu__phone-icon">☎</span>
        <span className="profile-menu__phone-text">
          <span>Phone</span>
          <strong>{phone || '—'}</strong>
        </span>
      </div>

      <div className="profile-menu__list">
        {entries.map((entry) => (
          <button
            key={entry.label}
            type="button"
            className="profile-menu__item"
            onClick={() => handleSelect(entry.to)}
          >
            <span className="profile-menu__item-icon">{entry.icon}</span>
            <span className="profile-menu__item-text">
              <strong>{entry.label}</strong>
              <span>{entry.description}</span>
            </span>
            <span className="profile-menu__item-chevron" aria-hidden="true">
              ›
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
