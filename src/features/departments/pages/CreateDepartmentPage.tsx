import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { AdminServiceItem } from '../../../api/admin-services.api'
import { useCreateDepartment } from '../hooks/useCreateDepartment'
import { useDepartments } from '../hooks/useDepartments'
import type { CreateDepartmentRequest } from '../types/department.types'
import { AddAdminServiceModal } from '../../../components/departments/AddAdminServiceModal'
import { DepartmentFormModal } from '../../../components/departments/DepartmentFormModal'
import { PageLayout } from '../../../components/layout/PageLayout'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { notifyHeadCreated } from '../../../api/notification-factory'

export function CreateDepartmentPage() {
  const navigate = useNavigate()
  const departmentsQuery = useDepartments()
  const createMutation = useCreateDepartment()

  const [activeStep, setActiveStep] = useState<'service' | 'login'>('service')
  const [createdService, setCreatedService] = useState<AdminServiceItem | null>(null)
  const [createdHeadName, setCreatedHeadName] = useState<string | null>(null)

  const existingDepartments = departmentsQuery.data ?? []

  function handleServiceCreated(service: AdminServiceItem) {
    setCreatedService(service)
  }

  function handleCreateHead(data: CreateDepartmentRequest) {
    createMutation.mutate(data, {
      onSuccess: () => {
        notifyHeadCreated(data.name || data.username || '', data.email || '')
        setCreatedHeadName(data.name || data.username || data.departmentType || 'Department')
      },
    })
  }

  return (
    <PageLayout>
      <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%', paddingBottom: '3rem', paddingTop: '0.75rem' }}>
        {/* Step Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '1.25rem',
            backgroundColor: '#f1f5f9',
            padding: '4px',
            borderRadius: '10px',
          }}
          role="tablist"
          aria-label="Department creation steps"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeStep === 'service'}
            onClick={() => setActiveStep('service')}
            style={{
              flex: 1,
              padding: '10px 14px',
              fontSize: '0.875rem',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeStep === 'service' ? '#ffffff' : 'transparent',
              color: activeStep === 'service' ? '#1d4ed8' : '#64748b',
              boxShadow: activeStep === 'service' ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
            }}
          >
            <span
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                backgroundColor: activeStep === 'service' ? '#2563eb' : '#cbd5e1',
                color: '#ffffff',
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
              }}
            >
              1
            </span>
            Step 1: Add New Service / Department Type
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeStep === 'login'}
            onClick={() => setActiveStep('login')}
            style={{
              flex: 1,
              padding: '10px 14px',
              fontSize: '0.875rem',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeStep === 'login' ? '#ffffff' : 'transparent',
              color: activeStep === 'login' ? '#1d4ed8' : '#64748b',
              boxShadow: activeStep === 'login' ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
            }}
          >
            <span
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                backgroundColor: activeStep === 'login' ? '#2563eb' : '#cbd5e1',
                color: '#ffffff',
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
              }}
            >
              2
            </span>
            Step 2: Create Department Head Login
          </button>
        </div>

        {/* Step 1: Add New Service (Matches User's Screenshot Exactly) */}
        {activeStep === 'service' && (
          <div>
            {createdService ? (
              <Card
                style={{
                  padding: '2.5rem',
                  textAlign: 'center',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '12px',
                }}
              >
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
                <h2
                  style={{
                    color: '#166534',
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    marginBottom: '0.5rem',
                  }}
                >
                  Service Added Successfully!
                </h2>
                <p
                  style={{
                    color: '#15803d',
                    fontSize: '0.95rem',
                    marginBottom: '1.75rem',
                  }}
                >
                  Service <strong>"{createdService.serviceType}"</strong> is now linked to Department Type{' '}
                  <strong>"{createdService.departmentType}"</strong>.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setActiveStep('login')
                    }}
                  >
                    👉 Proceed to Step 2: Create Head Login
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setCreatedService(null)}
                  >
                    ＋ Add Another Service
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => navigate({ to: '/admin' })}
                  >
                    🏢 View Departments
                  </Button>
                </div>
              </Card>
            ) : (
              <Card
                style={{
                  padding: '2rem',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                }}
              >
                <AddAdminServiceModal
                  open={true}
                  embedded={true}
                  onClose={() => navigate({ to: '/admin' })}
                  onCreated={handleServiceCreated}
                />
              </Card>
            )}
          </div>
        )}

        {/* Step 2: Create Department Head Login */}
        {activeStep === 'login' && (
          <div>
            {createdHeadName ? (
              <Card
                style={{
                  padding: '2.5rem',
                  textAlign: 'center',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '12px',
                }}
              >
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎉</div>
                <h2
                  style={{
                    color: '#166534',
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    marginBottom: '0.5rem',
                  }}
                >
                  Department Head Account Created!
                </h2>
                <p
                  style={{
                    color: '#15803d',
                    fontSize: '0.95rem',
                    marginBottom: '1.75rem',
                  }}
                >
                  Account <strong>"{createdHeadName}"</strong> has been created with initial route & column permissions.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Button
                    variant="primary"
                    onClick={() => navigate({ to: '/admin' })}
                  >
                    🏢 Go to Departments List
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setCreatedHeadName(null)
                      setCreatedService(null)
                      setActiveStep('service')
                    }}
                  >
                    ＋ Create Another Department
                  </Button>
                </div>
              </Card>
            ) : (
              <Card
                style={{
                  padding: '2rem',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                }}
              >
                <DepartmentFormModal
                  open={true}
                  embedded={true}
                  department={null}
                  initialService={createdService}
                  existingDepartments={existingDepartments}
                  isSubmitting={createMutation.isPending}
                  error={createMutation.error?.message}
                  onClose={() => navigate({ to: '/admin' })}
                  onCreate={handleCreateHead}
                  onUpdate={() => {}}
                />
              </Card>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
