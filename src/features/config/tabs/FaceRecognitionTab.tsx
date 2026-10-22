import { useState } from 'react'
import {
  Camera,
  Users,
  Shield,
  Activity,
  Send,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
} from 'lucide-react'
import { sendFaceEnrollLink } from '../../../api/config.api'

interface FaceRecognitionTabProps {
  onNotify: (msg: string, type?: 'success' | 'error') => void
}

interface FaceUserRecord {
  id: string
  name: string
  email: string
  department: string
  status: 'ENROLLED' | 'PENDING' | 'FAILED'
  confidence: number
  enrolledAt: string
}

const MOCK_FACE_RECORDS: FaceUserRecord[] = [
  {
    id: 'emp-1',
    name: 'Aman Verma',
    email: 'aman.verma@techmbgcard.com',
    department: 'WEBSITE_DEPARTMENT',
    status: 'ENROLLED',
    confidence: 99.4,
    enrolledAt: '2026-10-18',
  },
  {
    id: 'emp-2',
    name: 'Priya Mehta',
    email: 'priya.mehta@techmbgcard.com',
    department: 'GOOGLE_DEPARTMENT',
    status: 'ENROLLED',
    confidence: 98.8,
    enrolledAt: '2026-10-19',
  },
  {
    id: 'emp-3',
    name: 'Karan Patel',
    email: 'karan.patel@techmbgcard.com',
    department: 'SALES_DEPARTMENT',
    status: 'PENDING',
    confidence: 0,
    enrolledAt: '—',
  },
  {
    id: 'emp-4',
    name: 'Sneha Roy',
    email: 'sneha.roy@techmbgcard.com',
    department: 'ONBOARDING_DEPARTMENT',
    status: 'ENROLLED',
    confidence: 99.1,
    enrolledAt: '2026-10-21',
  },
]

export function FaceRecognitionTab({ onNotify }: FaceRecognitionTabProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [records] = useState<FaceUserRecord[]>(MOCK_FACE_RECORDS)
  const [modalOpen, setModalOpen] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [sendingLink, setSendingLink] = useState(false)

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recipientEmail.trim()) {
      onNotify('Please enter employee email', 'error')
      return
    }

    setSendingLink(true)
    try {
      const enrollUrl = `https://app.techmbgcard.com/face-enrollment?user=${encodeURIComponent(recipientEmail)}`
      await sendFaceEnrollLink(recipientEmail, enrollUrl)
      onNotify(`Face registration link dispatched to ${recipientEmail}`, 'success')
      setModalOpen(false)
      setRecipientEmail('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send face enrollment link'
      onNotify(msg, 'error')
    } finally {
      setSendingLink(false)
    }
  }

  const filteredRecords = records.filter(
    (r) =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.department.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Enrolled Members</span>
            <h3 className="text-2xl font-bold text-slate-800">42</h3>
            <span className="text-[11px] text-emerald-600 font-medium">94% of active workforce</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Model Accuracy</span>
            <h3 className="text-2xl font-bold text-slate-800">99.2%</h3>
            <span className="text-[11px] text-slate-400">ResNet LFW verified benchmark</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Attendance Liveness</span>
            <h3 className="text-2xl font-bold text-slate-800">Active</h3>
            <span className="text-[11px] text-emerald-600 font-medium">Anti-spoofing enabled</span>
          </div>
        </div>
      </div>

      {/* Table section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Face Biometric Registry</h3>
              <p className="text-xs text-slate-500">Monitor enrolled team members and dispatch facial enrollment links</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
            >
              <Send className="w-4 h-4" />
              Send Enroll Link
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <th className="px-5 py-3">Employee</th>
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Match Confidence</th>
                <th className="px-5 py-3">Enrolled At</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="font-bold text-slate-800 block">{r.name}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{r.email}</span>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-slate-600">
                    {r.department.replace(/_/g, ' ')}
                  </td>
                  <td className="px-5 py-3.5">
                    {r.status === 'ENROLLED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" /> Enrolled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                        <AlertCircle className="w-3 h-3" /> Pending
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-medium">
                    {r.confidence > 0 ? `${r.confidence}%` : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{r.enrolledAt}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setRecipientEmail(r.email)
                        setModalOpen(true)
                      }}
                      className="text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      Re-send Link
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enroll Link Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Dispatch Enrollment Link</h3>
                  <p className="text-xs text-slate-500">Send an email invitation with a secure face setup link</p>
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

            <form onSubmit={handleSendLink} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Employee Username / Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="employee@techmbgcard.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  The recipient will receive instructions to capture their facial biometric vector in a mobile or desktop camera.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingLink}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {sendingLink ? 'Sending Link...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
