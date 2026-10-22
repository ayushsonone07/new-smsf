import React, { useEffect, useState } from 'react'
import {
  fetchCustomerServicesList,
  fetchCustomerMeetingDetails,
  fetchCustomerServiceData,
  saveCustomerServiceData,
  uploadCustomerServiceFile,
  updateCustomerServiceStatus,
  type ServiceDetailsDTO,
  type CustomerMeetingDetailsDTO,
  type CustomerServiceData,
} from './api/customer-features.api'
import { useCustomerSession } from '../../features/customers/hooks/useCustomerSession'
import {
  Calendar,
  Clock,
  ExternalLink,
  Search,
  Copy,
  Check,
  Edit3,
  Save,
  X,
  Upload,
  Loader2,
  RefreshCw,
  FileText,
  Briefcase,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'

// Helper styles per service type
function getServiceIconStyle(serviceType: string) {
  const s = serviceType?.toLowerCase() || ''
  if (s.includes('automation') || s.includes('autowebsion')) return { bg: '#fef3c7', text: '#d97706' }
  if (s.includes('website') || s.includes('web')) return { bg: '#dbeafe', text: '#2563eb' }
  if (s.includes('blog') || s.includes('seo')) return { bg: '#ede9fe', text: '#7c3aed' }
  if (s.includes('google')) return { bg: '#fee2e2', text: '#dc2626' }
  if (s.includes('smo') || s.includes('social')) return { bg: '#fce7f3', text: '#db2777' }
  if (s.includes('onboarding')) return { bg: '#ccfbf1', text: '#0d9488' }
  if (s.includes('billing')) return { bg: '#cffafe', text: '#0891b2' }
  if (s.includes('support')) return { bg: '#ffedd5', text: '#ea580c' }
  return { bg: '#f1f5f9', text: '#475569' }
}

function getStatusBadge(status?: string) {
  const s = (status || '').toUpperCase()
  if (s === 'COMPLETED' || s === 'ACTIVE') {
    return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0', label: status || 'Completed' }
  }
  if (s.includes('PROGRESS')) {
    return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', label: 'In Progress' }
  }
  if (s.includes('PENDING')) {
    return { bg: '#fffbeb', text: '#d97706', border: '#fde68a', label: status || 'Pending' }
  }
  if (s.includes('CANCEL')) {
    return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', label: status || 'Cancelled' }
  }
  return { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0', label: status || 'Active' }
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export function CustomerServicesView() {
  const { session } = useCustomerSession()
  const [services, setServices] = useState<ServiceDetailsDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'in_progress' | 'completed' | 'pending'>('all')

  // Meeting Dialog
  const [meetingModalOpen, setMeetingModalOpen] = useState(false)
  const [selectedMeetingService, setSelectedMeetingService] = useState<ServiceDetailsDTO | null>(null)
  const [meetingDetails, setMeetingDetails] = useState<CustomerMeetingDetailsDTO | null>(null)
  const [meetingLoading, setMeetingLoading] = useState(false)
  const [meetingSearch, setMeetingSearch] = useState('')
  const [meetingSort, setMeetingSort] = useState<'newest' | 'oldest'>('newest')

  // Service Data Dialog
  const [dataModalOpen, setDataModalOpen] = useState(false)
  const [selectedDataService, setSelectedDataService] = useState<ServiceDetailsDTO | null>(null)
  const [serviceData, setServiceData] = useState<CustomerServiceData | null>(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState<any>(null)
  const [savingData, setSavingData] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [uploadingField, setUploadingField] = useState<string | null>(null)

  // Status updating
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadServices = async () => {
    setLoading(true)
    try {
      const data = await fetchCustomerServicesList(session?.customerId, session?.email)
      setServices(data)
    } catch {
      setServices([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadServices()
  }, [session?.customerId, session?.email])

  // Filter services by active tab
  const filteredServices = services.filter((srv) => {
    const s = (srv.status || '').toUpperCase()
    if (activeTab === 'in_progress') return s.includes('PROGRESS')
    if (activeTab === 'completed') return s === 'COMPLETED' || s === 'ACTIVE'
    if (activeTab === 'pending') return s.includes('PENDING')
    return true
  })

  // Open Meeting Details
  const handleOpenMeetings = async (service: ServiceDetailsDTO) => {
    setSelectedMeetingService(service)
    setMeetingModalOpen(true)
    setMeetingLoading(true)
    setMeetingSearch('')
    try {
      const data = await fetchCustomerMeetingDetails({
        customerId: session?.customerId || 0,
        serviceType: service.serviceType,
        departmentType: service.department,
        username: session?.email || '',
      })
      setMeetingDetails(data)
    } catch {
      setMeetingDetails(null)
    } finally {
      setMeetingLoading(false)
    }
  }

  // Open Service Data
  const handleOpenServiceData = async (service: ServiceDetailsDTO) => {
    setSelectedDataService(service)
    setDataModalOpen(true)
    setDataLoading(true)
    setIsEditing(false)
    try {
      const data = await fetchCustomerServiceData(session?.customerId || 0)
      setServiceData(data)
      setEditedData(JSON.parse(JSON.stringify(data)))
    } catch {
      setServiceData(null)
      setEditedData(null)
    } finally {
      setDataLoading(false)
    }
  }

  // Save Service Data
  const handleSaveServiceData = async () => {
    if (!editedData || !session?.customerId) return
    setSavingData(true)
    try {
      await saveCustomerServiceData(session.customerId, editedData, serviceData)
      setServiceData(editedData)
      setIsEditing(false)
      showToast('Service data updated successfully!')
    } catch (err: any) {
      showToast(err.message || 'Failed to update service data', 'error')
    } finally {
      setSavingData(false)
    }
  }

  // Handle File Upload for Service Data
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, dataName: string) => {
    const file = e.target.files?.[0]
    if (!file || !session?.customerId) return
    setUploadingField(dataName)
    try {
      const res = await uploadCustomerServiceFile(session.customerId, file, dataName)
      if (res.fileUrl && editedData) {
        setEditedData((prev: any) => ({
          ...prev,
          commonInfo: {
            ...prev.commonInfo,
            [dataName]: { value: res.fileUrl, updatedAt: new Date().toISOString() },
          },
        }))
        showToast('File uploaded successfully!')
      }
    } catch {
      showToast('File upload failed. Please try again.', 'error')
    } finally {
      setUploadingField(null)
    }
  }

  // Update Status to Pending
  const handleRequestStatusChange = async (service: ServiceDetailsDTO) => {
    if (!session?.customerId) return
    setUpdatingId(service.serviceType)
    try {
      await updateCustomerServiceStatus(session.customerId, 'PENDING', service.department)
      showToast('Service status update requested!')
      await loadServices()
    } catch {
      showToast('Failed to request status update', 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // Filtered meetings entries
  const meetingLinks = meetingDetails?.meetingLinks || {}
  const filteredMeetings = Object.entries(meetingLinks)
    .filter(([date, link]) => {
      const q = meetingSearch.toLowerCase()
      return date.toLowerCase().includes(q) || String(link).toLowerCase().includes(q)
    })
    .sort(([dateA], [dateB]) => {
      const tA = new Date(dateA).getTime()
      const tB = new Date(dateB).getTime()
      return meetingSort === 'newest' ? tB - tA : tA - tB
    })

  return (
    <div style={{ padding: '24px 32px', minHeight: 'calc(100vh - 64px)', background: '#f8fafc' }}>
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: '8px',
            background: toastMessage.type === 'success' ? '#10b981' : '#ef4444',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontWeight: 500,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {toastMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toastMessage.text}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Briefcase size={18} />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0 }}>My Services</h1>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Manage, track and view data for all your active business services
          </p>
        </div>

        <button
          onClick={loadServices}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            fontSize: '13px',
            fontWeight: 600,
            color: '#334155',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        {(['all', 'in_progress', 'completed', 'pending'] as const).map((tab) => {
          const isActive = activeTab === tab
          const label = tab === 'all' ? 'All Services' : tab === 'in_progress' ? 'In Progress' : tab === 'completed' ? 'Completed' : 'Pending'
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: isActive ? '#0f172a' : 'transparent',
                color: isActive ? '#ffffff' : '#64748b',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Services Grid */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block', color: '#4f46e5' }} />
          <span>Loading your services...</span>
        </div>
      ) : filteredServices.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '48px',
            textAlign: 'center',
            border: '1px solid #e2e8f0',
          }}
        >
          <Briefcase size={36} style={{ color: '#94a3b8', margin: '0 auto 12px', display: 'block' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>No services found</h3>
          <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '360px', margin: '0 auto' }}>
            There are no services in this view. As new plans are activated, your services will appear here automatically.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '18px',
          }}
        >
          {filteredServices.map((service, idx) => {
            const iconStyle = getServiceIconStyle(service.serviceType || service.department)
            const badge = getStatusBadge(service.status)
            const canUpdateStatus = service.status === 'COMPLETED' && service.meetingCount < 5 && service.isServiceActive

            return (
              <div
                key={`${service.serviceType}-${idx}`}
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                }}
              >
                <div>
                  {/* Top row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          background: iconStyle.bg,
                          color: iconStyle.text,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '18px',
                        }}
                      >
                        {service.serviceType ? service.serviceType.charAt(0).toUpperCase() : 'S'}
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 2px 0', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                          {service.serviceType || service.department || 'Service Plan'}
                        </h4>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#f1f5f9',
                            color: '#475569',
                            textTransform: 'uppercase',
                          }}
                        >
                          {service.department || 'GENERAL'}
                        </span>
                      </div>
                    </div>

                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: badge.bg,
                        color: badge.text,
                        border: `1px solid ${badge.border}`,
                      }}
                    >
                      {badge.label}
                    </span>
                  </div>

                  {/* Metadata Row */}
                  <div
                    style={{
                      background: '#f8fafc',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      marginBottom: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
                      <Clock size={14} color="#94a3b8" />
                      <span>Meetings: <strong style={{ color: '#0f172a' }}>{service.meetingCount ?? 0}</strong></span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
                      <Calendar size={14} color="#94a3b8" />
                      <span>Exp: <strong style={{ color: '#0f172a' }}>{formatDate(service.expirationDate)}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleOpenMeetings(service)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      <Calendar size={13} />
                      Meetings
                    </button>

                    <button
                      onClick={() => handleOpenServiceData(service)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      <FileText size={13} />
                      Service Data
                    </button>
                  </div>

                  {canUpdateStatus && (
                    <button
                      onClick={() => handleRequestStatusChange(service)}
                      disabled={updatingId === service.serviceType}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#eff6ff',
                        color: '#2563eb',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                    >
                      {updatingId === service.serviceType ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <RefreshCw size={12} />
                      )}
                      Request Status Recheck (Set Pending)
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* MEETING DETAILS MODAL */}
      {/* ────────────────────────────────────────────────────────────── */}
      {meetingModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                  Meeting Details
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {selectedMeetingService?.serviceType} · Total {meetingDetails?.totalMeetings ?? 0} Meetings
                </span>
              </div>
              <button
                onClick={() => setMeetingModalOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Filter */}
            <div style={{ padding: '12px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search meeting date or link..."
                  value={meetingSearch}
                  onChange={(e) => setMeetingSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                onClick={() => setMeetingSort((s) => (s === 'newest' ? 'oldest' : 'newest'))}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: '#475569',
                }}
              >
                Sort: {meetingSort === 'newest' ? 'Newest' : 'Oldest'}
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1 }}>
              {meetingLoading ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block', color: '#4f46e5' }} />
                  <span>Loading meetings...</span>
                </div>
              ) : filteredMeetings.length === 0 ? (
                <div style={{ padding: '36px 0', textAlign: 'center', color: '#94a3b8' }}>
                  <Calendar size={32} style={{ margin: '0 auto 8px', display: 'block' }} />
                  <p style={{ margin: 0, fontSize: '13px' }}>No meeting recordings or links found for this service.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredMeetings.map(([date, link], idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            background: '#eff6ff',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Calendar size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{formatDate(date)}</div>
                          <span style={{ fontSize: '11px', color: '#64748b', wordBreak: 'break-all' }}>
                            {String(link).substring(0, 45)}...
                          </span>
                        </div>
                      </div>

                      {link && (
                        <a
                          href={String(link)}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            background: '#0f172a',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          Join <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* SERVICE DATA MODAL (VIEW & EDIT) */}
      {/* ────────────────────────────────────────────────────────────── */}
      {dataModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                  Service Data Information
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {selectedDataService?.serviceType} ({selectedDataService?.department})
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#0f172a',
                      cursor: 'pointer',
                    }}
                  >
                    <Edit3 size={13} /> Edit Data
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSaveServiceData}
                      disabled={savingData}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#10b981',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {savingData ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false)
                        setEditedData(JSON.parse(JSON.stringify(serviceData)))
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#64748b',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </>
                )}

                <button
                  onClick={() => setDataModalOpen(false)}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              {dataLoading ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block', color: '#4f46e5' }} />
                  <span>Loading service data...</span>
                </div>
              ) : !serviceData && !editedData ? (
                <div style={{ padding: '36px 0', textAlign: 'center', color: '#94a3b8' }}>
                  <FileText size={32} style={{ margin: '0 auto 8px', display: 'block' }} />
                  <p style={{ margin: 0, fontSize: '13px' }}>No recorded service data for this account yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Common Info Section */}
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Common Information
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                      {Object.entries((isEditing ? editedData?.commonInfo : serviceData?.commonInfo) || {}).map(([key, item]: [string, any]) => {
                        const val = typeof item === 'object' ? item.value : String(item || '')
                        return (
                          <div
                            key={key}
                            style={{
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0',
                              background: '#f8fafc',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'capitalize' }}>
                                {key.replace(/([A-Z])/g, ' $1')}
                              </label>
                              {!isEditing && val && (
                                <button
                                  onClick={() => handleCopy(val, key)}
                                  title="Copy field value"
                                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: copiedKey === key ? '#10b981' : '#94a3b8' }}
                                >
                                  {copiedKey === key ? <Check size={12} /> : <Copy size={12} />}
                                </button>
                              )}
                            </div>

                            {isEditing ? (
                              <input
                                type="text"
                                value={val}
                                onChange={(e) =>
                                  setEditedData((prev: any) => ({
                                    ...prev,
                                    commonInfo: {
                                      ...prev.commonInfo,
                                      [key]: { value: e.target.value, updatedAt: new Date().toISOString() },
                                    },
                                  }))
                                }
                                style={{
                                  width: '100%',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '12px',
                                  boxSizing: 'border-box',
                                }}
                              />
                            ) : (
                              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', wordBreak: 'break-all' }}>
                                {val || '—'}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Department Specific Info */}
                  {Object.entries((isEditing ? editedData?.departmentSpecificInfo : serviceData?.departmentSpecificInfo) || {}).map(
                    ([dept, deptFields]: [string, any]) => (
                      <div key={dept}>
                        <h4
                          style={{
                            margin: '0 0 10px 0',
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#475569',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          {dept} Details
                        </h4>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                          {Object.entries(deptFields || {}).map(([key, item]: [string, any]) => {
                            const val = typeof item === 'object' ? item.value : String(item || '')
                            return (
                              <div
                                key={key}
                                style={{
                                  padding: '10px 12px',
                                  borderRadius: '8px',
                                  border: '1px solid #e2e8f0',
                                  background: '#f8fafc',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'capitalize' }}>
                                    {key.replace(/([A-Z])/g, ' $1')}
                                  </label>
                                  {!isEditing && val && (
                                    <button
                                      onClick={() => handleCopy(val, `${dept}-${key}`)}
                                      title="Copy field value"
                                      style={{
                                        border: 'none',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        color: copiedKey === `${dept}-${key}` ? '#10b981' : '#94a3b8',
                                      }}
                                    >
                                      {copiedKey === `${dept}-${key}` ? <Check size={12} /> : <Copy size={12} />}
                                    </button>
                                  )}
                                </div>

                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={val}
                                    onChange={(e) =>
                                      setEditedData((prev: any) => ({
                                        ...prev,
                                        departmentSpecificInfo: {
                                          ...prev.departmentSpecificInfo,
                                          [dept]: {
                                            ...prev.departmentSpecificInfo?.[dept],
                                            [key]: { value: e.target.value, updatedAt: new Date().toISOString() },
                                          },
                                        },
                                      }))
                                    }
                                    style={{
                                      width: '100%',
                                      padding: '6px 10px',
                                      borderRadius: '6px',
                                      border: '1px solid #cbd5e1',
                                      fontSize: '12px',
                                      boxSizing: 'border-box',
                                    }}
                                  />
                                ) : (
                                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', wordBreak: 'break-all' }}>
                                    {val || '—'}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  )}

                  {/* File Upload Section when editing */}
                  {isEditing && (
                    <div style={{ marginTop: '12px', padding: '14px', borderRadius: '8px', border: '1px dashed #cbd5e1', background: '#f8fafc' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Upload Additional File</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Attach any business asset or requirements doc</div>
                        </div>

                        <label
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            background: '#0f172a',
                            color: '#ffffff',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {uploadingField === 'customerDataFile' ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                          Choose File
                          <input
                            type="file"
                            style={{ display: 'none' }}
                            onChange={(e) => handleFileUpload(e, 'customerDataFile')}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

