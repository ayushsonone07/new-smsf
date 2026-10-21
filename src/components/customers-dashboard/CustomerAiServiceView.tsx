import { useNavigate } from '@tanstack/react-router'
import { Bot, Gift, Megaphone, ArrowRight, Sparkles } from 'lucide-react'

export function CustomerAiServiceView() {
  const navigate = useNavigate()

  const tools = [
    {
      icon: Gift,
      iconBg: '#fef3c7',
      iconColor: '#d97706',
      title: 'Generate Offer',
      description: '10 scroll-stopping WhatsApp & Instagram DM offers, tailored to your business, category and target month.',
      badge: '10 offers · 5 sec',
      path: '/customers/ai-service/generate-offer',
    },
    {
      icon: Megaphone,
      iconBg: '#ede9fe',
      iconColor: '#7c3aed',
      title: 'Meta Ads Script',
      description: 'A 60-second direct-to-camera video ad script with hook, problem agitation, solution proof & CTA.',
      badge: 'Multi-language (Hindi/English)',
      path: '/customers/ai-service/meta-ads-script',
    },
  ]

  return (
    <div
      style={{
        padding: '32px 36px',
        minHeight: 'calc(100vh - 64px)',
        background: 'linear-gradient(to bottom right, #ffffff, #f0f9ff)',
      }}
    >
      {/* Heading */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bot size={18} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            AI Copywriting & Growth Services
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
          Publish-ready marketing copy, hooks and promotions created exclusively for your business in seconds.
        </p>
      </div>

      {/* Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          maxWidth: '1000px',
        }}
      >
        {tools.map((tool) => {
          const IconComp = tool.icon

          return (
            <div
              key={tool.title}
              onClick={() => navigate({ to: tool.path })}
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                border: '1px solid #e0f2fe',
                padding: '28px',
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '220px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = '0 12px 20px -5px rgba(2, 132, 199, 0.15)'
                e.currentTarget.style.borderColor = '#bae6fd'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                e.currentTarget.style.borderColor = '#e0f2fe'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '14px',
                      background: tool.iconBg,
                      color: tool.iconColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconComp size={26} />
                  </div>

                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: '#f0f9ff',
                      color: '#0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ArrowRight size={18} />
                  </div>
                </div>

                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                  {tool.title}
                </h3>
                <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                  {tool.description}
                </p>
              </div>

              <div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    background: '#e0f2fe',
                    color: '#0369a1',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  <Sparkles size={12} />
                  {tool.badge}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: '36px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
        Tip: Provide clear business keywords for higher conversion ad copy.
      </div>
    </div>
  )
}
