import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '../../../../components/ui/Button'
import { Pill } from '../../../../components/ui/Pill'
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog'
import { SearchBar } from '../../../../components/head/shared/SearchBar'
import { SectionCard } from '../../../../components/head/shared/SectionCard'
import { LearningButton } from '../../../../components/head/shared/LearningButton'
import { ImpersonationBanner } from '../../../../components/head/layout/ImpersonationBanner'
import { DepartmentUsersTable } from '../../../../components/head/users/DepartmentUsersTable'
import { UserDetails } from '../../../../components/head/users/UserDetails'
import { UserFormModal } from '../../../../components/head/users/UserFormModal'
import { StaffReportModal } from '../../../../components/reports/StaffReportModal'
import { Icon } from '../../../../components/head/shared/Icon'
import {
  sampleDailyTargetByUser,
  sampleDepartmentUsers,
  sampleWorkItemsByUser,
} from '../../../../api/mock/head.db'
import { useColumnFeatures } from '../../../permissions/hooks/useColumnFeatures'
import { useHeadDepartmentId } from '../hooks/useHeadDepartmentId'
import { useDepartmentUsersList } from '../../hooks/useDepartmentUsersList'
import { generateDepartmentSession } from '../../../../api/auth.api'
import { getSession, saveAdminBackup, setSession } from '../../../../app/auth/session'
import type {
  DepartmentUser,
  DepartmentUserFormValues,
  DepartmentUserRole,
} from '../types/head.types'

type ModalState =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; user: DepartmentUser }
  | { kind: 'delete'; user: DepartmentUser }
  | { kind: 'report'; user: DepartmentUser }

/**
 * Head panel — Department Users. Wired to:
 * - GET /api/auth/department/users?page=0&size=10
 */
export function DepartmentUsersPage() {
  const navigate = useNavigate()
  const departmentId = useHeadDepartmentId()
  const columnFeatures = useColumnFeatures(departmentId, 'users')
  const canManageUsers = columnFeatures.canEdit('actions')

  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<ModalState>({ kind: 'none' })
  const [viewingAs, setViewingAs] =
    useState<DepartmentUser | null>(null)
  const [page, setPage] = useState(0)
  const [size] = useState(10)

  async function handleLoginAs(targetUser: DepartmentUser) {
    const email = targetUser.email?.trim()
    if (!email) {
      alert('This user does not have a valid email.')
      return
    }

    try {
      const currentSession = getSession()
      if (currentSession) {
        saveAdminBackup(currentSession)
      }

      const newSession = await generateDepartmentSession(email)
      setSession(newSession)

      navigate({ to: '/onboarding-user' as never })
    } catch (err: unknown) {
      console.error('Failed to log in as department user:', err)
      const msg = err instanceof Error ? err.message : 'Unable to log in as user'
      alert(`Login failed: ${msg}`)
    }
  }

  // Reset to page 0 when search changes
  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(0)
  }

  // Only Department Users API
  const departmentUsersQuery = useDepartmentUsersList({
    page,
    size,
    search,
  })

  // Map API users to DepartmentUser table structure, with fallback to mock data
  const apiUsersList = useMemo<DepartmentUser[]>(() => {
    const list = departmentUsersQuery.data?.data
    if (list && list.length > 0) {
      return list.map((u, idx) => {
        const isPresent =
          u.isPresentToday ??
          (u.presentDays ? u.presentDays > 0 : true)
        const role = (
          u.role === 'HEAD' || u.isHead
            ? 'TEAM_LEAD'
            : u.role === 'SENIOR_EXECUTIVE'
              ? 'SENIOR_EXECUTIVE'
              : 'ONBOARDING_EXECUTIVE'
        ) as DepartmentUserRole

        return {
          id: String(u.id ?? u.username ?? `u-${idx}`),
          name: u.username || u.email,
          phone: u.contact || '+91 98765 00000',
          email: u.email,
          role,
          joinedLabel: u.createdAt
            ? new Date(u.createdAt).toLocaleDateString('en-IN', {
                month: 'short',
                year: 'numeric',
              })
            : 'Jan 2024',
          target: u.target ?? 6,
          achievedPercent:
            u.achievedPercent ??
            (u.completed && u.target
              ? Math.round((u.completed / u.target) * 100)
              : 100),
          presentDays: u.presentDays ?? 1,
          absentDays: u.absentDays ?? 0,
          isPresentToday: isPresent,
        }
      })
    }
    return sampleDepartmentUsers
  }, [departmentUsersQuery.data?.data])

  const [localUsers, setLocalUsers] = useState<DepartmentUser[] | null>(null)
  const users = localUsers ?? apiUsersList

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) {
      return users
    }

    return users.filter((user) =>
      [user.name, user.phone, user.email].some((field) =>
        field.toLowerCase().includes(term),
      ),
    )
  }, [users, search])

  const presentToday = users.filter(
    (user) => user.isPresentToday,
  ).length

  function closeModal() {
    setModal({ kind: 'none' })
  }

  function handleCreate(values: DepartmentUserFormValues) {
    setLocalUsers([
      ...users,
      {
        id: `u-${Date.now()}`,
        name: values.name,
        phone: values.phone,
        email: values.email,
        role: values.role,
        target: values.target,
        joinedLabel: new Date().toLocaleDateString('en-IN', {
          month: 'short',
          year: 'numeric',
        }),
        achievedPercent: 0,
        presentDays: 0,
        absentDays: 0,
        isPresentToday: false,
      },
    ])
    closeModal()
  }

  function handleEdit(
    user: DepartmentUser,
    values: DepartmentUserFormValues,
  ) {
    setLocalUsers(
      users.map((item) =>
        item.id === user.id
          ? {
              ...item,
              name: values.name,
              phone: values.phone,
              email: values.email,
              role: values.role,
              target: values.target,
            }
          : item,
      ),
    )
    closeModal()
  }

  function handleDelete(user: DepartmentUser) {
    setLocalUsers(users.filter((item) => item.id !== user.id))
    closeModal()
  }

  return (
    <>
      {viewingAs ? (
        <ImpersonationBanner
          name={viewingAs.name}
          onExit={() => setViewingAs(null)}
        />
      ) : null}

      <div className="head-toolbar">
        <SearchBar
          value={search}
          onChange={handleSearchChange}
          placeholder="Search by name, number or email"
        />

        <LearningButton newCount={2} />

        {canManageUsers ? (
          <Button
            className="head-primary-button"
            onClick={() => setModal({ kind: 'create' })}
          >
            <Icon name="userPlus" size={16} />
            Add User
          </Button>
        ) : null}
      </div>

      <SectionCard
        title="Department Users"
        meta={
          <>
            <Pill tone="info" size="sm">
              {departmentUsersQuery.data?.totalElements ?? users.length} users
            </Pill>

            <Pill tone="success" size="sm">
              {presentToday} present today
            </Pill>
          </>
        }
        hint="Attendance & achievement · this month"
      >
        <DepartmentUsersTable
          users={filteredUsers}
          hiddenColumns={columnFeatures.hiddenColumns}
          canEditActions={canManageUsers}
          onView={(user) => setModal({ kind: 'report', user })}
          onEdit={(user) => setModal({ kind: 'edit', user })}
          onDelete={(user) =>
            setModal({ kind: 'delete', user })
          }
          onLoginAs={handleLoginAs}
          renderExpanded={(user) => (
            <UserDetails user={user} />
          )}
        />
      </SectionCard>

      {/* Pagination */}
      {departmentUsersQuery.data && departmentUsersQuery.data.totalPage > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || departmentUsersQuery.isFetching}
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {page + 1} of {departmentUsersQuery.data.totalPage}
          </span>
          <button
            className="pagination-btn"
            onClick={() => setPage((p) => Math.min(departmentUsersQuery.data.totalPage - 1, p + 1))}
            disabled={page >= departmentUsersQuery.data.totalPage - 1 || departmentUsersQuery.isFetching}
          >
            Next
          </button>
        </div>
      )}

      {canManageUsers ? (
        <UserFormModal
          open={modal.kind === 'create'}
          mode="create"
          onClose={closeModal}
          onSubmit={handleCreate}
        />
      ) : null}

      {canManageUsers && modal.kind === 'edit' ? (
        <UserFormModal
          open
          mode="edit"
          initialValues={{
            name: modal.user.name,
            phone: modal.user.phone,
            target: modal.user.target,
            email: modal.user.email,
            role: modal.user.role,
          }}
          onClose={closeModal}
          onSubmit={(values) =>
            handleEdit(modal.user, values)
          }
        />
      ) : null}

      {canManageUsers && modal.kind === 'delete' ? (
        <ConfirmDialog
          open
          title="Remove user?"
          message={`${modal.user.name} will lose access to the department panel.`}
          confirmLabel="Remove"
          onClose={closeModal}
          onConfirm={() => handleDelete(modal.user)}
        />
      ) : null}

      {modal.kind === 'report' ? (
        <StaffReportModal
          open
          onClose={closeModal}
          person={{
            name: modal.user.name,
            email: modal.user.email,
            dateLabel: 'Today',
            attendance: modal.user.isPresentToday
              ? 'PRESENT'
              : 'ABSENT',
          }}
          items={sampleWorkItemsByUser[modal.user.id] ?? []}
          target={sampleDailyTargetByUser[modal.user.id] ?? 0}
        />
      ) : null}
    </>
  )
}
