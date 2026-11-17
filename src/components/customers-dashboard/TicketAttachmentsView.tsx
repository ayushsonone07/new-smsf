import { useEffect, useState } from 'react'
import { Download, ExternalLink, FileSpreadsheet, FileText, Paperclip, PlayCircle, X } from 'lucide-react'

export interface TicketAttachment {
  id?: number | string
  fileName?: string
  fileUrl?: string
  fileType?: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | string
  fileSize?: number
  createdAt?: string
}

type Kind = 'image' | 'video' | 'pdf' | 'doc'

function kindOf(a: TicketAttachment): Kind {
  const name = (a.fileName || a.fileUrl || '').toLowerCase()
  if (a.fileType === 'IMAGE') return 'image'
  if (a.fileType === 'VIDEO') return 'video'
  if (name.endsWith('.pdf')) return 'pdf'
  return 'doc'
}

function formatSize(bytes?: number) {
  if (!bytes) return ''
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

const tile: React.CSSProperties = {
  position: 'relative',
  width: '120px',
  height: '90px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  overflow: 'hidden',
  cursor: 'pointer',
  padding: 0,
  flexShrink: 0,
}

/**
 * Shows a ticket's attachments: image thumbnails, video tiles and document cards.
 * Images, videos and PDFs open in a full-screen preview; Word/Excel files download.
 */
export function TicketAttachmentsView({ attachments }: { attachments?: TicketAttachment[] }) {
  const [preview, setPreview] = useState<TicketAttachment | null>(null)

  useEffect(() => {
    if (!preview) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPreview(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [preview])

  const list = (attachments || []).filter((a) => a && a.fileUrl)
  if (list.length === 0) return null

  return (
    <div>
      <span
        style={{
          fontSize: '10px',
          fontWeight: 800,
          color: '#94a3b8',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginBottom: '6px',
        }}
      >
        <Paperclip size={11} /> ATTACHMENTS ({list.length})
      </span>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {list.map((a, i) => {
          const kind = kindOf(a)
          const key = `${a.id ?? i}-${a.fileName}`

          if (kind === 'image') {
            return (
              <button key={key} type="button" style={tile} onClick={() => setPreview(a)} title={a.fileName}>
                <img
                  src={a.fileUrl}
                  alt={a.fileName || 'attachment'}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </button>
            )
          }

          if (kind === 'video') {
            return (
              <button key={key} type="button" style={{ ...tile, background: '#0f172a' }} onClick={() => setPreview(a)} title={a.fileName}>
                <video
                  src={`${a.fileUrl}#t=0.5`}
                  preload="metadata"
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.85 }}
                />
                <PlayCircle
                  size={30}
                  color="#ffffff"
                  style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                />
              </button>
            )
          }

          // PDF / Word / Excel card
          const isPdf = kind === 'pdf'
          const DocIcon = /\.(xls|xlsx)$/i.test(a.fileName || '') ? FileSpreadsheet : FileText
          return (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                minWidth: '220px',
                maxWidth: '320px',
              }}
            >
              <DocIcon size={26} color={isPdf ? '#dc2626' : '#2563eb'} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={a.fileName}
                >
                  {a.fileName || 'Document'}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{formatSize(a.fileSize)}</div>
              </div>
              {isPdf ? (
                <button
                  type="button"
                  onClick={() => setPreview(a)}
                  style={{ border: 'none', background: '#eff6ff', color: '#2563eb', borderRadius: '6px', padding: '5px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                >
                  View
                </button>
              ) : (
                <a
                  href={a.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  title="Download"
                  style={{ color: '#2563eb', display: 'flex', padding: '4px' }}
                >
                  <Download size={16} />
                </a>
              )}
            </div>
          )
        })}
      </div>

      {/* Full-screen preview */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10050,
            background: 'rgba(15, 23, 42, 0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '1000px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', color: '#ffffff' }}
          >
            <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {preview.fileName}
            </span>
            <a
              href={preview.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in new tab"
              style={{ color: '#ffffff', display: 'flex', padding: '4px' }}
            >
              <ExternalLink size={18} />
            </a>
            <button
              type="button"
              onClick={() => setPreview(null)}
              aria-label="Close preview"
              style={{ border: 'none', background: 'transparent', color: '#ffffff', cursor: 'pointer', display: 'flex', padding: '4px' }}
            >
              <X size={22} />
            </button>
          </div>

          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '1000px', display: 'flex', justifyContent: 'center' }}>
            {kindOf(preview) === 'image' && (
              <img
                src={preview.fileUrl}
                alt={preview.fileName || 'attachment'}
                style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px' }}
              />
            )}
            {kindOf(preview) === 'video' && (
              <video src={preview.fileUrl} controls autoPlay style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '8px', background: '#000' }} />
            )}
            {kindOf(preview) === 'pdf' && (
              <iframe
                src={preview.fileUrl}
                title={preview.fileName || 'PDF preview'}
                style={{ width: '100%', height: '80vh', border: 'none', borderRadius: '8px', background: '#ffffff' }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
