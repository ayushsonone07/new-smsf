import { useState } from 'react'
import {
  Settings,
  Mail,
  Server,
  FileText,
  MessageSquare,
  Camera,
  Users,
  Building2,
  GraduationCap,
  Webhook as WebhookIcon,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react'
import { SmtpSettingsTab } from './tabs/SmtpSettingsTab'
import { HrmSmtpTab } from './tabs/HrmSmtpTab'
import { TemplatesTab } from './tabs/TemplatesTab'
import { WhatsAppTab } from './tabs/WhatsAppTab'
import { FaceRecognitionTab } from './tabs/FaceRecognitionTab'
import { CustomerManagementTab } from './tabs/CustomerManagementTab'
import { DepartmentManagementTab } from './tabs/DepartmentManagementTab'
import { TutorialsTab } from './tabs/TutorialsTab'
import { WebhooksTab } from './tabs/WebhooksTab'
import { SecurityTab } from './tabs/SecurityTab'

type ConfigTabKey =
  | 'smtp'
  | 'hrm-smtp'
  | 'templates'
  | 'whatsapp'
  | 'face-recognition'
  | 'customer-management'
  | 'department-management'
  | 'tutorials'
  | 'webhooks'
  | 'security'

interface TabOption {
  key: ConfigTabKey
  label: string
  icon: typeof Settings
}

const TAB_OPTIONS: TabOption[] = [
  { key: 'smtp', label: 'SMTP Settings', icon: Mail },
  { key: 'hrm-smtp', label: 'HRM SMTP', icon: Server },
  { key: 'templates', label: 'Templates', icon: FileText },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { key: 'face-recognition', label: 'Face Recognition', icon: Camera },
  { key: 'customer-management', label: 'Customer Management', icon: Users },
  { key: 'department-management', label: 'Department Management', icon: Building2 },
  { key: 'tutorials', label: 'Tutorials', icon: GraduationCap },
  { key: 'webhooks', label: 'Webhooks', icon: WebhookIcon },
  { key: 'security', label: 'Security Settings', icon: ShieldAlert },
]

export function ConfigPage() {
  const [activeTab, setActiveTab] = useState<ConfigTabKey>('smtp')
  const [notification, setNotification] = useState<{
    msg: string
    type: 'success' | 'error'
  } | null>(null)

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => {
      setNotification((curr) => (curr?.msg === msg ? null : curr))
    }, 4000)
  }

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 md:p-6 lg:p-8 space-y-6">
      {/* Toast banner */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold border transition-all animate-in fade-in slide-in-from-top-3 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{notification.msg}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="ml-2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Configuration Center</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage system mailers, notification blueprints, webhooks, and customer assignment rules
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
            Superadmin Access
          </span>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        {TAB_OPTIONS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Active Tab View */}
      <div className="transition-all duration-200">
        {activeTab === 'smtp' && <SmtpSettingsTab onNotify={showNotification} />}
        {activeTab === 'hrm-smtp' && <HrmSmtpTab onNotify={showNotification} />}
        {activeTab === 'templates' && <TemplatesTab onNotify={showNotification} />}
        {activeTab === 'whatsapp' && <WhatsAppTab onNotify={showNotification} />}
        {activeTab === 'face-recognition' && <FaceRecognitionTab onNotify={showNotification} />}
        {activeTab === 'customer-management' && <CustomerManagementTab onNotify={showNotification} />}
        {activeTab === 'department-management' && <DepartmentManagementTab onNotify={showNotification} />}
        {activeTab === 'tutorials' && <TutorialsTab onNotify={showNotification} />}
        {activeTab === 'webhooks' && <WebhooksTab onNotify={showNotification} />}
        {activeTab === 'security' && <SecurityTab onNotify={showNotification} />}
      </div>
    </div>
  )
}

