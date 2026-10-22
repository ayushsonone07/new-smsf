import React, { useState } from 'react'
import { generateOffersAi } from '../api/customer-features.api'
import { useCustomerSession } from '../../../features/customers/hooks/useCustomerSession'
import {
  Gift,
  Sparkles,
  Copy,
  Check,
  Loader2,
  ArrowLeft,
} from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export function CustomerGenerateOfferView() {
  const navigate = useNavigate()
  const { session } = useCustomerSession()

  const [businessName, setBusinessName] = useState(session?.company || session?.name || '')
  const [category, setCategory] = useState('Retail / Store')
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()])
  const [campaignTheme, setCampaignTheme] = useState('')

  const [offers, setOffers] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessName.trim()) return
    setLoading(true)
    try {
      const generated = await generateOffersAi({
        businessName: businessName.trim(),
        category: category.trim(),
        month,
        campaignTheme: campaignTheme.trim(),
      })
      setOffers(generated)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
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
              background: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Gift size={18} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Generate High-Converting Offers
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
          Generate 10 scroll-stopping WhatsApp & Instagram DM offers customized to your business in seconds
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: offers.length > 0 ? 'minmax(320px, 380px) 1fr' : '1fr',
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
              Business / Brand Name
            </label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Acme Tech Solutions"
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
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Doctor, Salon, Restaurant, Real Estate"
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
              Target Month / Season
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                background: '#ffffff',
                boxSizing: 'border-box',
              }}
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Campaign Theme / Focus (Optional)
            </label>
            <input
              type="text"
              value={campaignTheme}
              onChange={(e) => setCampaignTheme(e.target.value)}
              placeholder="e.g. Diwali Dhamaka, Weekend Special, Free Trial"
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
            {loading ? 'Generating Offers...' : 'Generate 10 Offers Now'}
          </button>
        </form>

        {/* Results Column */}
        {offers.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                Generated Offers ({offers.length})
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Click copy to paste into WhatsApp / Instagram</span>
            </div>

            {offers.map((offerText, idx) => (
              <div
                key={idx}
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#f1f5f9',
                      color: '#475569',
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#1e293b', lineHeight: 1.5 }}>
                    {offerText}
                  </p>
                </div>

                <button
                  onClick={() => handleCopy(offerText, idx)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: copiedIdx === idx ? '#ecfdf5' : '#ffffff',
                    color: copiedIdx === idx ? '#059669' : '#334155',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {copiedIdx === idx ? <Check size={12} /> : <Copy size={12} />}
                  {copiedIdx === idx ? 'Copied' : 'Copy'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
