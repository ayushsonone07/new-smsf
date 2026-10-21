import React, { useState } from 'react'
import { generateMetaAdsScriptAi } from '../api/customer-features.api'
import { useCustomerSession } from '../../../features/customers/hooks/useCustomerSession'
import {
  Megaphone,
  Sparkles,
  Copy,
  Check,
  Loader2,
  ArrowLeft,
} from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

export function CustomerMetaAdsScriptView() {
  const navigate = useNavigate()
  const { session } = useCustomerSession()

  const [businessName, setBusinessName] = useState(session?.company || session?.name || '')
  const [businessCategory, setBusinessCategory] = useState('Digital Agency / Retail')
  const [language, setLanguage] = useState<'English' | 'Hindi' | 'Hinglish'>('Hinglish')
  const [mainProblem, setMainProblem] = useState('Not getting enough high-paying local customers')
  const [keyOffer, setKeyOffer] = useState('Free 1-on-1 strategy call + 25% discount')

  const [scriptResult, setScriptResult] = useState<{
    hook: string
    problem: string
    solution: string
    cta: string
    fullScript: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [copiedSection, setCopiedSection] = useState<string | null>(null)

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessName.trim()) return
    setLoading(true)
    try {
      const res = await generateMetaAdsScriptAi({
        businessName: businessName.trim(),
        businessCategory: businessCategory.trim(),
        language,
        mainProblem: mainProblem.trim(),
        keyOffer: keyOffer.trim(),
      })
      setScriptResult(res)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text)
    setCopiedSection(section)
    setTimeout(() => setCopiedSection(null), 2000)
  }

  return (
    <div style={{ padding: '24px 32px', minHeight: 'calc(100vh - 64px)', background: '#f8fafc' }}>
      {/* Back button */}
      <button
        onClick={() => navigate({ to: '/customers/ai-service' })}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '6px',
          border: '1px solid #cbd5e1',
          background: '#ffffff',
          color: '#334155',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: '20px',
        }}
      >
        <ArrowLeft size={14} /> Back to AI Tools
      </button>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#ede9fe',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Megaphone size={18} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Meta & Reel Ad Script Generator
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
          Craft high-converting 60-second direct-to-camera ad scripts formatted with hook, problem, solution & call to action
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: scriptResult ? 'minmax(320px, 380px) 1fr' : '1fr',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Form Card */}
        <form
          onSubmit={handleGenerate}
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Business Name
            </label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Apex Dental Clinic"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Business Category
            </label>
            <input
              type="text"
              required
              value={businessCategory}
              onChange={(e) => setBusinessCategory(e.target.value)}
              placeholder="e.g. Dentist, Gym, Fashion, Consulting"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Script Language
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['Hinglish', 'English', 'Hindi'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: language === lang ? '#0f172a' : '#ffffff',
                    color: language === lang ? '#ffffff' : '#334155',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Customer Problem / Pain Point
            </label>
            <textarea
              rows={2}
              required
              value={mainProblem}
              onChange={(e) => setMainProblem(e.target.value)}
              placeholder="e.g. Spending on ads with zero sales"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Key Offer / Call To Action
            </label>
            <input
              type="text"
              required
              value={keyOffer}
              onChange={(e) => setKeyOffer(e.target.value)}
              placeholder="e.g. Get 50% Off First Visit"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: '8px',
              border: 'none',
              background: '#0f172a',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? 'Generating Script...' : 'Generate Ad Script'}
          </button>
        </form>

        {/* Script Output Column */}
        {scriptResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: '0 0 2px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                    Complete Script Breakdown
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Language: {language} · Duration ~60 sec</span>
                </div>

                <button
                  onClick={() => handleCopy(scriptResult.fullScript, 'full')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: copiedSection === 'full' ? '#ecfdf5' : '#ffffff',
                    color: copiedSection === 'full' ? '#059669' : '#0f172a',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {copiedSection === 'full' ? <Check size={14} /> : <Copy size={14} />}
                  {copiedSection === 'full' ? 'Full Script Copied' : 'Copy Entire Script'}
                </button>
              </div>

              {/* Sections */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* 1. Hook */}
                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>
                      1. The Hook (0-5s)
                    </span>
                    <button
                      onClick={() => handleCopy(scriptResult.hook, 'hook')}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: copiedSection === 'hook' ? '#059669' : '#94a3b8' }}
                    >
                      {copiedSection === 'hook' ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>{scriptResult.hook}</p>
                </div>

                {/* 2. Problem */}
                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>
                      2. The Pain Point & Agitation (5-20s)
                    </span>
                    <button
                      onClick={() => handleCopy(scriptResult.problem, 'problem')}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: copiedSection === 'problem' ? '#059669' : '#94a3b8' }}
                    >
                      {copiedSection === 'problem' ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#334155' }}>{scriptResult.problem}</p>
                </div>

                {/* 3. Solution */}
                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>
                      3. The Solution & Proof (20-45s)
                    </span>
                    <button
                      onClick={() => handleCopy(scriptResult.solution, 'solution')}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: copiedSection === 'solution' ? '#059669' : '#94a3b8' }}
                    >
                      {copiedSection === 'solution' ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#334155' }}>{scriptResult.solution}</p>
                </div>

                {/* 4. CTA */}
                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                      4. Call to Action (45-60s)
                    </span>
                    <button
                      onClick={() => handleCopy(scriptResult.cta, 'cta')}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: copiedSection === 'cta' ? '#059669' : '#94a3b8' }}
                    >
                      {copiedSection === 'cta' ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>{scriptResult.cta}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
