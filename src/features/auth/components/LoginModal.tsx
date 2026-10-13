import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Building2, Eye, EyeOff } from 'lucide-react'
import { useLoginWithCredentials } from '../hooks/useLoginWithCredentials'
import { homeForRole, setSession } from '../../../app/auth/session'
import type { AuthSession } from '../types/auth.types'

interface LoginModalProps {
  open: boolean
  onClose: () => void
  /**
   * Called by "Register your business". Defaults to `onClose`, which
   * reveals the registration page that sits underneath this screen.
   */
  onRegister?: () => void
}

const STATS = [
  { value: '500+', label: 'Businesses' },
  { value: '98.5%', label: 'Task completion' },
  { value: '3x', label: 'Team productivity' },
]

const inputClass =
  'h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

/**
 * Full-screen sign-in view for the public page. Uses the same
 * credentials flow as `/login` and routes the user to their role home
 * once the session is created. "Register your business" hands control
 * back to the registration page.
 */
export function LoginModal({ open, onClose, onRegister }: LoginModalProps) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const credentialsMutation = useLoginWithCredentials()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    credentialsMutation.mutate(
      { email, password },
      {
        onSuccess: (session: AuthSession) => {
          setSession(session)
          onClose()
          navigate({
            to: homeForRole(
              session.user.role as never,
              session.user.departmentType,
            ) as never,
          })
        },
      },
    )
  }

  function handleRegister() {
    credentialsMutation.reset()
    ;(onRegister ?? onClose)()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-title"
    >
      <div className="grid min-h-full lg:grid-cols-[1.1fr_0.9fr]">
        {/* ─── Brand panel (desktop only) ─── */}
        <aside className="hidden flex-col justify-between bg-[#0b1d3f] p-14 text-white lg:flex">
          <div className="flex items-center gap-3.5">
            <img
              src="/mbg-card-logo.svg"
              alt="MBG logo"
              className="h-11 w-11 flex-shrink-0 rounded-lg"
            />
            <div>
              <p className="text-lg font-semibold leading-tight">
                MBG Task CRM
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                MBG Card · Task &amp; Client Management
              </p>
            </div>
          </div>

          <div>
            <h2 className="max-w-md text-4xl font-bold leading-tight tracking-tight">
              Every client, task and renewal in one workspace.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-slate-300">
              Assign work, track progress and manage client services with
              clear ownership and reporting for every team.
            </p>
            <div className="mt-9 flex flex-wrap gap-3.5">
              {STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="min-w-[132px] rounded-xl border border-white/20 bg-white/5 px-5 py-4"
                >
                  <p className="text-2xl font-bold tracking-tight">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-500">
            © 2026 MBG Card India Pvt Ltd · Jabalpur
          </p>
        </aside>

        {/* ─── Sign-in form ─── */}
        <main className="flex items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <img
                src="/mbg-card-logo.svg"
                alt="MBG logo"
                className="h-10 w-10 rounded-lg"
              />
              <span className="font-semibold text-slate-900">
                MBG Task CRM
              </span>
            </div>

            <h1
              id="login-title"
              className="text-3xl font-bold leading-tight tracking-tight text-slate-900"
            >
              Welcome back!
              <br />
              Log in to your account
            </h1>
            <p className="mb-7 mt-3 text-sm text-slate-500">
              Sign in with the email and password issued to you.
            </p>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label
                  htmlFor="login-email"
                  className="block text-xs font-medium text-slate-600"
                >
                  Email Address
                </label>
                <input
                  id="login-email"
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                  autoComplete="username"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-medium text-slate-600"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    required
                    type={showPassword ? 'text' : 'password'}
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {credentialsMutation.error ? (
                <p className="text-sm text-red-600" role="alert">
                  {credentialsMutation.error.message}
                </p>
              ) : null}

              <button
                type="submit"
                className="h-11 w-full rounded-lg bg-blue-600 font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={credentialsMutation.isPending}
              >
                {credentialsMutation.isPending ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <div className="my-6 flex items-center gap-4 text-sm text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              or
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <button
              type="button"
              onClick={handleRegister}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800 transition-colors hover:border-blue-400 hover:text-blue-700"
            >
              <Building2 className="h-4 w-4" />
              Register your business
            </button>
            <p className="mt-4 text-center text-sm text-slate-500">
              New to MBG Task CRM? Register to get your team set up.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
