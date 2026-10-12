import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { AdminServiceItem } from '../../../api/admin-services.api'
import { ProfileChip } from '../../../components/common/ProfileChip'
import { AdminServiceListCard } from '../../../components/departments/AdminServiceListCard'
import { DepartmentFormModal } from '../../../components/departments/DepartmentFormModal'
import { PageHeader } from '../../../components/layout/PageHeader'
import { PageLayout } from '../../../components/layout/PageLayout'
import { Button } from '../../../components/ui/Button'
import { useCreateDepartment } from '../hooks/useCreateDepartment'
import { useDepartments } from '../hooks/useDepartments'
import type { CreateDepartmentRequest, Department } from '../types/department.types'

export function ServicesListPage() {
  const navigate = useNavigate()
  const departmentsQuery = useDepartments()
  const createMutation = useCreateDepartment()

  const [selectedServiceForDept, setSelectedServiceForDept] =
    useState<AdminServiceItem | null>(null)
  const [showCreateDeptModal, setShowCreateDeptModal] = useState(false)

  const departments = useMemo(() => {
    const all = departmentsQuery.data ?? []
    const headMap = new Map<string, Department>()
    for (const dept of all) {
      if (dept.role === 'DEPARTMENT_HEAD') {
        const typeKey = dept.type || 'unknown'
        if (!headMap.has(typeKey)) {
          headMap.set(typeKey, dept)
        }
      }
    }
    return Array.from(headMap.values())
  }, [departmentsQuery.data])

  function handleCreateDepartment(data: CreateDepartmentRequest) {
    createMutation.mutate(data, {
      onSuccess: () => {
        setShowCreateDeptModal(false)
        setSelectedServiceForDept(null)
        navigate({ to: '/admin' })
      },
    })
  }

  return (
    <PageLayout>
      <PageHeader
        breadcrumb="Administration / Services List"
        title="Services Management"
        description="View and manage your available services and plans (Step 1: Add Service -> Step 2: Create Department)."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => navigate({ to: '/admin' })}
            >
              🏢 Go to Departments
            </Button>
            <Button variant="icon" aria-label="Notifications">
              ♢
            </Button>
            <ProfileChip />
          </>
        }
      />

      <AdminServiceListCard
        onCreateDepartmentForService={(service) => {
          setSelectedServiceForDept(service)
          setShowCreateDeptModal(true)
        }}
      />

      <DepartmentFormModal
        open={showCreateDeptModal}
        department={null}
        initialService={selectedServiceForDept}
        existingDepartments={departments}
        isSubmitting={createMutation.isPending}
        error={createMutation.error?.message}
        onClose={() => {
          setShowCreateDeptModal(false)
          setSelectedServiceForDept(null)
          createMutation.reset()
        }}
        onCreate={handleCreateDepartment}
        onUpdate={() => {}}
      />
    </PageLayout>
  )
}

