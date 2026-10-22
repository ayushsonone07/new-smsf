import { useState } from 'react'
import { ShieldAlert, KeyRound, Lock, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react'
import { resetSuperAdminPassword } from '../../../api/config.api'

interface SecurityTabProps {
  onNotify: (msg: string, type?: 'success' | 'error') => void
}

export function SecurityTab({ onNotify }: SecurityTabProps) {
  const [resetting, setResetting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleResetPassword = async () => {
    setResetting(true)
    try {
      await resetSuperAdminPassword()
      onNotify(
        'Super Admin password reset process initiated. New credentials synchronized to Google Sheet.',
        'success',
      )
      setConfirmOpen(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset Super Admin password'
      onNotify(msg, 'error')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">System Security & Access Controls</h3>
            <p className="text-xs text-slate-500">
              Manage cryptographic keys, role access boundaries, and privileged root account credentials
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5" /> High Security
        </span>
      </div>

      {/* Main Password Reset Card */}
      <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-6 overflow-hidden relative">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div className="space-y-1 flex-1">
            <h4 className="text-base font-bold text-slate-800">Super Admin Password Rotation</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              This action will asynchronously generate a high-entropy cryptographically secure password for the Super Admin
              account. The refreshed credentials will automatically synchronize to the protected internal Google Sheet.
            </p>
          </div>
        </div>

        <div className="mt-5 p-4 bg-rose-50 rounded-xl border border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-rose-800 text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>Active Super Admin sessions will require re-authentication with new credentials.</span>
          </div>

          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors whitespace-nowrap flex-shrink-0"
          >
            <Lock className="w-3.5 h-3.5" />
            Reset Password
          </button>
        </div>
      </div>

      {/* Security Policies info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <h5 className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            Session Security Policy
          </h5>
          <p className="text-xs text-slate-500 leading-relaxed">
            All user authentication tokens utilize 256-bit HMAC signatures. Expired JWT tokens invalidate automatically after
            24 hours of inactivity.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <h5 className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Biometric Liveness Verification
          </h5>
          <p className="text-xs text-slate-500 leading-relaxed">
            Anti-spoofing heuristics and facial spatial bounding boxes prevent replay photo attacks across attendance stations.
          </p>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-800">Confirm Password Rotation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to trigger password rotation? A new password will be assigned and saved to the
                Google Sheet immediately.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={handleResetPassword}
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-50"
              >
                {resetting ? 'Rotating Password...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
