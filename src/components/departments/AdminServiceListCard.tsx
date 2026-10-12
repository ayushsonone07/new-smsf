import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addServicesToAdminPlan,
  decideTimelineRequest,
  fetchAdminPlans,
  fetchPendingTimelineRequests,
  fetchServicesForPlan,
  manageAdminPlan,
  type AdminServiceItem,
  type PlanTypeItem,
} from '../../api/admin-services.api'
import {
  useAdminServices,
  useManageAdminService,
} from '../../features/departments/hooks/useAdminServices'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { AddAdminServiceModal } from './AddAdminServiceModal'

interface AdminServiceListCardProps {
  onCreateDepartmentForService?: (service: AdminServiceItem) => void
}

export function AdminServiceListCard({
  onCreateDepartmentForService,
}: AdminServiceListCardProps) {
  const queryClient = useQueryClient()
  const servicesQuery = useAdminServices()
  const manageMutation = useManageAdminService()

  const [showPlans, setShowPlans] = useState(false)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingService, setEditingService] =
    useState<AdminServiceItem | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // Plans state
  const [planSearch, setPlanSearch] = useState('')
  const [planPage, setPlanPage] = useState(0)
  const [planPageSize, setPlanPageSize] = useState(10)
  const [isAddPlanOpen, setIsAddPlanOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<PlanTypeItem | null>(null)
  const [planForm, setPlanForm] = useState({
    name: '',
    departmentTypes: [] as string[],
    amount: '',
    additionalAmount: '',
    durationMonths: '',
  })
  const [selectedDeptForPlan, setSelectedDeptForPlan] = useState('')
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set())

  // Subservices modal state
  const [selectedPlanForSubservices, setSelectedPlanForSubservices] =
    useState<PlanTypeItem | null>(null)
  const [isAddSubservicesOpen, setIsAddSubservicesOpen] = useState(false)
  const [selectedSubserviceIds, setSelectedSubserviceIds] = useState<string[]>(
    [],
  )

  // Pending timeline approvals modal state
  const [isPendingApprovalsOpen, setIsPendingApprovalsOpen] = useState(false)
  const [processingTimelineId, setProcessingTimelineId] = useState<
    string | null
  >(null)

  const services = useMemo(
    () => servicesQuery.data ?? [],
    [servicesQuery.data],
  )

  const availableDepartmentTypes = useMemo(
    () =>
      Array.from(
        new Set(services.map((s) => s.departmentType).filter(Boolean)),
      ),
    [services],
  )

  const filteredServices = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return services
    return services.filter((item) =>
      [item.serviceType, item.departmentType, String(item.id)]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [services, search])

  // Plans query
  const plansQuery = useQuery({
    queryKey: ['admin-plans', planSearch, planPage, planPageSize],
    queryFn: () =>
      fetchAdminPlans({
        searchParam: planSearch || undefined,
        page: planPage,
        size: planPageSize,
      }),
    enabled: showPlans,
  })

  const managePlanMutation = useMutation({
    mutationFn: manageAdminPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] })
    },
  })

  // Subservices queries
  const planSubservicesQuery = useQuery({
    queryKey: ['plan-subservices', selectedPlanForSubservices?.planTypeId],
    queryFn: () =>
      fetchServicesForPlan(selectedPlanForSubservices?.planTypeId || '0'),
    enabled:
      Boolean(selectedPlanForSubservices?.planTypeId) && !isAddSubservicesOpen,
  })

  const allAvailableSubservicesQuery = useQuery({
    queryKey: ['plan-subservices', '0'],
    queryFn: () => fetchServicesForPlan('0'),
    enabled: isAddSubservicesOpen,
  })

  const addSubservicesMutation = useMutation({
    mutationFn: addServicesToAdminPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['plan-subservices', selectedPlanForSubservices?.planTypeId],
      })
      setIsAddSubservicesOpen(false)
      setSelectedSubserviceIds([])
    },
  })

  // Pending timeline approvals query
  const pendingTimelineQuery = useQuery({
    queryKey: ['pending-timeline-requests'],
    queryFn: fetchPendingTimelineRequests,
    enabled: isPendingApprovalsOpen,
  })

  const decideTimelineMutation = useMutation({
    mutationFn: decideTimelineRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['pending-timeline-requests'],
      })
    },
    onSettled: () => {
      setProcessingTimelineId(null)
    },
  })

  function handleExportCsv() {
    const headers = [
      'S.No',
      'Service Type',
      'Department Type',
      'Active',
      'Created At',
    ]
    const rows = services.map((service, index) => [
      index + 1,
      service.serviceType,
      service.departmentType,
      service.isServiceActive ? 'Yes' : 'No',
      service.createdAt ?? '',
    ])
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `services_${new Date().toISOString().split('T')[0]}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function handleDeleteService(service: AdminServiceItem) {
    if (
      !window.confirm(
        `Are you sure you want to delete service "${service.serviceType}" (${service.departmentType})?`,
      )
    ) {
      return
    }
    setDeletingId(service.id)
    manageMutation.mutate(
      {
        serviceId: service.id,
        serviceType: service.serviceType,
        departmentType: service.departmentType,
        isServiceActive: service.isServiceActive,
        previousServiceType: service.serviceType,
        action: 'delete',
      },
      {
        onSettled: () => setDeletingId(null),
      },
    )
  }

  function openAddPlanModal() {
    setEditingPlan(null)
    setPlanForm({
      name: '',
      departmentTypes: [],
      amount: '',
      additionalAmount: '',
      durationMonths: '',
    })
    setSelectedDeptForPlan('')
    setIsAddPlanOpen(true)
  }

  function openEditPlanModal(plan: PlanTypeItem) {
    setEditingPlan(plan)
    setPlanForm({
      name: plan.planName || '',
      departmentTypes: plan.departmentTypes ?? [],
      amount: plan.amount != null ? String(plan.amount) : '',
      additionalAmount:
        plan.additionalAmount != null ? String(plan.additionalAmount) : '',
      durationMonths:
        plan.durationMonths != null ? String(plan.durationMonths) : '',
    })
    setSelectedDeptForPlan('')
    setIsAddPlanOpen(true)
  }

  function handleSavePlan(e: React.FormEvent) {
    e.preventDefault()
    if (!planForm.name.trim() || planForm.departmentTypes.length === 0) return

    managePlanMutation.mutate(
      {
        action: editingPlan ? 'edit' : 'add',
        planTypeId: editingPlan?.planTypeId,
        plan: {
          planName: planForm.name.trim(),
          departmentTypes: planForm.departmentTypes,
          amount: planForm.amount === '' ? null : Number(planForm.amount),
          additionalAmount:
            planForm.additionalAmount === ''
              ? null
              : Number(planForm.additionalAmount),
          durationMonths:
            planForm.durationMonths === ''
              ? null
              : Number(planForm.durationMonths),
        },
      },
      {
        onSuccess: () => {
          setIsAddPlanOpen(false)
          setEditingPlan(null)
        },
      },
    )
  }

  function handleDeletePlan(plan: PlanTypeItem) {
    if (
      !window.confirm(
        `Are you sure you want to delete plan "${plan.planName}"?`,
      )
    ) {
      return
    }
    managePlanMutation.mutate({
      action: 'delete',
      planTypeId: plan.planTypeId,
    })
  }

  function handleTogglePlanActive(plan: PlanTypeItem) {
    const isCurrentlyEnabled = plan.enabled !== false
    managePlanMutation.mutate({
      action: isCurrentlyEnabled ? 'deactivate' : 'activate',
      planTypeId: plan.planTypeId,
    })
  }

  const plans = plansQuery.data?.data ?? []

  return (
    <>
      <Card>
        <div className="table-toolbar">
          <div>
            <h2>
              {showPlans
                ? 'Plans Management'
                : 'Services Management (Service List)'}
            </h2>
            <p>
              {showPlans
                ? 'View and manage plans, department types, and associated subservices.'
                : 'View and manage your available services (Step 1: Create Service -> Step 2: Create Department).'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {!showPlans ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setIsPendingApprovalsOpen(true)}
                >
                  ⏱ Pending Approvals
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowPlans(true)}
                >
                  💳 Plans
                </Button>
                <Button onClick={() => setShowAddModal(true)}>
                  <span>＋</span> Add Service
                </Button>
                <Button variant="secondary" onClick={handleExportCsv}>
                  ⬇ Export
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setShowPlans(false)}
                >
                  ⚙ Services
                </Button>
                <Button onClick={openAddPlanModal}>
                  <span>＋</span> Add Plan
                </Button>
              </>
            )}
          </div>
        </div>

        {!showPlans ? (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search services..."
                style={{
                  flex: '1 1 280px',
                  maxWidth: '420px',
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                }}
              />

              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                Showing <strong>{filteredServices.length}</strong> of{' '}
                <strong>{services.length}</strong> services
              </span>
            </div>

            {servicesQuery.isLoading ? (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#64748b',
                }}
              >
                Loading services...
              </div>
            ) : servicesQuery.isError ? (
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: '8px',
                  backgroundColor: '#fef2f2',
                  color: '#b91c1c',
                  fontSize: '0.875rem',
                }}
              >
                Failed to load services: {servicesQuery.error.message}
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>SERVICE TYPE</th>
                      <th>DEPARTMENT TYPE</th>
                      <th>STATUS</th>
                      <th>CREATED AT</th>
                      <th className="align-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredServices.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            textAlign: 'center',
                            padding: '2rem',
                            color: '#64748b',
                          }}
                        >
                          {search
                            ? 'No services match your search'
                            : 'No services found. Click "+ Add Service" to create one.'}
                        </td>
                      </tr>
                    ) : (
                      filteredServices.map((service, index) => (
                        <tr key={service.id}>
                          <td>{index + 1}</td>
                          <td>
                            <strong style={{ color: '#0f172a' }}>
                              {service.serviceType.replace(/_/g, ' ')}
                            </strong>
                            <div
                              style={{ fontSize: '0.72rem', color: '#64748b' }}
                            >
                              <code>{service.serviceType}</code>
                            </div>
                          </td>
                          <td>
                            <span className="dept-type-badge">
                              {service.departmentType}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`status-pill ${
                                service.isServiceActive ? 'active' : 'inactive'
                              }`}
                            >
                              {service.isServiceActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            {service.createdAt
                              ? new Date(service.createdAt).toLocaleDateString()
                              : '—'}
                          </td>
                          <td className="align-right">
                            <div className="action-group">
                              {onCreateDepartmentForService ? (
                                <button
                                  type="button"
                                  className="icon-action"
                                  title="Step 2: Create Department Head for this Service"
                                  onClick={() =>
                                    onCreateDepartmentForService(service)
                                  }
                                  style={{
                                    width: 'auto',
                                    padding: '0.25rem 0.6rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: '#1d4ed8',
                                    backgroundColor: '#eff6ff',
                                    border: '1px solid #bfdbfe',
                                    borderRadius: '6px',
                                  }}
                                >
                                  + Create Dept
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="icon-action"
                                title="Edit service"
                                onClick={() => setEditingService(service)}
                              >
                                ✎
                              </button>
                              <button
                                type="button"
                                className="icon-action danger"
                                title="Delete service"
                                disabled={deletingId === service.id}
                                onClick={() => handleDeleteService(service)}
                              >
                                🗑
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          /* PLANS TABLE VIEW */
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <input
                type="search"
                value={planSearch}
                onChange={(e) => {
                  setPlanSearch(e.target.value)
                  setPlanPage(0)
                }}
                placeholder="Search plans..."
                style={{
                  flex: '1 1 280px',
                  maxWidth: '420px',
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            {plansQuery.isLoading ? (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#64748b',
                }}
              >
                Loading plans...
              </div>
            ) : plansQuery.isError ? (
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: '8px',
                  backgroundColor: '#fef2f2',
                  color: '#b91c1c',
                  fontSize: '0.875rem',
                }}
              >
                Error loading plans: {plansQuery.error.message}
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Plan</th>
                      <th>Department Types</th>
                      <th>Subservices</th>
                      <th>Updated At</th>
                      <th>Created At</th>
                      <th className="align-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          style={{
                            textAlign: 'center',
                            padding: '2rem',
                            color: '#64748b',
                          }}
                        >
                          {planSearch
                            ? 'No plans match your search'
                            : 'No plans found'}
                        </td>
                      </tr>
                    ) : (
                      plans.map((plan, index) => {
                        const isExpanded = expandedPlans.has(plan.planTypeId)
                        const depts = plan.departmentTypes ?? []
                        const shownDepts = isExpanded
                          ? depts
                          : depts.slice(0, 2)

                        return (
                          <tr key={plan.planTypeId}>
                            <td>
                              {planPage * planPageSize + index + 1}
                            </td>
                            <td>
                              <strong>{plan.planName}</strong>
                              {(plan.amount != null ||
                                plan.durationMonths != null) && (
                                <div
                                  style={{
                                    fontSize: '0.75rem',
                                    color: '#64748b',
                                  }}
                                >
                                  {plan.amount != null &&
                                    `₹${Number(plan.amount).toLocaleString('en-IN')}`}
                                  {plan.amount != null &&
                                    Number(plan.additionalAmount) > 0 &&
                                    ` + ₹${Number(plan.additionalAmount).toLocaleString('en-IN')} additional`}
                                  {plan.amount != null &&
                                    plan.durationMonths != null &&
                                    ' · '}
                                  {plan.durationMonths != null &&
                                    `${plan.durationMonths} month${
                                      Number(plan.durationMonths) === 1
                                        ? ''
                                        : 's'
                                    }`}
                                </div>
                              )}
                            </td>
                            <td>
                              <div
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '0.35rem',
                                }}
                              >
                                {shownDepts.map((dept) => (
                                  <span
                                    key={dept}
                                    className="dept-type-badge"
                                  >
                                    {dept.replace(/_/g, ' ')}
                                  </span>
                                ))}
                                {depts.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedPlans((prev) => {
                                        const next = new Set(prev)
                                        if (next.has(plan.planTypeId)) {
                                          next.delete(plan.planTypeId)
                                        } else {
                                          next.add(plan.planTypeId)
                                        }
                                        return next
                                      })
                                    }
                                    style={{
                                      fontSize: '0.75rem',
                                      color: '#2563eb',
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {isExpanded
                                      ? 'Show Less'
                                      : `+${depts.length - 2} More`}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPlanForSubservices(plan)
                                  setIsAddSubservicesOpen(false)
                                }}
                                style={{
                                  padding: '0.25rem 0.6rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  borderRadius: '6px',
                                  backgroundColor: '#f3e8ff',
                                  color: '#7e22ce',
                                  border: '1px solid #d8b4fe',
                                  cursor: 'pointer',
                                }}
                              >
                                👁 View Subservices
                              </button>
                            </td>
                            <td>
                              {plan.updatedAt
                                ? new Date(plan.updatedAt).toLocaleDateString()
                                : '—'}
                            </td>
                            <td>
                              {plan.createdAt
                                ? new Date(plan.createdAt).toLocaleDateString()
                                : '—'}
                            </td>
                            <td className="align-right">
                              <div className="action-group">
                                <button
                                  type="button"
                                  className="icon-action"
                                  title="Edit plan"
                                  onClick={() => openEditPlanModal(plan)}
                                >
                                  ✎
                                </button>
                                <button
                                  type="button"
                                  className="icon-action"
                                  title={
                                    plan.enabled !== false
                                      ? 'Deactivate plan'
                                      : 'Activate plan'
                                  }
                                  onClick={() => handleTogglePlanActive(plan)}
                                >
                                  {plan.enabled !== false ? '⏸' : '▶'}
                                </button>
                                <button
                                  type="button"
                                  className="icon-action danger"
                                  title="Delete plan"
                                  onClick={() => handleDeletePlan(plan)}
                                >
                                  🗑
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>

                {plansQuery.data && plansQuery.data.totalPage > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '1rem',
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Page {planPage + 1} of {plansQuery.data.totalPage} (
                      {plansQuery.data.totalElements} plans)
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button
                        variant="secondary"
                        disabled={planPage === 0}
                        onClick={() => setPlanPage((p) => Math.max(0, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={planPage + 1 >= plansQuery.data.totalPage}
                        onClick={() => setPlanPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                      <select
                        value={planPageSize}
                        onChange={(e) => {
                          setPlanPageSize(Number(e.target.value))
                          setPlanPage(0)
                        }}
                        style={{
                          padding: '0.35rem 0.5rem',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        <option value={10}>10 / page</option>
                        <option value={25}>25 / page</option>
                        <option value={50}>50 / page</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Card>

      {/* Add / Edit Service Modal */}
      <AddAdminServiceModal
        open={showAddModal || Boolean(editingService)}
        editingService={editingService}
        onClose={() => {
          setShowAddModal(false)
          setEditingService(null)
        }}
      />

      {/* Add / Edit Plan Modal */}
      <Modal
        open={isAddPlanOpen}
        onClose={() => {
          setIsAddPlanOpen(false)
          setEditingPlan(null)
        }}
        size="md"
        title={editingPlan ? 'Edit Plan' : 'Add New Plan'}
        description={
          editingPlan
            ? 'Update the plan details and department types.'
            : 'Create a new plan with selected department types.'
        }
      >
        <form
          onSubmit={handleSavePlan}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
        >
          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            Plan Name *
            <input
              type="text"
              required
              value={planForm.name}
              onChange={(e) =>
                setPlanForm({ ...planForm, name: e.target.value })
              }
              placeholder="Enter plan name"
              style={{
                width: '100%',
                marginTop: '0.25rem',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
              }}
            />
          </label>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '0.65rem',
            }}
          >
            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Amount (₹)
              <input
                type="number"
                min={0}
                value={planForm.amount}
                onChange={(e) =>
                  setPlanForm({ ...planForm, amount: e.target.value })
                }
                placeholder="e.g. 6900"
                style={{
                  width: '100%',
                  marginTop: '0.25rem',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                }}
              />
            </label>
            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Additional (₹)
              <input
                type="number"
                min={0}
                value={planForm.additionalAmount}
                onChange={(e) =>
                  setPlanForm({
                    ...planForm,
                    additionalAmount: e.target.value,
                  })
                }
                placeholder="Optional"
                style={{
                  width: '100%',
                  marginTop: '0.25rem',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                }}
              />
            </label>
            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Duration (months)
              <input
                type="number"
                min={1}
                max={60}
                value={planForm.durationMonths}
                onChange={(e) =>
                  setPlanForm({ ...planForm, durationMonths: e.target.value })
                }
                placeholder="e.g. 15"
                style={{
                  width: '100%',
                  marginTop: '0.25rem',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                }}
              />
            </label>
          </div>

          <div>
            <span
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '0.25rem',
              }}
            >
              Department Types *
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                value={selectedDeptForPlan}
                onChange={(e) => setSelectedDeptForPlan(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                }}
              >
                <option value="">Select department type</option>
                {availableDepartmentTypes.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="secondary"
                disabled={
                  !selectedDeptForPlan ||
                  planForm.departmentTypes.includes(selectedDeptForPlan)
                }
                onClick={() => {
                  if (
                    selectedDeptForPlan &&
                    !planForm.departmentTypes.includes(selectedDeptForPlan)
                  ) {
                    setPlanForm({
                      ...planForm,
                      departmentTypes: [
                        ...planForm.departmentTypes,
                        selectedDeptForPlan,
                      ],
                    })
                    setSelectedDeptForPlan('')
                  }
                }}
              >
                + Add
              </Button>
            </div>

            {planForm.departmentTypes.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.35rem',
                  marginTop: '0.5rem',
                }}
              >
                {planForm.departmentTypes.map((dept) => (
                  <span
                    key={dept}
                    className="dept-type-badge"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    {dept.replace(/_/g, ' ')}
                    <button
                      type="button"
                      onClick={() =>
                        setPlanForm({
                          ...planForm,
                          departmentTypes: planForm.departmentTypes.filter(
                            (d) => d !== dept,
                          ),
                        })
                      }
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#dc2626',
                        fontWeight: 700,
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="modal-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsAddPlanOpen(false)
                setEditingPlan(null)
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                managePlanMutation.isPending ||
                !planForm.name.trim() ||
                planForm.departmentTypes.length === 0
              }
            >
              {managePlanMutation.isPending
                ? 'Saving...'
                : editingPlan
                  ? 'Update Plan'
                  : 'Add Plan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View / Add Subservices Modal */}
      <Modal
        open={Boolean(selectedPlanForSubservices)}
        onClose={() => {
          setSelectedPlanForSubservices(null)
          setIsAddSubservicesOpen(false)
          setSelectedSubserviceIds([])
        }}
        size="lg"
        title={
          isAddSubservicesOpen
            ? 'Add Services to Plan'
            : 'Associated Services'
        }
        description={
          selectedPlanForSubservices
            ? `Services associated with "${selectedPlanForSubservices.planName}"`
            : ''
        }
      >
        {!isAddSubservicesOpen ? (
          <div>
            {planSubservicesQuery.isLoading ? (
              <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                Loading associated services...
              </div>
            ) : (planSubservicesQuery.data ?? []).length === 0 ? (
              <div
                style={{
                  padding: '1.5rem',
                  textAlign: 'center',
                  color: '#64748b',
                }}
              >
                No services associated with this plan yet.
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  maxHeight: '340px',
                  overflowY: 'auto',
                }}
              >
                {(planSubservicesQuery.data ?? []).map((srv, idx) => (
                  <div
                    key={srv.departmentServiceId || idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <strong>{srv.departmentServiceName}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {srv.departmentType || 'No department'}
                      </div>
                    </div>
                    <span className="dept-type-badge">Associated</span>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: '1rem' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSelectedPlanForSubservices(null)}
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setSelectedSubserviceIds([])
                  setIsAddSubservicesOpen(true)
                }}
              >
                + Add Services
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {allAvailableSubservicesQuery.isLoading ? (
              <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                Loading available services...
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  maxHeight: '340px',
                  overflowY: 'auto',
                }}
              >
                {(allAvailableSubservicesQuery.data ?? []).map((srv) => {
                  const checked = selectedSubserviceIds.includes(
                    srv.departmentServiceId,
                  )
                  return (
                    <label
                      key={srv.departmentServiceId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '8px',
                        border: checked
                          ? '1px solid #2563eb'
                          : '1px solid #e2e8f0',
                        backgroundColor: checked ? '#eff6ff' : '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedSubserviceIds((prev) =>
                            prev.includes(srv.departmentServiceId)
                              ? prev.filter(
                                  (id) => id !== srv.departmentServiceId,
                                )
                              : [...prev, srv.departmentServiceId],
                          )
                        }
                      />
                      <div>
                        <strong>{srv.departmentServiceName}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Department: {srv.departmentType || 'None'}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: '1rem' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsAddSubservicesOpen(false)}
              >
                Back
              </Button>
              <Button
                type="button"
                disabled={
                  selectedSubserviceIds.length === 0 ||
                  addSubservicesMutation.isPending
                }
                onClick={() => {
                  if (!selectedPlanForSubservices?.planTypeId) return
                  addSubservicesMutation.mutate({
                    planId: selectedPlanForSubservices.planTypeId,
                    serviceIds: selectedSubserviceIds,
                  })
                }}
              >
                {addSubservicesMutation.isPending
                  ? 'Adding...'
                  : `Add ${selectedSubserviceIds.length} Service(s)`}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Pending Timeline Approvals Modal */}
      <Modal
        open={isPendingApprovalsOpen}
        onClose={() => setIsPendingApprovalsOpen(false)}
        size="lg"
        title="Pending Timeline Approvals"
        description="Review and approve or reject pending timeline update requests from department heads."
      >
        {pendingTimelineQuery.isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            Loading pending timeline requests...
          </div>
        ) : (pendingTimelineQuery.data ?? []).length === 0 ? (
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              color: '#64748b',
            }}
          >
            No pending timeline requests. All timeline update requests have been
            processed.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Service Name</th>
                  <th>Department</th>
                  <th>Requested By</th>
                  <th>TAT</th>
                  <th className="align-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(pendingTimelineQuery.data ?? []).map((req) => {
                  const updation =
                    req.serviceTimeline?.timeline?.updation ?? {}
                  const isBusy =
                    processingTimelineId === req.departmentServiceId
                  return (
                    <tr key={req.departmentServiceId}>
                      <td>
                        <strong>{req.departmentServiceName || 'N/A'}</strong>
                      </td>
                      <td>
                        <span className="dept-type-badge">
                          {req.departmentType || 'N/A'}
                        </span>
                      </td>
                      <td>{updation.requestBy || 'N/A'}</td>
                      <td>
                        {updation.timetobe != null
                          ? `${updation.timetobe} days`
                          : 'N/A'}
                      </td>
                      <td className="align-right">
                        <div className="action-group">
                          <Button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              setProcessingTimelineId(req.departmentServiceId)
                              decideTimelineMutation.mutate({
                                serviceId: req.departmentServiceId,
                                action: 'APPROVE',
                              })
                            }}
                          >
                            ✓ Approve
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={isBusy}
                            onClick={() => {
                              setProcessingTimelineId(req.departmentServiceId)
                              decideTimelineMutation.mutate({
                                serviceId: req.departmentServiceId,
                                action: 'REJECT',
                              })
                            }}
                          >
                            ✕ Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </>
  )
}
