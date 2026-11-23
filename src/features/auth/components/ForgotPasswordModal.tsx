import { useState, useEffect } from 'react'
import {
  X,
  KeyRound,
  Phone,
  Mail,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
} from 'lucide-react'
import {
  sendForgotPasswordOtp,
  resetForgotPassword,
} from '../../../api/auth.api'

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  initialContact?: string
}

type ResetStep = 'contact' | 'verify_reset' | 'success'
type RecoveryMethod = 'phone' | 'email'

export function ForgotPasswordModal({
  isOpen,
  onClose,
  initialContact = '',
}: ForgotPasswordModalProps) {
  const [step, setStep] = useState<ResetStep>('contact')
  const [method, setMethod] = useState<RecoveryMethod>('phone')

  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [resendCooldown, setResendCooldown] = useState(0)

  // Initialize or prefill contact
  useEffect(() => {
    if (isOpen) {
      setStep('contact')
      setOtp('')
      setNewPassword('')
      setConfirmPassword('')
      setError(null)
      setSuccessMessage(null)
      setShowNewPassword(false)
      setShowConfirmPassword(false)
      setResendCooldown(0)

      if (initialContact.trim()) {
        if (initialContact.includes('@')) {
          setMethod('email')
          setEmail(initialContact.trim())
        } else {
          setMethod('phone')
          setPhone(initialContact.replace(/\D/g, '').slice(-10))
        }
      }
    }
  }, [isOpen, initialContact])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  if (!isOpen) return null

  function validateContact() {
    if (method === 'phone') {
      const cleanPhone = phone.replace(/\D/g, '')
      if (!cleanPhone) return 'Mobile number is required'
      if (cleanPhone.length !== 10) return 'Mobile number must be exactly 10 digits'
      return null
    }

    if (!email.trim()) return 'Email address is required'
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/
    if (!emailRegex.test(email.trim())) return 'Please enter a valid email address'
    return null
  }

  async function handleSendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setError(null)

    const validation = validateContact()
    if (validation) {
      setError(validation)
      return
    }

    setIsLoading(true)
    try {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10)
      const res = await sendForgotPasswordOtp(
        method === 'phone' ? { phone: cleanPhone } : { email: email.trim() },
      )
      setSuccessMessage(res.message || `OTP sent successfully via ${method === 'phone' ? 'WhatsApp' : 'Email'}.`)
      setStep('verify_reset')
      setResendCooldown(30)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send OTP. Please try again.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const cleanOtp = otp.trim()
    if (!cleanOtp || cleanOtp.length !== 6) {
      setError('Please enter a valid 6-digit OTP')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match')
      return
    }

    setIsLoading(true)
    try {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10)
      const res = await resetForgotPassword({
        ...(method === 'phone' ? { phone: cleanPhone } : { email: email.trim() }),
        otp: cleanOtp,
        newPassword,
        confirmPassword,
      })

      setSuccessMessage(res.message || 'Your password has been reset successfully!')
      setStep('success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset password. Please check the OTP.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-[440px] overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-50 text-sky-600">
              <KeyRound className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">Reset Password</h3>
              <p className="text-xs text-slate-500">
                {step === 'contact'
                  ? 'Verify your identity to regain access'
                  : step === 'verify_reset'
                    ? 'Enter OTP & your new password'
                    : 'Password updated'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span className="flex-1 font-medium">{error}</span>
            </div>
          )}

          {step === 'contact' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              {/* Method Selector Tabs */}
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMethod('phone')
                    setError(null)
                  }}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
                    method === 'phone'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                  <span>WhatsApp OTP</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMethod('email')
                    setError(null)
                  }}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
                    method === 'email'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Mail className="h-3.5 w-3.5 text-sky-600" />
                  <span>Email OTP</span>
                </button>
              </div>

              {/* Contact Input */}
              {method === 'phone' ? (
                <div>
                  <label htmlFor="reset-phone" className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Mobile Number (WhatsApp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                      +91
                    </span>
                    <input
                      id="reset-phone"
                      type="tel"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                      autoFocus
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    We will send a 6-digit verification code to your WhatsApp.
                  </p>
                </div>
              ) : (
                <div>
                  <label htmlFor="reset-email" className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                      autoFocus
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    We will send a 6-digit verification code to your email.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-sm font-semibold text-white shadow-md shadow-sky-200 transition hover:from-sky-600 hover:to-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sending code...</span>
                  </>
                ) : (
                  <span>Send Verification Code</span>
                )}
              </button>
            </form>
          )}

          {step === 'verify_reset' && (
            <form onSubmit={handleResetPassword} className="space-y-3.5">
              {successMessage && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Code sent to:{' '}
                  <strong className="font-semibold text-slate-800">
                    {method === 'phone' ? `+91 ${phone}` : email}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setStep('contact')
                    setError(null)
                  }}
                  className="inline-flex items-center gap-1 font-semibold text-sky-600 hover:underline"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Change
                </button>
              </div>

              {/* 6-Digit OTP */}
              <div>
                <label htmlFor="otp-input" className="mb-1 block text-xs font-semibold text-slate-700">
                  6-Digit Verification Code
                </label>
                <input
                  id="otp-input"
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-center font-mono text-lg font-bold tracking-widest text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  autoFocus
                />
              </div>

              {/* New Password */}
              <div>
                <label htmlFor="new-password" className="mb-1 block text-xs font-semibold text-slate-700">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 6 chars)"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pr-11 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirm-password" className="mb-1 block text-xs font-semibold text-slate-700">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pr-11 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Resend button */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Didn't receive the code?</span>
                <button
                  type="button"
                  disabled={resendCooldown > 0 || isLoading}
                  onClick={() => handleSendOtp()}
                  className="font-semibold text-sky-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-sm font-semibold text-white shadow-md shadow-sky-200 transition hover:from-sky-600 hover:to-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Resetting password...</span>
                  </>
                ) : (
                  <span>Reset Password</span>
                )}
              </button>
            </form>
          )}

          {step === 'success' && (
            <div className="space-y-4 py-4 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </span>
              <div>
                <h4 className="text-base font-bold text-slate-900">Password Reset Complete</h4>
                <p className="mt-1 text-xs text-slate-500">
                  Your password has been updated successfully. You can now sign in with your new credentials.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-11 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
