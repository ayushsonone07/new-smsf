import { useState, useEffect, useMemo } from 'react'
import {
  GraduationCap,
  Plus,
  Trash2,
  Play,
  Search,
  Video,
  X,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react'
import {
  getTutorials,
  createTutorial,
  deleteTutorial,
  type TutorialDTO,
} from '../../../api/config.api'

interface TutorialsTabProps {
  onNotify: (msg: string, type?: 'success' | 'error') => void
}

const DEPARTMENTS = [
  'ALL',
  'WEBSITE_DEPARTMENT',
  'GOOGLE_DEPARTMENT',
  'SOCIAL_MEDIA_META_DEPARTMENT',
  'SEO_DEPARTMENT',
  'GRAPHIC_DESIGN_DEPARTMENT',
  'ADVERTISEMENT_DEPARTMENT',
  'AUTOWEBSION_DEPARTMENT',
  'ONBOARDING_DEPARTMENT',
]

const EMPTY_TUTORIAL: TutorialDTO = {
  title: '',
  description: '',
  departmentType: 'WEBSITE_DEPARTMENT',
  category: 'General Guides',
  duration: '5:00',
  type: 'video',
  videoUrl: '',
  thumbnailUrl: '',
  tags: 'crm, guide',
  published: true,
}

export function TutorialsTab({ onNotify }: TutorialsTabProps) {
  const [tutorials, setTutorials] = useState<TutorialDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDept, setSelectedDept] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  // Form modal
  const [modalOpen, setModalOpen] = useState(false)
  const [formData, setFormData] = useState<TutorialDTO>(EMPTY_TUTORIAL)
  const [saving, setSaving] = useState(false)

  // Video preview modal
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const loadTutorials = async () => {
    setLoading(true)
    try {
      const data = await getTutorials()
      setTutorials(data)
    } catch {
      onNotify('Failed to load tutorials', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTutorials()
  }, [])

  const filteredTutorials = useMemo(() => {
    return tutorials.filter((t) => {
      const matchesDept = selectedDept === 'ALL' || t.departmentType === selectedDept
      const matchesSearch =
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.tags && t.tags.toLowerCase().includes(searchTerm.toLowerCase()))
      return matchesDept && matchesSearch
    })
  }, [tutorials, selectedDept, searchTerm])

  const handleOpenAdd = () => {
    setFormData(EMPTY_TUTORIAL)
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.videoUrl?.trim()) {
      onNotify('Title and Video URL are required', 'error')
      return
    }

    setSaving(true)
    try {
      await createTutorial(formData)
      onNotify('Tutorial published successfully', 'success')
      setModalOpen(false)
      loadTutorials()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save tutorial'
      onNotify(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id?: string | number) => {
    if (!id) return
    if (!window.confirm('Delete this tutorial?')) return
    try {
      await deleteTutorial(id)
      onNotify('Tutorial removed', 'success')
      loadTutorials()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete tutorial'
      onNotify(msg, 'error')
    }
  }

  const formatEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/watch?v=')) {
      return url.replace('watch?v=', 'embed/')
    }
    if (url.includes('youtu.be/')) {
      return url.replace('youtu.be/', 'youtube.com/embed/')
    }
    return url
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Tutorials & Documentation Academy</h3>
            <p className="text-xs text-slate-500">
              Manage training walkthroughs and onboarding videos accessible by department members & customers
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tutorials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d === 'ALL' ? 'All Departments' : d.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={loadTutorials}
            disabled={loading}
            className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Tutorial
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-600 font-medium">Loading tutorial guides...</p>
        </div>
      ) : filteredTutorials.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-700">No Tutorials Available</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm ? 'No video guides matched your filter.' : 'Add your first training video or product guide for team members.'}
          </p>
          {!searchTerm && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add First Tutorial
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTutorials.map((tut, idx) => (
            <div
              key={tut.id || idx}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div
                  className="relative aspect-video bg-slate-900 flex items-center justify-center cursor-pointer group"
                  onClick={() => tut.videoUrl && setPreviewUrl(tut.videoUrl)}
                >
                  {tut.thumbnailUrl ? (
                    <img
                      src={tut.thumbnailUrl}
                      alt={tut.title}
                      className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-slate-900 to-indigo-950 flex items-center justify-center">
                      <Video className="w-8 h-8 text-indigo-400/60" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-11 h-11 rounded-full bg-white/90 text-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 ml-0.5 fill-current" />
                    </div>
                  </div>
                  {tut.duration && (
                    <span className="absolute bottom-2 right-2 bg-black/75 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                      {tut.duration}
                    </span>
                  )}
                </div>

                <div className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                      {tut.departmentType.replace(/_/g, ' ')}
                    </span>
                    {tut.published && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                        <CheckCircle2 className="w-3 h-3" /> Published
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{tut.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2">{tut.description}</p>
                </div>
              </div>

              <div className="px-4 pb-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">{tut.category || 'Tutorial'}</span>
                <div className="flex items-center gap-1">
                  {tut.videoUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewUrl(tut.videoUrl!)}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold p-1"
                    >
                      Watch
                    </button>
                  )}
                  {tut.id && (
                    <button
                      type="button"
                      onClick={() => handleDelete(tut.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Tutorial Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Add Academy Tutorial</h3>
                  <p className="text-xs text-slate-500">Publish video guide for users and customers</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tutorial Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. How to connect custom domain in MBG portal"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={formData.departmentType}
                    onChange={(e) => setFormData({ ...formData, departmentType: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    {DEPARTMENTS.filter((d) => d !== 'ALL').map((d) => (
                      <option key={d} value={d}>
                        {d.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 4:15"
                    value={formData.duration || ''}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Video URL (YouTube or MP4) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={formData.videoUrl || ''}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Thumbnail Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.thumbnailUrl || ''}
                  onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Overview of topics and practical steps covered in this session..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                  {saving ? 'Publishing...' : 'Publish Tutorial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Video Player Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-slate-800 text-white">
              <span className="text-xs font-bold flex items-center gap-2">
                <Video className="w-4 h-4 text-indigo-400" />
                Tutorial Video Player
              </span>
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                src={formatEmbedUrl(previewUrl)}
                title="Tutorial Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
