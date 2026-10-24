import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, Eye, EyeOff, LayoutDashboard, ShieldCheck } from 'lucide-react'
import { useLoginWithCredentials } from '../hooks/useLoginWithCredentials'
import { homeForRole, setSession } from '../../../app/auth/session'
import { setCustomerSessionFromAuth } from '../../customers/hooks/useCustomerSession'
import type { AuthSession } from '../types/auth.types'

const menu = ['Overview', 'Customers', 'Onboarding', 'Tasks', 'Team', 'Reports']
const stages = ['New Lead', 'Assigned', 'Processing', 'Completed']

function CrmPreview() {
  return (
    <svg viewBox="0 0 620 510" xmlns="http://www.w3.org/2000/svg" className="block h-full max-h-full w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Illustration of MBG CRM with customer management, onboarding workflow, team activity and quick tasks; no live statistics">
      <defs>
        <linearGradient id="crm-panel" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff"/><stop offset="1" stopColor="#f8fcff"/></linearGradient>
        <linearGradient id="crm-blue" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#38bdf8"/><stop offset="1" stopColor="#0284c7"/></linearGradient>
        <filter id="crm-shadow" x="-25%" y="-25%" width="150%" height="160%"><feDropShadow dx="0" dy="12" stdDeviation="14" floodColor="#0369a1" floodOpacity=".16"/></filter>
      </defs>
      <rect x="22" y="22" width="576" height="460" rx="22" fill="url(#crm-panel)" stroke="#d7eaf7" filter="url(#crm-shadow)"/>
      <path d="M44 22H145V482H44Q22 482 22 460V44Q22 22 44 22Z" fill="#f0f9ff"/>
      <rect x="46" y="45" width="38" height="38" rx="11" fill="url(#crm-blue)"/>
      <g stroke="white" fill="none" strokeWidth="2.5"><rect x="55" y="54" width="8" height="8" rx="1.5"/><rect x="68" y="54" width="8" height="8" rx="1.5"/><rect x="55" y="67" width="8" height="8" rx="1.5"/><rect x="68" y="67" width="8" height="8" rx="1.5"/></g>
      <text x="92" y="69" fontSize="15" fontWeight="700" fill="#0f172a">MBG</text>
      {menu.map((label, i) => {
        const y = 124 + i * 49
        return <g key={label}>
          {i === 0 && <rect x="34" y={y - 23} width="100" height="38" rx="9" fill="#d9f2ff"/>}
          <rect x="47" y={y - 12} width="14" height="14" rx="4" fill={i === 0 ? '#0284c7' : '#bfdbfe'}/>
          <text x="68" y={y} fontSize="10" fontWeight={i === 0 ? '700' : '500'} fill={i === 0 ? '#0369a1' : '#64748b'}>{label}</text>
        </g>
      })}
      <text x="166" y="62" fontSize="19" fontWeight="700" fill="#0f172a">CRM Workspace</text>
      <text x="166" y="83" fontSize="10.5" fill="#64748b">Customer management overview</text>
      <rect x="482" y="44" width="90" height="30" rx="15" fill="#f0f9ff" stroke="#dbeafe"/>
      <circle cx="500" cy="59" r="5" fill="#38bdf8"/>
      <text x="513" y="63" fontSize="10" fill="#0369a1" fontWeight="600">Workspace</text>
      {[
        { x: 166, label: 'Customers', color: '#0ea5e9' },
        { x: 302, label: 'Onboarding', color: '#6366f1' },
        { x: 438, label: 'Team Tasks', color: '#10b981' },
      ].map(item => <g key={item.label}>
        <rect x={item.x} y="109" width="124" height="88" rx="12" fill="white" stroke="#e2e8f0"/>
        <rect x={item.x + 12} y="122" width="28" height="28" rx="8" fill={item.color} fillOpacity=".12"/>
        <circle cx={item.x + 26} cy="136" r="6" fill={item.color}/>
        <text x={item.x + 12} y="172" fontSize="12" fontWeight="600" fill="#334155">{item.label}</text>
        <rect x={item.x + 12} y="180" width="65" height="4" rx="2" fill="#e2e8f0"/>
      </g>)}
      <rect x="166" y="213" width="396" height="125" rx="13" fill="white" stroke="#e2e8f0"/>
      <text x="181" y="235" fontSize="13" fontWeight="700" fill="#0f172a">Customer Onboarding Workflow</text>
      <text x="181" y="252" fontSize="9.5" fill="#94a3b8">Track each stage of the customer journey</text>
      <line x1="220" y1="286" x2="506" y2="286" stroke="#bae6fd" strokeWidth="5" strokeLinecap="round"/>
      {stages.map((label, i) => {
        const x = [220, 315, 410, 506][i]
        return <g key={label}>
          <circle cx={x} cy="286" r="17" fill={['#0ea5e9','#38bdf8','#7dd3fc','#e0f2fe'][i]} stroke="white" strokeWidth="3"/>
          {i < 3 ? <path d={`M${x-6} 286 l4 4 l8 -9`} fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/> : <circle cx={x} cy="286" r="5" fill="#38bdf8"/>}
          <text x={x} y="318" fontSize="9" fill="#475569" textAnchor="middle">{label}</text>
        </g>
      })}
      <rect x="166" y="353" width="245" height="108" rx="13" fill="white" stroke="#e2e8f0"/>
      <text x="181" y="375" fontSize="12" fontWeight="700" fill="#0f172a">Team Activity</text>
      {['Lead assigned','Profile reviewed','Task updated'].map((label, i) => {
        const y = 393 + i * 24
        return <g key={label}><circle cx="190" cy={y} r="7" fill={['#38bdf8','#818cf8','#34d399'][i]}/><text x="206" y={y+4} fontSize="10" fill="#475569">{label}</text><rect x="339" y={y-3} width="55" height="5" rx="2.5" fill="#e2e8f0"/></g>
      })}
      <rect x="423" y="353" width="139" height="108" rx="13" fill="white" stroke="#e2e8f0"/>
      <text x="437" y="375" fontSize="12" fontWeight="700" fill="#0f172a">Quick Tasks</text>
      {['Follow-up','Review','Approval'].map((label, i) => {
        const y = 396 + i * 26
        return <g key={label}><rect x="438" y={y-10} width="13" height="13" rx="4" fill="#e0f2fe" stroke="#7dd3fc"/><path d={`M441 ${y-4} l3 3 l5 -6`} stroke="#0284c7" strokeWidth="1.5" fill="none" strokeLinecap="round"/><text x="459" y={y} fontSize="10" fill="#475569">{label}</text></g>
      })}
    </svg>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const credentialsMutation = useLoginWithCredentials()

  const handleSessionCreated = useCallback((session: AuthSession) => {
    setSession(session)
    if (session.user.role === 'CUSTOMER') setCustomerSessionFromAuth(session)
    navigate({ to: homeForRole(session.user.role as never, session.user.departmentType) as never })
  }, [navigate])

  function handleCredentialsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    credentialsMutation.mutate({ email, password }, { onSuccess: handleSessionCreated })
  }

  const credentialsError = credentialsMutation.error?.message

  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-[#f0f9ff] px-5 py-6 font-sans text-slate-900 sm:px-8 lg:h-dvh lg:overflow-hidden lg:px-12 lg:py-8">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-sky-200/50 blur-3xl" />
      <div className="relative z-10 grid w-full max-w-[1360px] overflow-hidden rounded-[28px] border border-white bg-white shadow-[0_20px_70px_-30px_rgba(14,116,144,0.25)] lg:h-full lg:max-h-[800px] lg:min-h-0 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="flex min-h-0 flex-col bg-white px-7 py-6 sm:px-10 lg:px-12 lg:py-7">
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 p-1.5"><img src="/mbg-card-logo.svg" alt="MBG Card" className="h-full w-full object-contain" /></div>
            <div><strong className="block text-lg leading-tight">MBG Card</strong><span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-600">Admin Portal</span></div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col justify-center py-5 lg:py-4">
            <div className="mb-5">
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700"><ShieldCheck size={14}/> Secure Admin Access</span>
              <h1 className="text-[32px] font-bold tracking-tight lg:text-[36px]">Welcome back<span className="text-sky-500">.</span></h1>
              <p className="mt-2 max-w-sm text-sm leading-5 text-slate-500">Sign in to manage your CRM, customers, leads, tasks and business operations.</p>
            </div>
            <form onSubmit={handleCredentialsSubmit} className="space-y-3">
              <div><label htmlFor="login-email" className="mb-1.5 block text-[13px] font-semibold text-slate-700">Email Address</label><input id="login-email" required type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@company.com" autoComplete="username" className="h-[46px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100" /></div>
              <div><label htmlFor="login-password" className="mb-1.5 block text-[13px] font-semibold text-slate-700">Password</label><div className="relative"><input id="login-password" required type={showPassword ? 'text' : 'password'} minLength={6} value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" className="h-[46px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pr-12 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100" /><button type="button" onClick={() => setShowPassword(current => !current)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-sky-50 hover:text-sky-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></div>
              {credentialsError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{credentialsError}</p>}
              <button type="submit" disabled={credentialsMutation.isPending} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:from-sky-600 hover:to-cyan-600 disabled:cursor-not-allowed disabled:opacity-60">{credentialsMutation.isPending ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"/>Signing in...</> : <>Sign in <ArrowRight size={17}/></>}</button>
            </form>
            <p className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400"><ShieldCheck size={14} className="text-sky-500"/>Secure access to your MBG Card workspace</p>
          </div>
          <footer className="flex shrink-0 flex-wrap justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-400"><span>© {new Date().getFullYear()} MBG Card</span><span>Customer Relationship Management</span></footer>
        </section>
        <section className="relative hidden min-h-0 flex-col overflow-hidden bg-gradient-to-br from-[#f0f9ff] via-[#e0f2fe] to-[#bae6fd] lg:flex">
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/40 blur-3xl"/>
          <div className="relative z-10 shrink-0 px-9 pt-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-sky-700"><LayoutDashboard size={14}/> MBG Card CRM</span>
            <h2 className="mt-3 text-[clamp(22px,2.3vw,30px)] font-bold leading-tight tracking-tight">Your entire workspace.<span className="block text-sky-600">One powerful dashboard.</span></h2>
            <p className="mt-2 max-w-[430px] text-[13px] leading-5 text-slate-600">Manage customer onboarding, track team activities, and streamline your daily operations.</p>
          </div>
          <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-8 py-4"><CrmPreview/></div>
          <div className="relative z-10 shrink-0 pb-5 text-center text-[11px] text-sky-700/70">Customers · Onboarding · Tasks · Team Management</div>
        </section>
      </div>
    </main>
  )
}
