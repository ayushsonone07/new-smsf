import { useState, useEffect } from 'react'
import {
  Building2,
  Mail,
  BellRing,
  Search,
  RefreshCw,
} from 'lucide-react'
import {
  getServiceCompletionMethods,
  updateServiceCompletionMethod,
} from '../../../api/config.api'

interface DepartmentManagementTabProps {
  onNotify: (msg: string, type?: 'success' | 'error') => void
}

const DEPARTMENTS = [
  'WEBSITE_DEPARTMENT',
  'GOOGLE_DEPARTMENT',
  'SOCIAL_MEDIA_META_DEPARTMENT',
  'SEO_DEPARTMENT',
  'GRAPHIC_DESIGN_DEPARTMENT',
  'ADVERTISEMENT_DEPARTMENT',
  'AUTOWEBSION_DEPARTMENT',
  'FINANCE_DEPARTMENT',
  'CUSTOMER_CARE_DEPARTMENT',
]

export function DepartmentManagementTab({ onNotify }: DepartmentManagementTabProps) {
  const [subTab, setSubTab] = useState<'email-visibility' | 'completion-email'>('email-visibility')
  const [searchTerm, setSearchTerm] = useState('')
  const [completionConfigs, setCompletionConfigs] = useState<Record<string, boolean>>({})
  const [emailVisibility, setEmailVisibility] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const loadConfigs = async () => {
    setLoading(true)
    try {
      const data = await getServiceCompletionMethods()
      const compMap: Record<string, boolean> = {}
      const visMap: Record<string, boolean> = {}

      DEPARTMENTS.forEach((dept) => {
        // default true for completion email if present
        compMap[dept] = data[dept] ? String(data[dept]).toLowerCase() === 'true' : true
        visMap[dept] = true
      })

      setCompletionConfigs(compMap)
      setEmailVisibility(visMap)
    } catch {
      onNotify('Failed to load department configurations', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfigs()
  }, [])

  const handleToggleCompletion = async (dept: string) => {
    const current = !!completionConfigs[dept]
    const nextVal = !current
    setSavingKey(dept)
    try {
      await updateServiceCompletionMethod(dept, nextVal)
      setCompletionConfigs((prev) => ({ ...prev, [dept]: nextVal }))
      onNotify(`Service completion email for ${dept.replace(/_/g, ' ')} ${nextVal ? 'enabled' : 'disabled'}`, 'success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update department config'
      onNotify(msg, 'error')
    } finally {
      setSavingKey(null)
    }
  }

  const handleToggleVisibility = (dept: string) => {
    setEmailVisibility((prev) => {
      const nextVal = !prev[dept]
      onNotify(`Email visibility for ${dept.replace(/_/g, ' ')} ${nextVal ? 'visible' : 'hidden'}`, 'success')
      return { ...prev, [dept]: nextVal }
    })
  }

  const filteredDepts = DEPARTMENTS.filter((d) =>
    d.toLowerCase().includes(searchTerm.toLowerCase().replace(/\s+/g, '_')),
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Department Configuration Policies</h3>
            <p className="text-xs text-slate-500">
              Manage per-department email visibility and service completion notifications
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={loadConfigs}
            disabled={loading}
            className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 px-2">
        <button
          type="button"
          onClick={() => setSubTab('email-visibility')}
          className={`pb-3 text-xs font-semibold inline-flex items-center gap-2 transition-colors border-b-2 ${
            subTab === 'email-visibility'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Email Address Visibility</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('completion-email')}
          className={`pb-3 text-xs font-semibold inline-flex items-center gap-2 transition-colors border-b-2 ${
            subTab === 'completion-email'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BellRing className="w-4 h-4" />
          <span>Service Completion Notification</span>
        </button>
      </div>

      {/* Department Cards Grid */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-600 font-medium">Loading department settings...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDepts.map((dept) => {
            const isSaving = savingKey === dept
            const active =
              subTab === 'email-visibility' ? !!emailVisibility[dept] : !!completionConfigs[dept]

            return (
              <div
                key={dept}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between gap-3"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{dept.replace(/_/g, ' ')}</h4>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    {subTab === 'email-visibility'
                      ? active
                        ? 'Email address visible'
                        : 'Email hidden from clients'
                      : active
                        ? 'Sends email on completion'
                        : 'No completion email sent'}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() =>
                    subTab === 'email-visibility'
                      ? handleToggleVisibility(dept)
                      : handleToggleCompletion(dept)
                  }
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    active ? 'bg-blue-600' : 'bg-slate-200'
                  } disabled:opacity-50`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      active ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
