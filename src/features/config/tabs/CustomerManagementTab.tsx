import { useState, useEffect } from 'react'
import {
  Users,
  Database,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import {
  getOnboardingStatus,
  updateOnboardingStatus,
  getServiceDataTemplate,
  saveServiceDataTemplate,
} from '../../../api/config.api'

interface CustomerManagementTabProps {
  onNotify: (msg: string, type?: 'success' | 'error') => void
}

interface ServiceItem {
  id: string
  name: string
}

interface ServiceRow {
  id: string
  departmentType: string
  services: ServiceItem[]
}

const KNOWN_DEPARTMENTS = [
  'COMMON_INFO',
  'ONBOARDING_DEPARTMENT',
  'WEBSITE_DEPARTMENT',
  'GOOGLE_DEPARTMENT',
  'SOCIAL_MEDIA_META_DEPARTMENT',
  'SEO_DEPARTMENT',
  'GRAPHIC_DESIGN_DEPARTMENT',
  'ADVERTISEMENT_DEPARTMENT',
  'AUTOWEBSION_DEPARTMENT',
  'BILLING_DEPARTMENT',
  'CUSTOMER_CARE_DEPARTMENT',
]

export function CustomerManagementTab({ onNotify }: CustomerManagementTabProps) {
  // Onboarding Toggle
  const [onboardingEnabled, setOnboardingEnabled] = useState(false)
  const [togglingStatus, setTogglingStatus] = useState(false)

  // Service Rows
  const [serviceRows, setServiceRows] = useState<ServiceRow[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [savingServices, setSavingServices] = useState(false)

  const loadData = async () => {
    setLoadingData(true)
    try {
      const [status, templateData] = await Promise.all([
        getOnboardingStatus(),
        getServiceDataTemplate(),
      ])
      setOnboardingEnabled(status)

      // Parse template data into rows
      const rows: ServiceRow[] = []
      let rowIdx = 1
      let srvIdx = 1

      if (templateData && typeof templateData === 'object' && Object.keys(templateData).length > 0) {
        Object.entries(templateData).forEach(([dept, rawServices]) => {
          try {
            const parsed = typeof rawServices === 'string' ? JSON.parse(rawServices) : rawServices
            if (Array.isArray(parsed)) {
              const items: ServiceItem[] = parsed.map((item: unknown) => {
                const name = typeof item === 'object' && item !== null ? Object.keys(item)[0] : String(item)
                return {
                  id: `srv-${srvIdx++}`,
                  name: name || '',
                }
              })
              rows.push({
                id: `row-${rowIdx++}`,
                departmentType: dept,
                services: items,
              })
            }
          } catch {
            // json parse error, ignore row
          }
        })
      }

      if (rows.length === 0) {
        setServiceRows([
          {
            id: 'row-1',
            departmentType: 'COMMON_INFO',
            services: [{ id: 'srv-1', name: '' }],
          },
        ])
      } else {
        setServiceRows(rows)
      }
    } catch {
      onNotify('Failed to load customer configuration data', 'error')
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleToggleOnboarding = async () => {
    const nextVal = !onboardingEnabled
    setTogglingStatus(true)
    try {
      await updateOnboardingStatus(nextVal)
      setOnboardingEnabled(nextVal)
      onNotify(`Customer auto-assignment is now ${nextVal ? 'Enabled' : 'Disabled'}`, 'success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update auto-assignment status'
      onNotify(msg, 'error')
    } finally {
      setTogglingStatus(false)
    }
  }

  const handleAddRow = () => {
    setServiceRows([
      ...serviceRows,
      {
        id: `row-${Date.now()}`,
        departmentType: '',
        services: [{ id: `srv-${Date.now()}`, name: '' }],
      },
    ])
  }

  const handleRemoveRow = (id: string) => {
    if (serviceRows.length <= 1) return
    setServiceRows(serviceRows.filter((r) => r.id !== id))
  }

  const handleAddService = (rowId: string) => {
    setServiceRows(
      serviceRows.map((r) =>
        r.id === rowId
          ? {
              ...r,
              services: [...r.services, { id: `srv-${Date.now()}`, name: '' }],
            }
          : r,
      ),
    )
  }

  const handleRemoveService = (rowId: string, srvId: string) => {
    setServiceRows(
      serviceRows.map((r) =>
        r.id === rowId
          ? {
              ...r,
              services: r.services.filter((s) => s.id !== srvId),
            }
          : r,
      ),
    )
  }

  const handleServiceNameChange = (rowId: string, srvId: string, val: string) => {
    setServiceRows(
      serviceRows.map((r) =>
        r.id === rowId
          ? {
              ...r,
              services: r.services.map((s) => (s.id === srvId ? { ...s, name: val } : s)),
            }
          : r,
      ),
    )
  }

  const handleDepartmentChange = (rowId: string, dept: string) => {
    setServiceRows(
      serviceRows.map((r) => (r.id === rowId ? { ...r, departmentType: dept } : r)),
    )
  }

  const handleSaveServices = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingServices(true)

    const payload: Record<string, string> = {}
    serviceRows.forEach((row) => {
      if (row.departmentType) {
        const validServices = row.services
          .filter((s) => s.name.trim().length > 0)
          .map((s) => ({ [s.name.trim()]: 'null' }))
        if (validServices.length > 0) {
          payload[row.departmentType] = JSON.stringify(validServices)
        }
      }
    })

    try {
      await saveServiceDataTemplate(payload)
      onNotify('Customer services template saved successfully', 'success')
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save services template'
      onNotify(msg, 'error')
    } finally {
      setSavingServices(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Auto-Assignment Toggle Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Customer Auto-Assignment Mode</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Automatically distribute newly registered customer accounts round-robin across active department heads
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleOnboarding}
          disabled={togglingStatus}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs shadow-sm transition-all ${
            onboardingEnabled
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
          }`}
        >
          {togglingStatus ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : onboardingEnabled ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span>{onboardingEnabled ? 'Assignment Active' : 'Assignment Paused'}</span>
        </button>
      </div>

      {/* Services Info Master Template */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Customer Services Info Template</h3>
              <p className="text-xs text-slate-500">
                Define required data inputs and deliverable milestones collected per department service
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Department Row
          </button>
        </div>

        {loadingData ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-600 font-medium">Loading service data templates...</p>
          </div>
        ) : (
          <form onSubmit={handleSaveServices} className="mt-5 space-y-4">
            <div className="space-y-4">
              {serviceRows.map((row) => (
                <div key={row.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="w-full sm:w-1/2">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Department Type
                      </label>
                      <select
                        value={row.departmentType}
                        onChange={(e) => handleDepartmentChange(row.id, e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="">Select department...</option>
                        {KNOWN_DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>
                            {d.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 sm:pt-4">
                      <button
                        type="button"
                        onClick={() => handleAddService(row.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Service Tag
                      </button>
                      {serviceRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="Delete Row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Services tags */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                      Sub-services / Deliverable Keys
                    </label>
                    <div className="space-y-2">
                      {row.services.map((srv) => (
                        <div key={srv.id} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="e.g. Domain Verification, Theme Customization, SEO Audit"
                            value={srv.name}
                            onChange={(e) => handleServiceNameChange(row.id, srv.id, e.target.value)}
                            className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                          {row.services.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveService(row.id, srv.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={savingServices}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {savingServices ? 'Saving Template...' : 'Save Services Template'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
