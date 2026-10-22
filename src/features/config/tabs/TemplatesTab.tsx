import { useState, useEffect, useMemo } from 'react'
import {
  FileText,
  Plus,
  Trash2,
  Edit,
  Eye,
  Search,
  X,
  RefreshCw,
  Mail,
  MessageSquare,
  Bell,
} from 'lucide-react'
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  type TemplateDTO,
} from '../../../api/config.api'

interface TemplatesTabProps {
  onNotify: (msg: string, type?: 'success' | 'error') => void
}

const VARIABLE_TAGS = [
  '{{customerName}}',
  '{{companyName}}',
  '{{serviceName}}',
  '{{departmentName}}',
  '{{amount}}',
  '{{link}}',
  '{{phone}}',
  '{{date}}',
]

const SAMPLE_PREVIEW_VARS: Record<string, string> = {
  '{{customerName}}': 'Rahul Sharma',
  '{{companyName}}': 'Acme Enterprises',
  '{{serviceName}}': 'Google Business Profile Optimization',
  '{{departmentName}}': 'Google Department',
  '{{amount}}': '₹14,999',
  '{{link}}': 'https://app.techmbgcard.com/portal',
  '{{phone}}': '+91 98765 43210',
  '{{date}}': new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
}

const EMPTY_TEMPLATE: TemplateDTO = {
  templateName: '',
  templateType: 'EMAIL',
  emailSubject: '',
  emailBody: '',
}

export function TemplatesTab({ onNotify }: TemplatesTabProps) {
  const [templates, setTemplates] = useState<TemplateDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('ALL')

  // Form modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TemplateDTO | null>(null)
  const [formData, setFormData] = useState<TemplateDTO>(EMPTY_TEMPLATE)
  const [saving, setSaving] = useState(false)

  // Preview modal
  const [previewTemplate, setPreviewTemplate] = useState<TemplateDTO | null>(null)

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const data = await getTemplates()
      setTemplates(data)
    } catch {
      onNotify('Failed to load templates', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchesSearch =
        tpl.templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tpl.emailSubject.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = filterType === 'ALL' || tpl.templateType === filterType
      return matchesSearch && matchesType
    })
  }, [templates, searchTerm, filterType])

  const handleOpenAdd = () => {
    setEditingTemplate(null)
    setFormData(EMPTY_TEMPLATE)
    setModalOpen(true)
  }

  const handleOpenEdit = (tpl: TemplateDTO) => {
    setEditingTemplate(tpl)
    setFormData(tpl)
    setModalOpen(true)
  }

  const handleInsertTag = (tag: string) => {
    setFormData((prev: TemplateDTO) => ({
      ...prev,
      emailBody: prev.emailBody + ' ' + tag + ' ',
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.templateName.trim() || !formData.emailSubject.trim()) {
      onNotify('Template Name and Subject are required', 'error')
      return
    }

    setSaving(true)
    try {
      if (editingTemplate) {
        await updateTemplate('edit', formData)
        onNotify('Template updated successfully', 'success')
      } else {
        await createTemplate(formData)
        onNotify('Template created successfully', 'success')
      }
      setModalOpen(false)
      loadTemplates()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save template'
      onNotify(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (tpl: TemplateDTO) => {
    if (!window.confirm(`Are you sure you want to delete template "${tpl.templateName}"?`)) return
    try {
      await updateTemplate('delete', tpl)
      onNotify('Template deleted', 'success')
      loadTemplates()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete template'
      onNotify(msg, 'error')
    }
  }

  const renderPreviewContent = (body: string) => {
    let text = body
    Object.entries(SAMPLE_PREVIEW_VARS).forEach(([tag, val]) => {
      text = text.replaceAll(tag, `<strong class="text-blue-600 bg-blue-50 px-1 rounded">${val}</strong>`)
    })
    return text
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Message & Notification Templates</h3>
            <p className="text-xs text-slate-500">Design customer email, WhatsApp, and notification blueprints</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Filter Type */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
          >
            <option value="ALL">All Types</option>
            <option value="EMAIL">Email</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="NOTIFICATION">In-App Notification</option>
          </select>

          <button
            type="button"
            onClick={loadTemplates}
            disabled={loading}
            className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-600 font-medium">Loading templates...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-700">No Templates Found</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm ? 'No templates matched your search filter.' : 'Create notification templates to automate customer emails and messages.'}
          </p>
          {!searchTerm && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create Template
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((tpl, idx) => (
            <div
              key={tpl.templateId || idx}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {tpl.templateType === 'WHATSAPP' ? (
                      <MessageSquare className="w-3 h-3" />
                    ) : tpl.templateType === 'NOTIFICATION' ? (
                      <Bell className="w-3 h-3" />
                    ) : (
                      <Mail className="w-3 h-3" />
                    )}
                    {tpl.templateType}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPreviewTemplate(tpl)}
                      title="Preview Template"
                      className="p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(tpl)}
                      title="Edit Template"
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tpl)}
                      title="Delete Template"
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{tpl.templateName}</h4>
                <p className="text-xs text-slate-500 font-medium line-clamp-1 mt-0.5">{tpl.emailSubject}</p>
                <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 line-clamp-3 whitespace-pre-wrap font-sans">
                  {tpl.emailBody || '— No body content —'}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>{tpl.createdAt ? new Date(tpl.createdAt).toLocaleDateString() : 'Active template'}</span>
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(tpl)}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  Preview →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {editingTemplate ? 'Edit Template' : 'Create Template'}
                  </h3>
                  <p className="text-xs text-slate-500">Configure parameters and layout for messages</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Template Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Welcome Customer Onboarding"
                    value={formData.templateName}
                    onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
                  <select
                    value={formData.templateType}
                    onChange={(e) => setFormData({ ...formData, templateType: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  >
                    <option value="EMAIL">Email</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="NOTIFICATION">Notification</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject Line <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Welcome to MBG Card - Your service is scheduled"
                  value={formData.emailSubject}
                  onChange={(e) => setFormData({ ...formData, emailSubject: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Body Content (Insert dynamic placeholders below)
                  </label>
                  <span className="text-[11px] text-slate-400">Click tag to insert</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2 p-2 bg-slate-50 border border-slate-100 rounded-lg">
                  {VARIABLE_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleInsertTag(tag)}
                      className="px-2 py-0.5 text-[11px] font-mono bg-white border border-slate-200 rounded text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={8}
                  placeholder={`Hi {{customerName}},\n\nYour {{serviceName}} request for {{companyName}} has been received.\n\nBest regards,\nMBG Support`}
                  value={formData.emailBody}
                  onChange={(e) => setFormData({ ...formData, emailBody: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-800">Template Preview: {previewTemplate.templateName}</h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="border border-slate-100 bg-slate-50 p-3 rounded-xl text-xs space-y-1">
                <div>
                  <strong className="text-slate-500 font-medium">Subject: </strong>
                  <span className="font-semibold text-slate-800">{previewTemplate.emailSubject}</span>
                </div>
                <div>
                  <strong className="text-slate-500 font-medium">Type: </strong>
                  <span className="font-semibold text-indigo-600">{previewTemplate.templateType}</span>
                </div>
              </div>

              <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-inner min-h-[160px]">
                <div
                  className="text-xs leading-relaxed text-slate-700 whitespace-pre-wrap font-sans"
                  dangerouslySetInnerHTML={{ __html: renderPreviewContent(previewTemplate.emailBody) }}
                />
              </div>

              <p className="text-[11px] text-slate-400 italic">
                * Highlighted variables are sample substituted values to demonstrate runtime rendering.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
