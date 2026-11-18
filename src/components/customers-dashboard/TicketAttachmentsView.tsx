import React from 'react'
import { Download, ExternalLink, FileSpreadsheet, FileText, Image as ImageIcon, Paperclip, Video as VideoIcon } from 'lucide-react'

export interface TicketAttachment {
  id?: number | string
  fileName?: string
  fileUrl?: string
  fileType?: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | string
  fileSize?: number
  createdAt?: string
}

type Kind = 'image' | 'video' | 'pdf' | 'spreadsheet' | 'doc'

function kindOf(a: TicketAttachment): Kind {
  const name = (a.fileName || a.fileUrl || '').toLowerCase()
  if (a.fileType === 'IMAGE' || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name)) return 'image'
  if (a.fileType === 'VIDEO' || /\.(mp4|webm|ogg|mov|mkv|avi)$/i.test(name)) return 'video'
  if (name.endsWith('.pdf')) return 'pdf'
  if (/\.(xls|xlsx|csv)$/i.test(name)) return 'spreadsheet'
  return 'doc'
}

function formatSize(bytes?: number) {
  if (bytes == null) return 'Size unavailable'
  if (bytes === 0) return '0 B'
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function formatCreatedAt(value?: string) {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

async function handleDownload(fileUrl?: string, fileName?: string) {
  if (!fileUrl) return
  const name = fileName || 'attachment'
  try {
    const res = await fetch(fileUrl)
    const blob = await res.blob()
    const blobUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = name
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(blobUrl)
  } catch {
    // Fallback if cross-origin restricts fetch
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = name
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }
}

/**
 * Shows a ticket's attachments: image, video, PDF and document cards
 * with a direct Download button.
 */
export function TicketAttachmentsView({ attachments }: { attachments?: TicketAttachment[] }) {
  const list = (attachments || []).filter((a) => a && a.fileUrl)
  if (list.length === 0) return null

  return (
    <div style={{ marginTop: '4px', marginBottom: '8px' }}>
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
          marginBottom: '8px',
        }}
      >
        <Paperclip size={11} /> ATTACHMENTS ({list.length})
      </span>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {list.map((a, i) => {
          const kind = kindOf(a)
          const key = `${a.id ?? i}-${a.fileName}`

          let IconComponent = FileText
          let iconColor = '#2563eb'

          if (kind === 'image') {
            IconComponent = ImageIcon
            iconColor = '#059669'
          } else if (kind === 'video') {
            IconComponent = VideoIcon
            iconColor = '#7c3aed'
          } else if (kind === 'pdf') {
            IconComponent = FileText
            iconColor = '#dc2626'
          } else if (kind === 'spreadsheet') {
            IconComponent = FileSpreadsheet
            iconColor = '#16a34a'
          }

          return (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                minWidth: '240px',
                maxWidth: '340px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <IconComponent size={26} color={iconColor} style={{ flexShrink: 0 }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#0f172a',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={a.fileName || 'Attachment'}
                >
                  {a.fileName || 'Attachment'}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                  {(a.fileType || kind).toUpperCase()} · {formatSize(a.fileSize)}
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                  Added {formatCreatedAt(a.createdAt)}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <a
                  href={a.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none',
                    background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0',
                    borderRadius: '6px', padding: '6px 9px', fontSize: '11px', fontWeight: 700,
                  }}
                  title={`View ${a.fileName || 'file'} in a new tab`}
                >
                  <ExternalLink size={13} /> View
                </a>
                <button
                  type="button"
                  onClick={() => handleDownload(a.fileUrl, a.fileName)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px', border: 'none',
                    background: '#eff6ff', color: '#2563eb', borderRadius: '6px', padding: '7px 9px',
                    fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                  }}
                  title={`Download ${a.fileName || 'file'}`}
                >
                  <Download size={13} /> Download
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
