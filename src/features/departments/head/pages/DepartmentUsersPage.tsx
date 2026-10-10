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
  sampleWorkItemsByUser,
} from '../../../../api/mock/head.db'
import { useColumnFeatures } from '../../../permissions/hooks/useColumnFeatures'
import { useHeadDepartmentId } from '../hooks/useHeadDepartmentId'
import {
  useDepartmentUsersList,
  useOnboardingCustomersList,
  useAuthOnboardingSummary,
} from '../../hooks/useDepartmentUsersList'
import { useAssigningUsers } from '../../hooks/useAssigningUsers'
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
 * - GET /api/meetings/users/assigning-list?departmentType=ONBOARDING_DEPARTMENT
 * - GET /api/auth/onboarding/customers?page=0&size=10
 * - GET /api/auth/onboarding/summary
 */
export function DepartmentUsersPage() {
  const departmentId = useHeadDepartmentId()
  const columnFeatures = useColumnFeatures(departmentId, 'users')
  const canManageUsers = columnFeatures.canEdit('actions')

  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<ModalState>({ kind: 'none' })
  const [viewingAs, setViewingAs] =
    useState<DepartmentUser | null>(null)

  // 1. Department Users API
  const departmentUsersQuery = useDepartmentUsersList({
    page: 0,
    size: 10,
    search,
  })

  // 2. Assigning List API
  const assigningUsersQuery = useAssigningUsers('ONBOARDING_DEPARTMENT')

  // 3. Onboarding Customers API
  const onboardingCustomersQuery = useOnboardingCustomersList({
    page: 0,
    size: 10,
  })

  // 4. Onboarding Summary API
  const authSummaryQuery = useAuthOnboardingSummary({
    department: 'ONBOARDING_DEPARTMENT',
  })

  // Map the real API users to the table's view model.
  const apiUsersList = useMemo<DepartmentUser[]>(() => {
    const list = departmentUsersQuery.data?.data ?? []
    return list.map((u, idx) => {
        const isPresent =
          u.isPresentToday ??
          (u.absent !== undefined ? !u.absent : true)
        const role = (
          u.role === 'HEAD' || u.isHead
            ? 'TEAM_LEAD'
            : u.role === 'SENIOR_EXECUTIVE' || u.seniorUser
              ? 'SENIOR_EXECUTIVE'
              : 'ONBOARDING_EXECUTIVE'
        ) as DepartmentUserRole

        return {
          id: String(u.id ?? u.username ?? `u-${idx}`),
          name: u.username || u.email,
          phone: u.contact || '—',
          email: u.email,
          role,
          joinedLabel: u.createdAt
            ? new Date(u.createdAt).toLocaleDateString('en-IN', {
                month: 'short',
                year: 'numeric',
              })
            : '—',
          target: u.target ?? 0,
          achievedPercent:
            u.achievedPercent ??
            (u.totalCompletedCustomers && u.target
              ? Math.round((u.totalCompletedCustomers / u.target) * 100)
              : 0),
          presentDays: u.presentDays ?? (isPresent ? 1 : 0),
          absentDays: u.absentDays ?? (isPresent ? 0 : 1),
          isPresentToday: isPresent,
        }
      })
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

            {assigningUsersQuery.data &&
            assigningUsersQuery.data.length > 0 ? (
              <Pill tone="neutral" size="sm">
                {assigningUsersQuery.data.length} assignable
              </Pill>
            ) : null}

            {authSummaryQuery.data?.totalCustomers !== undefined ? (
              <Pill tone="neutral" size="sm">
                {authSummaryQuery.data.totalCustomers} total customers
              </Pill>
            ) : null}

            {onboardingCustomersQuery.data?.totalElements !== undefined ? (
              <Pill tone="warning" size="sm">
                {onboardingCustomersQuery.data.totalElements} onboarding queue
              </Pill>
            ) : null}
          </>
        }
        hint="Attendance & achievement · this month"
      >
        <DepartmentUsersTable
          users={filteredUsers}
          emptyMessage={
            departmentUsersQuery.isLoading
              ? 'Loading users…'
              : departmentUsersQuery.isError
                ? 'Unable to load users. Please try again.'
                : 'No users found.'
          }
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
