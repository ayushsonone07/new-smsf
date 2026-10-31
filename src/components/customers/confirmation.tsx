import React, { useState } from 'react'
import { Check, Clock3, AlertTriangle, RefreshCw } from 'lucide-react'

export type ConfirmationPreviewState = 'loading' | 'verifying' | 'success' | 'failure' | 'error'

const PRESET_SERVICES = [
  'Onboarding Service',
  'Website Creation',
  'Google Service',
  'Automation Dashboard',
  'SEO & Content',
]

export function ConfirmationPreviewCard({
  state = 'success',
  serviceName = 'Onboarding Service',
  businessName = 'Lala Company',
  confirmedAt = '26 Sep 2026, 06:12 PM',
  onRetry,
}: {
  state?: ConfirmationPreviewState
  serviceName?: string
  businessName?: string
  confirmedAt?: string
  onRetry?: () => void
}) {
  const currentService = serviceName.trim() || 'Onboarding Service'
  const svcLower = currentService.toLowerCase()

  const config = {
    loading: {
      title: 'Loading…',
      body: 'Opening your confirmation link.',
      tileBg: '#e8efff',
      tileFg: '#2459e0',
    },
    verifying: {
      title: 'Verifying your link',
      body: `Checking the secure token for ${currentService} — this takes a moment.`,
      tileBg: '#e8efff',
      tileFg: '#2459e0',
    },
    success: {
      title: `${currentService} confirmed!`,
      body: `Thank you! Your ${svcLower} with MBG Card is confirmed. Our team will reach out with next steps.`,
      tileBg: '#dcfce7',
      tileFg: '#16a34a',
    },
    failure: {
      title: 'Link expired or already used',
      body: `This confirmation link for ${currentService} is no longer valid. Ask your onboarding executive for a new one.`,
      tileBg: '#fff5d6',
      tileFg: '#b7791f',
    },
    error: {
      title: 'Something went wrong',
      body: 'We could not reach the server. Check your connection and try again.',
      tileBg: '#ffe4e6',
      tileFg: '#e11d48',
    },
  }[state]

  return (
    <div className="w-full max-w-[430px] rounded-[22px] bg-white p-7 shadow-[0_20px_50px_rgba(36,89,224,0.12)] border border-[#e6e9f0] flex flex-col items-center text-center gap-3 animate-in fade-in zoom-in-95 duration-200">
      {/* Brand logo */}
      <div className="flex items-center gap-2 mb-1">
        <span className="w-8 h-8 rounded-[9px] bg-[#2459e0] grid place-items-center shadow-[inset_0_-3px_0_#ffc629]">
          <span className="font-bold text-[11px] text-white">
            M<span className="text-[#ffc629]">B</span>G
          </span>
        </span>
        <strong className="font-semibold text-slate-800 text-[15px]">MBG Card</strong>
      </div>

      {/* State Tile Icon */}
      <div
        className="w-[76px] h-[76px] rounded-[22px] grid place-items-center my-1"
        style={{ backgroundColor: config.tileBg, color: config.tileFg }}
      >
        {state === 'loading' || state === 'verifying' ? (
          <div
            className="w-[34px] h-[34px] rounded-full border-[3px] border-[#c7d6ff] border-t-[#2459e0] animate-spin"
            style={{ animationDuration: '0.8s' }}
          />
        ) : state === 'success' ? (
          <Check size={34} strokeWidth={2.4} />
        ) : state === 'failure' ? (
          <Clock3 size={34} strokeWidth={2.4} />
        ) : (
          <AlertTriangle size={34} strokeWidth={2.4} />
        )}
      </div>

      {/* Title & Body */}
      <h2 className="m-0 text-[22px] font-semibold text-slate-900 tracking-tight">
        {config.title}
      </h2>
      <p className="m-0 text-[13.5px] text-slate-600 max-w-[340px] leading-relaxed">
        {config.body}
      </p>

      {/* Summary table for Success */}
      {state === 'success' && (
        <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1.5 text-left text-[13px] w-full p-3 rounded-[13px] bg-[#f0fdf4] border border-[#bbf7d0]">
          <dt className="text-slate-500 font-normal">Business</dt>
          <dd className="m-0 font-medium text-slate-900">{businessName}</dd>
          <dt className="text-slate-500 font-normal">Service</dt>
          <dd className="m-0 font-medium text-slate-900">{currentService}</dd>
          <dt className="text-slate-500 font-normal">Confirmed</dt>
          <dd className="m-0 font-medium text-slate-900">{confirmedAt}</dd>
        </dl>
      )}

      {/* Try Again Button for Error */}
      {state === 'error' && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 h-9 px-5 rounded-[11px] bg-[#2459e0] hover:bg-[#1a45b8] text-white font-medium text-[13.5px] shadow-xs transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  )
}

export function ConfirmationPreviewPage() {
  const [activeState, setActiveState] = useState<ConfirmationPreviewState>('success')
  const [serviceName, setServiceName] = useState('Onboarding Service')
  const [businessName, setBusinessName] = useState('Lala Company')

  const states: { key: ConfirmationPreviewState; label: string }[] = [
    { key: 'loading', label: 'Loading' },
    { key: 'verifying', label: 'Verifying (Pending Confirmation)' },
    { key: 'success', label: 'Success' },
    { key: 'failure', label: 'Failure' },
    { key: 'error', label: 'Error' },
  ]

  const handleRetry = () => {
    setActiveState('verifying')
    setTimeout(() => setActiveState('success'), 1100)
  }

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Top Header / Switcher Bar matching prototype */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Preview state:</span>
          <div
            role="radiogroup"
            className="inline-flex flex-wrap gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200/60"
          >
            {states.map((s) => {
              const active = activeState === s.key
              return (
                <button
                  key={s.key}
                  role="radio"
                  aria-checked={active}
                  onClick={() => setActiveState(s.key)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                    active
                      ? 'bg-blue-600 text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/70">
          Standalone · no login
        </span>
      </div>

      {/* Service Selector & Customizer Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs text-xs">
        <span className="font-semibold text-slate-700">Particular Service:</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESET_SERVICES.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setServiceName(preset)}
              className={`px-2.5 py-1 rounded-lg border transition-all text-xs ${
                serviceName === preset
                  ? 'bg-blue-50 border-blue-400 text-blue-700 font-semibold'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <input
            type="text"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            placeholder="Custom Service Name..."
            className="h-8 px-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-500 w-48"
          />
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Business Name..."
            className="h-8 px-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-500 w-36"
          />
        </div>
      </div>

      {/* Main Preview Container with Prototype Radial Gradient Background */}
      <div
        className="min-h-[490px] rounded-3xl grid place-items-center p-7 border border-[#e6e9f0]"
        style={{
          background:
            'radial-gradient(circle at 20% 0%, #e3ebff 0%, transparent 45%), radial-gradient(circle at 90% 100%, #fff0bf 0%, transparent 40%), #f7f9fd',
        }}
      >
        <ConfirmationPreviewCard
          state={activeState}
          serviceName={serviceName}
          businessName={businessName}
          confirmedAt="26 Sep 2026, 06:12 PM"
          onRetry={handleRetry}
        />
      </div>
    </div>
  )
}

export { ConfirmationPreviewPage as PreviewStatePage }

export default ConfirmationPreviewPage
