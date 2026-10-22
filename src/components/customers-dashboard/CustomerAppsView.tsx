import { useState, useEffect } from 'react'
import { useCustomerSession } from '../../features/customers/hooks/useCustomerSession'
import {
  TrendingUp,
  MessageSquare,
  Grid,
  FileText,
  Sparkles,
  Download,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Smartphone,
} from 'lucide-react'

export function CustomerAppsView() {
  const { session } = useCustomerSession()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [revealedPass, setRevealedPass] = useState<string | null>(null)
  const [activeSlide, setActiveSlide] = useState(0)

  const screenshots = [
    '/assets/app-screenshots/screen1.png',
    '/assets/app-screenshots/screen2.png',
    '/assets/app-screenshots/screen3.png',
    '/assets/app-screenshots/screen4.png',
    '/assets/app-screenshots/screen5.png',
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % screenshots.length)
    }, 3500)
    return () => clearInterval(timer)
  }, [screenshots.length])

  const userPhone = session?.email || session?.username || 'Customer'
  const userPasswordFallback = 'Mbg@' + (session?.customerId || '12345')

  const apps = [
    {
      id: 'gmb',
      name: 'Google Performance Dashboard',
      tagline: 'Track rankings, calls, directions & reviews live',
      category: 'Analytics',
      status: 'active',
      statusLabel: 'Synced 2h ago',
      icon: TrendingUp,
      iconBg: '#e0f2fe',
      iconColor: '#0284c7',
      url: 'https://gmb.digitalmbg.com/login',
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Business Automation',
      tagline: 'Automated 24/7 replies, catalog sharing & broadcast flows',
      category: 'Messaging',
      status: 'active',
      statusLabel: 'Active flow',
      icon: MessageSquare,
      iconBg: '#dcfce7',
      iconColor: '#16a34a',
      url: 'https://web.whatsapp.com',
    },
    {
      id: 'magicqr',
      name: 'Magic QR Code',
      tagline: 'Smart dynamic QR for your physical storefront',
      category: 'Storefront',
      status: 'active',
      statusLabel: 'Active',
      icon: Grid,
      iconBg: '#f3e8ff',
      iconColor: '#9333ea',
      url: 'https://app.reviewus.in/register/login',
    },
    {
      id: 'seo',
      name: 'Website SEO Software',
      tagline: 'On-page audits, search rankings & keyword tracking',
      category: 'SEO',
      status: 'active',
      statusLabel: 'Synced 1d ago',
      icon: FileText,
      iconBg: '#dbeafe',
      iconColor: '#2563eb',
      url: 'https://website.digitalmbg.com/login',
    },
    {
      id: 'creatives',
      name: 'Festival Creative App',
      tagline: '10,000+ ready-to-post customized festival posters',
      category: 'Creative',
      status: 'active',
      statusLabel: 'Active',
      icon: Sparkles,
      iconBg: '#ffe4e6',
      iconColor: '#e11d48',
      url: 'https://play.google.com/store/apps/details?id=com.visticsolution.adboost&pcampaignid=web_share',
    },
    {
      id: 'extractor',
      name: 'Data Extractor Software',
      tagline: 'Export B2B leads, contacts & companies in bulk',
      category: 'Leads',
      status: 'active',
      statusLabel: 'Synced 5h ago',
      icon: Download,
      iconBg: '#cffafe',
      iconColor: '#0891b2',
      url: 'https://databankmbg-frontend.vercel.app/login',
    },
    {
      id: 'ai-ads',
      name: 'Facebook & Google AI Ad Software',
      tagline: 'Generate high-ROI ad creatives & copy in minutes',
      category: 'Advertising',
      status: 'pending',
      statusLabel: 'Coming soon',
      icon: Sparkles,
      iconBg: '#fef3c7',
      iconColor: '#d97706',
      url: null,
    },
  ]

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const togglePassword = (id: string) => {
    setRevealedPass((prev) => (prev === id ? null : id))
  }

  return (
    <div style={{ padding: '24px 32px', minHeight: 'calc(100vh - 64px)', background: '#f8fafc' }}>
      {/* Hero Section */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          borderRadius: '20px',
          padding: '36px 40px',
          color: '#ffffff',
          marginBottom: '32px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '32px',
          alignItems: 'center',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: '540px', position: 'relative', zIndex: 2 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(8px)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              color: '#a5b4fc',
              marginBottom: '14px',
              textTransform: 'uppercase',
            }}
          >
            <Sparkles size={13} />
            MBG Applications Hub
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 800, lineHeight: 1.25, margin: '0 0 12px 0' }}>
            Your growth toolkit,<br />all in one login.
          </h1>

          <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.5, margin: '0 0 20px 0' }}>
            Every app included with your business subscription — open with a single click and access credentials easily.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <a
              href="https://play.google.com/store/apps/details?id=com.mbg.mbgtaskcrm&pcampaignid=web_share"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                background: '#ffffff',
                color: '#0f172a',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <Smartphone size={16} />
              Get Android Mobile App
            </a>
          </div>
        </div>

        {/* Carousel Preview Column */}
        <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
          <div
            style={{
              width: '260px',
              height: '180px',
              borderRadius: '14px',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              border: '2px solid rgba(255, 255, 255, 0.15)',
              background: '#020617',
              position: 'relative',
            }}
          >
            {screenshots.map((src, index) => (
              <img
                key={src}
                src={src}
                alt={`App screenshot ${index + 1}`}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: activeSlide === index ? 1 : 0,
                  transition: 'opacity 0.6s ease-in-out',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Apps */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
          Available Applications
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
          Direct access to specialized business softwares included in your account.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '20px',
        }}
      >
        {apps.map((app) => {
          const IconComp = app.icon
          const isRevealed = revealedPass === app.id

          return (
            <div
              key={app.id}
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div>
                {/* Top Badge & Icon */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: app.iconBg,
                      color: app.iconColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconComp size={22} />
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: '#f1f5f9',
                        color: '#475569',
                      }}
                    >
                      {app.category}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: app.status === 'active' ? '#ecfdf5' : '#fffbeb',
                        color: app.status === 'active' ? '#059669' : '#d97706',
                      }}
                    >
                      {app.statusLabel}
                    </span>
                  </div>
                </div>

                {/* App Name & Description */}
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  {app.name}
                </h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b', lineHeight: 1.45 }}>
                  {app.tagline}
                </p>

                {/* Credentials Snippet */}
                <div
                  style={{
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    padding: '10px 12px',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Username / ID:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>{userPhone}</span>
                      <button
                        onClick={() => handleCopy(userPhone, `${app.id}-user`)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: copiedId === `${app.id}-user` ? '#10b981' : '#94a3b8' }}
                      >
                        {copiedId === `${app.id}-user` ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Password:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', fontFamily: 'monospace' }}>
                        {isRevealed ? userPasswordFallback : '••••••••'}
                      </span>
                      <button
                        onClick={() => togglePassword(app.id)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
                      >
                        {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <button
                        onClick={() => handleCopy(userPasswordFallback, `${app.id}-pass`)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: copiedId === `${app.id}-pass` ? '#10b981' : '#94a3b8' }}
                      >
                        {copiedId === `${app.id}-pass` ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              {app.url ? (
                <a
                  href={app.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    width: '100%',
                    padding: '9px 14px',
                    borderRadius: '8px',
                    background: '#0f172a',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  Open Application <ExternalLink size={13} />
                </a>
              ) : (
                <button
                  disabled
                  style={{
                    width: '100%',
                    padding: '9px 14px',
                    borderRadius: '8px',
                    background: '#f1f5f9',
                    color: '#94a3b8',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'not-allowed',
                  }}
                >
                  Coming Soon
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
