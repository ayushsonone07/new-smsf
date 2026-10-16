import { useMemo, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Globe,
  Bot,
  RefreshCw,
  Phone,
  Mail,
  Building,
  User,
  Eye,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Search,
} from 'lucide-react'
import { LoadingState } from '../../../../components/ui/LoadingState'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { TablePagination } from '../../../../components/ui/TablePagination'
import { CustomersListModal } from '../../../../components/head/customers-list/CustomersListModal'
import { ServiceFlowModal } from '../../../../components/head/customers-list/ServiceFlowModal'
import {
  fetchLightAutowebisionCustomers,
  assignAutowebisionUser,
  updateAutowebisionStatus,
  updateWebsiteExistsStatus,
  fetchAutomationCount,
  type AutowebsionCustomerLightDTO,
} from '../../../../api/autowebsion.api'
import { useAssigningUsers } from '../../hooks/useAssigningUsers'
import { getSession } from '../../../../app/auth/session'
import { initiateAirtelClickToCall } from '../../../../api/airtel.api'
import { recordCustomerActivity } from '../../../../utils/customerActivity'
import { getCustomerFormUrl } from '../../../../utils/urlEncryption'
import type { OnboardingCustomer, OnboardingStatus } from '../../../../components/head/customers-list/CustomersList'
import './AutowebisionCustomers.css'

export type AutowebsionSubTab = 'ALL' | 'WEBSITE' | 'AUTOMATION'
export type AutowebsionStatusFilter = 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'

export function AutowebisionCustomersPage() {
  const session = getSession()

  const [activeSubTab, setActiveSubTab] = useState<AutowebsionSubTab>('ALL')
  const [activeStatus, setActiveStatus] = useState<AutowebsionStatusFilter>('ALL')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)

  // Modals state
  const [selectedCustomer, setSelectedCustomer] = useState<OnboardingCustomer | null>(null)
  const [serviceFlowCustomer, setServiceFlowCustomer] = useState<OnboardingCustomer | null>(null)
  const [updatingWebsiteExistsId, setUpdatingWebsiteExistsId] = useState<number | null>(null)
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null)
  const [callingCustomerId, setCallingCustomerId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 400)
    return () => clearTimeout(handler)
  }, [search])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  const departmentTypeParam =
    activeSubTab === 'WEBSITE'
      ? 'WEBSITE_DEPARTMENT'
      : activeSubTab === 'AUTOMATION'
        ? 'AUTOMATION_DEPARTMENT'
        : undefined

  // 1. Fetch lightweight customers list for Autowebsion
  const customersQuery = useQuery({
    queryKey: [
      'autowebisionCustomers',
      page,
      size,
      debouncedSearch,
      activeStatus,
      activeSubTab,
      selectedAssignee,
      dateFrom,
      dateTo,
    ],
    queryFn: () =>
      fetchLightAutowebisionCustomers({
        page,
        size,
        search: debouncedSearch || undefined,
        status: activeStatus === 'ALL' ? undefined : activeStatus,
        departmentType: departmentTypeParam,
        assignedUserEmail: selectedAssignee !== 'all' ? selectedAssignee : undefined,
        startDate: dateFrom || undefined,
        endDate: dateTo || undefined,
      }),
  })

  // 2. Fetch live automation and website counts for tab badges
  const countsQuery = useQuery({
    queryKey: ['autowebisionCount', session?.user?.email],
    queryFn: () => fetchAutomationCount(session?.user?.email),
    staleTime: 20_000,
  })

  // 3. Fetch assignable users list
  const assigningUsersQuery = useAssigningUsers('AUTOWEBSION_DEPARTMENT')

  const assignees = useMemo(() => {
    return (assigningUsersQuery.data || []).map((u) => ({
      id: u.email,
      name: u.username ? `${u.username} (${u.email})` : u.email,
    }))
  }, [assigningUsersQuery.data])

  // Compute status counts for active sub tab
  const statusCounts = useMemo(() => {
    const counts = countsQuery.data || []
    let total = 0
    let pending = 0
    let inProgress = 0
    let completed = 0

    if (activeSubTab === 'WEBSITE') {
      const match = counts.find((c) => String(c.serviceCategory).toUpperCase().includes('WEB'))
      if (match) {
        total = match.total
        pending = match.pending
        inProgress = match.inProgress
        completed = match.completed
      }
    } else if (activeSubTab === 'AUTOMATION') {
      const match = counts.find((c) => String(c.serviceCategory).toUpperCase().includes('AUTO') && !String(c.serviceCategory).toUpperCase().includes('AUTOWEB'))
      if (match) {
        total = match.total
        pending = match.pending
        inProgress = match.inProgress
        completed = match.completed
      }
    } else {
      const match = counts.find((c) => String(c.serviceCategory).toUpperCase().includes('AUTOWEB'))
      if (match) {
        total = match.total
        pending = match.pending
        inProgress = match.inProgress
        completed = match.completed
      } else {
        // Sum of website + automation
        counts.forEach((c) => {
          total += c.total || 0
          pending += c.pending || 0
          inProgress += c.inProgress || 0
          completed += c.completed || 0
        })
      }
    }

    // Fallback if counts API is not populated
    if (total === 0 && customersQuery.data?.totalElements) {
      total = customersQuery.data.totalElements
    }

    return { total, pending, inProgress, completed }
  }, [countsQuery.data, activeSubTab, customersQuery.data?.totalElements])

  // Convert raw DTO to OnboardingCustomer for detail modal & subservice flow modal
  function toOnboardingCustomer(c: AutowebsionCustomerLightDTO, index: number): OnboardingCustomer {
    const id = String(c.customerId ?? `c-${index}`)
    const s = String(c.mainStatus || 'PENDING').toLowerCase()
    const status: OnboardingStatus = s.includes('complete')
      ? 'completed'
      : s.includes('progress') || s === 'active'
        ? 'in-progress'
        : 'pending'

    const assigned =
      activeSubTab === 'WEBSITE'
        ? c.websiteAssignedUserEmail || c.assignedUserEmail
        : activeSubTab === 'AUTOMATION'
          ? c.automationAssignedUserEmail || c.assignedUserEmail
          : c.assignedUserEmail || c.websiteAssignedUserEmail || c.automationAssignedUserEmail

    return {
      id,
      rowIndex: page * size + index + 1,
      businessName: c.businessName || c.ownerName || 'Customer',
      contactName: c.ownerName || c.businessName || 'Customer',
      contactDate: c.createdAt
        ? new Date(c.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : '—',
      email: c.email || '',
      phone: c.phoneNumber || '',
      callStatus: 'connected',
      status,
      assigneeId: assigned || null,
      remark: c.internalRemark || c.clientRemark || '',
      formUrl: getCustomerFormUrl(c.phoneNumber || '', Boolean(c.hasDuplicateCustomer)),
      serviceType: c.serviceTypes && c.serviceTypes.length > 0 ? c.serviceTypes.join(', ') : 'AUTOWEBSION SERVICE',
      services: c.services || [],
      subServiceInfo: c.subServiceInfo || [],
      rawCustomer: c,
    }
  }

  // Handle toggling "Website Exists"
  async function handleToggleWebsiteExists(customer: AutowebsionCustomerLightDTO) {
    const newStatus = !customer.isWebsiteExists
    setUpdatingWebsiteExistsId(customer.customerId)
    try {
      await updateWebsiteExistsStatus(customer.customerId, newStatus)
      setToast({
        type: 'success',
        message: `Website status updated to ${newStatus ? 'Exists' : 'Not Exists'}.`,
      })
      await customersQuery.refetch()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update website status'
      setToast({ type: 'error', message: msg })
    } finally {
      setUpdatingWebsiteExistsId(null)
    }
  }

  // Handle assigning user
  async function handleAssignUser(customerId: number, assigneeEmail: string) {
    if (!assigneeEmail) return
    try {
      await assignAutowebisionUser({
        customerIds: [customerId],
        assignedUserEmail: assigneeEmail,
        departmentType: departmentTypeParam,
      })
      setToast({ type: 'success', message: 'User assigned successfully.' })
      await customersQuery.refetch()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to assign user'
      setToast({ type: 'error', message: msg })
    }
  }

  // Handle status update
  async function handleStatusChange(customer: AutowebsionCustomerLightDTO, newStatus: string) {
    setUpdatingStatusId(customer.customerId)
    try {
      await updateAutowebisionStatus({
        customerId: customer.customerId,
        updatedStatus: newStatus,
        departmentType: departmentTypeParam,
      })
      setToast({ type: 'success', message: `Status updated to ${newStatus}.` })
      await customersQuery.refetch()
      await countsQuery.refetch()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update status'
      setToast({ type: 'error', message: msg })
    } finally {
      setUpdatingStatusId(null)
    }
  }

  // Click to call
  async function handleCallCustomer(phone: string, name: string, customerId: number) {
    setCallingCustomerId(String(customerId))
    try {
      const result = await initiateAirtelClickToCall(phone)
      if (result?.success === false) {
        throw new Error(result.message || 'Unable to initiate call')
      }
      recordCustomerActivity({
        customerId: String(customerId),
        contact: phone,
        departmentType: 'AUTOWEBSION_DEPARTMENT',
        kind: 'call-initiated',
        detail: `Call initiated to ${name || phone}.`,
      })
      setToast({
        type: 'success',
        message: `Connecting call to ${name || phone}. Please pick up your phone.`,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Call failed'
      setToast({ type: 'error', message: msg })
    } finally {
      setCallingCustomerId(null)
    }
  }

  const rawRows = customersQuery.data?.data || []
  const totalElements = customersQuery.data?.totalElements || rawRows.length

  return (
    <div className="autoweb-container">
      {/* Toast Alert */}
      {toast && (
        <div className={`autoweb-toast autoweb-toast-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header & Sub-Department Selector */}
      <div className="autoweb-header">
        <div className="autoweb-title-group">
          <h2>Autowebsion Department</h2>
          <p>Consolidated management for Website and Automation customers</p>
        </div>

        <div className="autoweb-subtabs">
          <button
            type="button"
            className={`autoweb-subtab-btn ${activeSubTab === 'ALL' ? 'active' : ''}`}
            onClick={() => {
              setActiveSubTab('ALL')
              setPage(0)
            }}
          >
            <span className="autoweb-subtab-icon">🌐⚡</span>
            <span>All Services</span>
          </button>
          <button
            type="button"
            className={`autoweb-subtab-btn ${activeSubTab === 'WEBSITE' ? 'active' : ''}`}
            onClick={() => {
              setActiveSubTab('WEBSITE')
              setPage(0)
            }}
          >
            <Globe size={15} />
            <span>Website Services</span>
          </button>
          <button
            type="button"
            className={`autoweb-subtab-btn ${activeSubTab === 'AUTOMATION' ? 'active' : ''}`}
            onClick={() => {
              setActiveSubTab('AUTOMATION')
              setPage(0)
            }}
          >
            <Bot size={15} />
            <span>Automation Services</span>
          </button>
        </div>
      </div>

      {/* Status Bar & Counts */}
      <div className="autoweb-status-bar">
        <div className="autoweb-status-tabs">
          <button
            type="button"
            className={`autoweb-status-btn ${activeStatus === 'ALL' ? 'active' : ''}`}
            onClick={() => {
              setActiveStatus('ALL')
              setPage(0)
            }}
          >
            All
            <span className="autoweb-status-badge">{statusCounts.total}</span>
          </button>
          <button
            type="button"
            className={`autoweb-status-btn ${activeStatus === 'PENDING' ? 'active' : ''}`}
            onClick={() => {
              setActiveStatus('PENDING')
              setPage(0)
            }}
          >
            Pending
            <span className="autoweb-status-badge pending">{statusCounts.pending}</span>
          </button>
          <button
            type="button"
            className={`autoweb-status-btn ${activeStatus === 'IN_PROGRESS' ? 'active' : ''}`}
            onClick={() => {
              setActiveStatus('IN_PROGRESS')
              setPage(0)
            }}
          >
            In progress
            <span className="autoweb-status-badge in-progress">{statusCounts.inProgress}</span>
          </button>
          <button
            type="button"
            className={`autoweb-status-btn ${activeStatus === 'COMPLETED' ? 'active' : ''}`}
            onClick={() => {
              setActiveStatus('COMPLETED')
              setPage(0)
            }}
          >
            Completed
            <span className="autoweb-status-badge completed">{statusCounts.completed}</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="autoweb-search-wrapper">
          <Search size={15} className="autoweb-search-icon" />
          <input
            type="text"
            className="autoweb-search-input"
            placeholder="Search by customer, phone, or business..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="autoweb-clear-search" onClick={() => setSearch('')}>
              ×
            </button>
          )}
        </div>

        {/* Date Filter & Refresh */}
        <div className="autoweb-filters-right">
          <div className="autoweb-date-group">
            <input
              type="date"
              className="autoweb-date-input"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setPage(0)
              }}
              title="From date"
            />
            <span className="autoweb-date-sep">to</span>
            <input
              type="date"
              className="autoweb-date-input"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setPage(0)
              }}
              title="To date"
            />
          </div>

          {assignees.length > 0 && (
            <select
              className="autoweb-assignee-filter"
              value={selectedAssignee}
              onChange={(e) => {
                setSelectedAssignee(e.target.value)
                setPage(0)
              }}
              title="Filter by assigned user"
            >
              <option value="all">All Assignees</option>
              {assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            className="autoweb-refresh-btn"
            title="Refresh list"
            onClick={() => {
              customersQuery.refetch()
              countsQuery.refetch()
            }}
          >
            <RefreshCw size={14} className={customersQuery.isFetching ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="autoweb-table-card">
        {customersQuery.isPending ? (
          <LoadingState message="Loading Autowebsion customers..." />
        ) : customersQuery.isError ? (
          <ErrorState
            title="Unable to load Autowebsion customers"
            message={customersQuery.error?.message || 'Failed to fetch'}
            onRetry={() => customersQuery.refetch()}
          />
        ) : rawRows.length === 0 ? (
          <div className="autoweb-empty-state">
            <Building size={36} className="autoweb-empty-icon" />
            <p>No customers found matching the selected filters.</p>
          </div>
        ) : (
          <div className="autoweb-table-scroll">
            <table className="autoweb-table">
              <thead>
                <tr>
                  <th style={{ width: '45px' }}>#</th>
                  <th style={{ minWidth: '110px' }}>CREATED</th>
                  <th style={{ minWidth: '120px' }}>WEBSITE EXISTS</th>
                  <th style={{ minWidth: '180px' }}>BUSINESS</th>
                  <th style={{ minWidth: '190px' }}>CONTACT</th>
                  <th style={{ minWidth: '160px' }}>SERVICES</th>
                  <th style={{ minWidth: '135px' }}>STATUS</th>
                  <th style={{ minWidth: '180px' }}>ASSIGN TO</th>
                  <th style={{ minWidth: '170px' }}>REMARK</th>
                  <th style={{ width: '70px', textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {rawRows.map((customer, index) => {
                  const customerId = customer.customerId
                  const createdDate = customer.createdAt
                    ? new Date(customer.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'

                  const currentAssignee =
                    activeSubTab === 'WEBSITE'
                      ? customer.websiteAssignedUserEmail || customer.assignedUserEmail
                      : activeSubTab === 'AUTOMATION'
                        ? customer.automationAssignedUserEmail || customer.assignedUserEmail
                        : customer.assignedUserEmail || customer.websiteAssignedUserEmail || customer.automationAssignedUserEmail

                  const currentStatus = String(customer.mainStatus || 'PENDING').toUpperCase()

                  return (
                    <tr key={customerId || index}>
                      {/* Row Index */}
                      <td className="autoweb-td-index">{page * size + index + 1}</td>

                      {/* Created Date */}
                      <td className="autoweb-td-date">
                        <span className="autoweb-cell-date">{createdDate}</span>
                      </td>

                      {/* Website Exists Toggle */}
                      <td>
                        <button
                          type="button"
                          className={`autoweb-toggle-btn ${customer.isWebsiteExists ? 'exists' : 'not-exists'}`}
                          disabled={updatingWebsiteExistsId === customerId}
                          onClick={() => handleToggleWebsiteExists(customer)}
                          title="Click to toggle Website Exists status"
                        >
                          {updatingWebsiteExistsId === customerId ? (
                            <RefreshCw size={12} className="spin" />
                          ) : customer.isWebsiteExists ? (
                            <CheckCircle size={12} />
                          ) : (
                            <HelpCircle size={12} />
                          )}
                          <span>{customer.isWebsiteExists ? 'Yes' : 'No'}</span>
                        </button>
                      </td>

                      {/* Business */}
                      <td>
                        <div className="autoweb-business-cell">
                          <strong className="autoweb-business-title">
                            {customer.businessName || customer.ownerName || 'Customer'}
                          </strong>
                          {customer.hasDuplicateCustomer && (
                            <span className="autoweb-duplicate-badge">Duplicate</span>
                          )}
                        </div>
                      </td>

                      {/* Contact & Phone */}
                      <td>
                        <div className="autoweb-contact-cell">
                          <span className="autoweb-contact-name">
                            <User size={12} />
                            {customer.ownerName || '—'}
                          </span>
                          {customer.phoneNumber && (
                            <div className="autoweb-phone-row">
                              <span className="autoweb-phone-text">{customer.phoneNumber}</span>
                              <button
                                type="button"
                                className="autoweb-call-btn"
                                title={`Call ${customer.phoneNumber}`}
                                disabled={callingCustomerId === String(customerId)}
                                onClick={() =>
                                  handleCallCustomer(
                                    customer.phoneNumber || '',
                                    customer.ownerName || '',
                                    customerId,
                                  )
                                }
                              >
                                {callingCustomerId === String(customerId) ? (
                                  <RefreshCw size={11} className="spin" />
                                ) : (
                                  <Phone size={11} />
                                )}
                              </button>
                            </div>
                          )}
                          {customer.email && (
                            <span className="autoweb-email-text" title={customer.email}>
                              <Mail size={11} />
                              {customer.email}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Service Flow Badges */}
                      <td>
                        <div className="autoweb-services-cell">
                          {customer.serviceTypes && customer.serviceTypes.length > 0 ? (
                            customer.serviceTypes.map((sType, sIdx) => (
                              <button
                                key={sIdx}
                                type="button"
                                className="autoweb-service-chip"
                                onClick={() =>
                                  setServiceFlowCustomer(toOnboardingCustomer(customer, index))
                                }
                                title="Click to view/update service flow checklist"
                              >
                                {sType.toUpperCase().includes('AUTO') ? (
                                  <Bot size={11} />
                                ) : (
                                  <Globe size={11} />
                                )}
                                <span>{sType}</span>
                              </button>
                            ))
                          ) : (
                            <button
                              type="button"
                              className="autoweb-service-chip"
                              onClick={() =>
                                setServiceFlowCustomer(toOnboardingCustomer(customer, index))
                              }
                            >
                              <Globe size={11} />
                              <span>FLOW</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Status Dropdown */}
                      <td>
                        <select
                          className={`autoweb-status-select status-${currentStatus.toLowerCase()}`}
                          value={currentStatus}
                          disabled={updatingStatusId === customerId}
                          onChange={(e) => handleStatusChange(customer, e.target.value)}
                        >
                          <option value="PENDING">Pending</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                      </td>

                      {/* Assignee Dropdown */}
                      <td>
                        <select
                          className="autoweb-assignee-select"
                          value={currentAssignee || ''}
                          onChange={(e) => handleAssignUser(customerId, e.target.value)}
                        >
                          <option value="">Unassigned</option>
                          {assignees.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Remark */}
                      <td>
                        <div className="autoweb-remark-cell">
                          <span>{customer.internalRemark || customer.clientRemark || '—'}</span>
                        </div>
                      </td>

                      {/* Detail Action */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="autoweb-detail-btn"
                          title="View complete customer details"
                          onClick={() => setSelectedCustomer(toOnboardingCustomer(customer, index))}
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <TablePagination
          page={page}
          pageSize={size}
          totalResults={totalElements}
          onPageChange={(newPage) => setPage(newPage)}
          onPageSizeChange={(newSize) => {
            setSize(newSize)
            setPage(0)
          }}
          pageSizeOptions={[10, 20, 50, 100]}
          disabled={customersQuery.isFetching}
        />
      </div>

      {/* Customer Profile Drawer Modal */}
      <CustomersListModal
        customer={selectedCustomer}
        assignees={assignees}
        showStatus={true}
        showAssignTo={true}
        departmentType="AUTOWEBSION_DEPARTMENT"
        onClose={() => setSelectedCustomer(null)}
      />

      {/* Sub-Service Flow Modal */}
      <ServiceFlowModal
        customer={serviceFlowCustomer}
        isOpen={Boolean(serviceFlowCustomer)}
        onClose={() => setServiceFlowCustomer(null)}
        departmentType="AUTOWEBSION_DEPARTMENT"
        onStepsUpdated={() => {
          customersQuery.refetch()
          countsQuery.refetch()
        }}
        onSubServiceStatusUpdated={() => {
          customersQuery.refetch()
          countsQuery.refetch()
        }}
      />
    </div>
  )
}

export default AutowebisionCustomersPage

