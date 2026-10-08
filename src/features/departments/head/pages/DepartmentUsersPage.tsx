import { useMemo, useState } from 'react'
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
import type {
  DepartmentUser,
  DepartmentUserFormValues,
} from '../types/head.types'

type ModalState =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; user: DepartmentUser }
  | { kind: 'delete'; user: DepartmentUser }
  | { kind: 'report'; user: DepartmentUser }

/**
 * Head panel — Department Users. Composes the
 * reusable head/* components with local mock state;
 * swap the useState for TanStack Query hooks when
 * the API is ready.
 */
export function DepartmentUsersPage() {
  const departmentId = useHeadDepartmentId()
  const columnFeatures = useColumnFeatures(departmentId, 'users')
  // Manage access follows the admin's Actions column permission
  // (Role A = head, Role B = user); Actions = CAN_READ → read-only.
  const canManageUsers = columnFeatures.canEdit('actions')

  const [users, setUsers] = useState(sampleDepartmentUsers)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<ModalState>({ kind: 'none' })
  const [viewingAs, setViewingAs] =
    useState<DepartmentUser | null>(null)

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
    setUsers((current) => [
      ...current,
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
    setUsers((current) =>
      current.map((item) =>
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
    setUsers((current) =>
      current.filter((item) => item.id !== user.id),
    )
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
          onChange={setSearch}
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
              {users.length} users
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
          onLoginAs={canManageUsers ? (user) => setViewingAs(user) : undefined}
          renderExpanded={(user) => (
            <UserDetails user={user} />
          )}
        />
      </SectionCard>

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
