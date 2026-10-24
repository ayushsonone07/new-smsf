
import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Eye,
  EyeOff,
  ArrowRight,
  Users,
  TrendingUp,
  CheckCircle2,
  Clock3,
  CalendarDays,
  LayoutDashboard,
  Bell,
  Search,
  MoreHorizontal,
  ShieldCheck,
  UserRoundPlus,
  CircleDollarSign,
  Activity,
  ArrowUpRight,
} from 'lucide-react'

import { useLoginWithCredentials } from '../hooks/useLoginWithCredentials'
import {
  homeForRole,
  setSession,
} from '../../../app/auth/session'
import { setCustomerSessionFromAuth } from '../../customers/hooks/useCustomerSession'
import type { AuthSession } from '../types/auth.types'

export function LoginPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const credentialsMutation = useLoginWithCredentials()

  const handleSessionCreated = useCallback(
    (session: AuthSession) => {
      setSession(session)

      if (session.user.role === 'CUSTOMER') {
        setCustomerSessionFromAuth(session)
      }

      navigate({
        to: homeForRole(
          session.user.role as never,
          session.user.departmentType,
        ) as never,
      })
    },
    [navigate],
  )

  function handleCredentialsSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    credentialsMutation.mutate(
      { email, password },
      { onSuccess: handleSessionCreated },
    )
  }

  const credentialsError = credentialsMutation.error?.message

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F0F9FF] px-4 py-8 font-sans text-slate-800 sm:px-6 lg:px-10">
      {/* Background decoration */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-sky-200/40 blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-48 -right-32 h-[550px] w-[550px] rounded-full bg-cyan-200/40 blur-[120px]" />

      <div className="relative z-10 grid w-full max-w-[1180px] overflow-hidden rounded-[28px] border border-white bg-white shadow-[0_30px_100px_-35px_rgba(14,116,144,0.25)] lg:min-h-[690px] lg:grid-cols-[0.92fr_1.08fr]">

        {/* LEFT: LOGIN FORM */}
        <section className="flex flex-col bg-white px-6 py-7 sm:px-12 sm:py-10 lg:px-14">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-sky-100 bg-sky-50 p-1.5">
              <img
                src="/mbg-card-logo.svg"
                alt="MBG Card"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="flex flex-col">
              <span className="text-[18px] font-bold tracking-tight text-slate-900">
                MBG Card
              </span>
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-sky-600">
                Admin Portal
              </span>
            </div>
          </div>

          {/* Form */}
          <div className="flex flex-1 flex-col justify-center py-14 lg:py-8">
            <div className="mb-9">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700">
                <ShieldCheck size={14} />
                Secure Admin Access
              </div>

              <h1 className="text-[34px] font-bold tracking-[-0.04em] text-slate-900 sm:text-[40px]">
                Welcome back<span className="text-sky-500">.</span>
              </h1>

              <p className="mt-3 max-w-[340px] text-[14px] leading-6 text-slate-500">
                Sign in to manage your CRM, customers, leads,
                tasks and business operations.
              </p>
            </div>

            <form
              onSubmit={handleCredentialsSubmit}
              className="space-y-5"
            >
              {/* Email */}
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-2 block text-[13px] font-semibold text-slate-700"
                >
                  Email Address
                </label>

                <input
                  id="login-email"
                  required
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="name@company.com"
                  autoComplete="username"
                  className="h-[52px] w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 text-[14px] text-slate-800 outline-none transition-all placeholder:text-slate-400 hover:border-sky-200 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="login-password"
                  className="mb-2 block text-[13px] font-semibold text-slate-700"
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
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="h-[52px] w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 pr-12 text-[14px] text-slate-800 outline-none transition-all placeholder:text-slate-400 hover:border-sky-200 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((current) => !current)
                    }
                    aria-label={
                      showPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                    aria-pressed={showPassword}
                    title={
                      showPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-sky-50 hover:text-sky-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
                  >
                    {showPassword ? (
                      <EyeOff size={19} aria-hidden="true" />
                    ) : (
                      <Eye size={19} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* Authentication error */}
              {credentialsError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600"
                >
                  {credentialsError}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={credentialsMutation.isPending}
                className="group flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-[15px] font-semibold text-white shadow-[0_8px_20px_-6px_rgba(14,165,233,0.5)] transition-all duration-200 hover:from-sky-600 hover:to-cyan-600 hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-65"
              >
                {credentialsMutation.isPending ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight
                      size={18}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
              <ShieldCheck size={15} className="text-sky-500" />
              Secure access to your MBG Card workspace
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 text-[11px] text-slate-400">
            <span>© {new Date().getFullYear()} MBG Card</span>
            <span>Customer Relationship Management</span>
          </div>
        </section>

        {/* RIGHT: CRM DASHBOARD ILLUSTRATION */}
        <section className="relative hidden min-h-[690px] overflow-hidden bg-gradient-to-br from-[#EAF8FF] via-[#DDF3FF] to-[#BCE9FF] lg:flex lg:flex-col">

          {/* Decorative background */}
          <div className="pointer-events-none absolute -right-28 -top-24 h-[380px] w-[380px] rounded-full border-[65px] border-white/30" />
          <div className="pointer-events-none absolute -bottom-32 -left-28 h-[380px] w-[380px] rounded-full border-[65px] border-white/30" />
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'radial-gradient(#7dd3fc 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* Heading */}
          <div className="relative z-10 px-10 pt-12">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-sky-700 shadow-sm">
              <Activity size={14} />
              Smart CRM Workspace
            </div>

            <h2 className="max-w-[420px] text-[30px] font-bold leading-tight tracking-tight text-slate-900">
              Everything your team needs,
              <span className="text-sky-600"> in one place.</span>
            </h2>

            <p className="mt-3 max-w-[410px] text-[13px] leading-6 text-slate-600">
              Manage leads, track sales, monitor tasks and grow
              your business with MBG Card CRM.
            </p>
          </div>

          {/* Dashboard mockup */}
          <div className="relative z-10 mx-8 mt-9 rounded-[20px] border border-white/90 bg-white/95 p-4 shadow-[0_25px_65px_-20px_rgba(14,116,144,0.28)] backdrop-blur-xl">

            {/* Dashboard header */}
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-white">
                  <LayoutDashboard size={18} />
                </div>

                <div>
                  <p className="text-[13px] font-bold text-slate-800">
                    CRM Dashboard
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Business overview
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-400">
                <Search size={15} />
                <Bell size={15} />
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700">
                  AD
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-2.5">
              <StatCard
                icon={<Users size={15} />}
                title="Total Leads"
                value="1,284"
                change="+12.5%"
                iconClass="bg-sky-100 text-sky-600"
              />
              <StatCard
                icon={<CircleDollarSign size={15} />}
                title="Active Deals"
                value="248"
                change="+8.2%"
                iconClass="bg-cyan-100 text-cyan-600"
              />
              <StatCard
                icon={<CheckCircle2 size={15} />}
                title="Tasks Done"
                value="86%"
                change="+5.4%"
                iconClass="bg-emerald-100 text-emerald-600"
              />
            </div>

            {/* Chart */}
            <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3.5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-semibold text-slate-800">
                    Lead Performance
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Monthly lead activity
                  </p>
                </div>

                <div className="flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-1 text-[10px] font-medium text-sky-600">
                  <TrendingUp size={12} />
                  +18.6%
                </div>
              </div>

              <svg
                viewBox="0 0 440 115"
                className="h-[110px] w-full overflow-visible"
                role="img"
                aria-label="Illustrative upward trend of monthly leads"
              >
                <defs>
                  <linearGradient
                    id="crmChartFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#38BDF8"
                      stopOpacity="0.28"
                    />
                    <stop
                      offset="100%"
                      stopColor="#38BDF8"
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>

                {[20, 50, 80, 110].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    y1={y}
                    x2="440"
                    y2={y}
                    stroke="#E2E8F0"
                    strokeDasharray="4 5"
                  />
                ))}

                <path
                  d="M0 95 C30 90 45 65 75 74 S120 93 150 62 S205 78 235 48 S285 60 315 32 S375 47 440 10 L440 115 L0 115 Z"
                  fill="url(#crmChartFill)"
                />

                <path
                  d="M0 95 C30 90 45 65 75 74 S120 93 150 62 S205 78 235 48 S285 60 315 32 S375 47 440 10"
                  fill="none"
                  stroke="#0EA5E9"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                <circle
                  cx="440"
                  cy="10"
                  r="5"
                  fill="#0EA5E9"
                  stroke="white"
                  strokeWidth="3"
                />
              </svg>

              <div className="mt-1 flex justify-between text-[9px] text-slate-400">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'].map(
                  (month) => (
                    <span key={month}>{month}</span>
                  ),
                )}
              </div>
            </div>

            {/* Sales pipeline */}
            <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3.5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[12px] font-semibold text-slate-800">
                  Sales Pipeline
                </p>
                <MoreHorizontal size={16} className="text-slate-400" />
              </div>

              <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className="w-[35%] bg-sky-400" />
                <div className="w-[27%] bg-cyan-400" />
                <div className="w-[22%] bg-blue-500" />
                <div className="w-[16%] bg-emerald-400" />
              </div>

              <div className="mt-3 grid grid-cols-4 gap-1 text-center">
                <PipelineItem
                  color="bg-sky-400"
                  label="New"
                  value="35%"
                />
                <PipelineItem
                  color="bg-cyan-400"
                  label="Contacted"
                  value="27%"
                />
                <PipelineItem
                  color="bg-blue-500"
                  label="Qualified"
                  value="22%"
                />
                <PipelineItem
                  color="bg-emerald-400"
                  label="Won"
                  value="16%"
                />
              </div>
            </div>
          </div>

          {/* Floating cards */}
          <div className="absolute bottom-10 left-5 z-20 flex items-center gap-2.5 rounded-xl border border-white bg-white px-3 py-2.5 shadow-[0_12px_35px_-12px_rgba(14,116,144,0.4)]">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <UserRoundPlus size={17} />
            </div>

            <div>
              <p className="text-[11px] font-semibold text-slate-800">
                New lead assigned
              </p>
              <p className="text-[10px] text-slate-400">
                Just now
              </p>
            </div>

            <ArrowUpRight size={14} className="text-emerald-500" />
          </div>

          <div className="absolute bottom-8 right-5 z-20 flex items-center gap-2 rounded-xl border border-white bg-white px-3 py-2.5 shadow-[0_12px_35px_-12px_rgba(14,116,144,0.4)]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
              <CalendarDays size={16} />
            </div>

            <div>
              <p className="text-[11px] font-semibold text-slate-800">
                Follow-up
              </p>
              <p className="flex items-center gap-1 text-[10px] text-slate-400">
                <Clock3 size={10} />
                Today, 3:30 PM
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

type StatCardProps = {
  icon: React.ReactNode
  title: string
  value: string
  change: string
  iconClass: string
}

function StatCard({
  icon,
  title,
  value,
  change,
  iconClass,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
      <div
        className={`mb-2 flex h-7 w-7 items-center justify-center rounded-lg ${iconClass}`}
      >
        {icon}
      </div>

      <p className="text-[10px] text-slate-500">{title}</p>

      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <span className="text-[19px] font-bold tracking-tight text-slate-800">
          {value}
        </span>

        <span className="rounded bg-emerald-50 px-1 py-0.5 text-[9px] font-medium text-emerald-600">
          {change}
        </span>
      </div>
    </div>
  )
}

type PipelineItemProps = {
  color: string
  label: string
  value: string
}

function PipelineItem({
  color,
  label,
  value,
}: PipelineItemProps) {
  return (
    <div>
      <div className="flex items-center justify-center gap-1">
        <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
        <span className="text-[9px] text-slate-500">
          {label}
        </span>
      </div>
      <p className="mt-1 text-[11px] font-semibold text-slate-700">
        {value}
      </p>
    </div>
  )
}
