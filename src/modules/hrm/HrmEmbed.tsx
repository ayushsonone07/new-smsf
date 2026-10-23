/**
 * HrmEmbed — mounts the full HRM sub-app inside crm_frontend.
 *
 * TanStack Router manages crm_frontend routes; react-router-dom manages
 * everything under /hrm/*. We wrap HrmRoot in <Routes><Route path="/hrm/*" /></Routes>
 * so that nested relative routes inside HRM (e.g. /login, /dashboard) properly match
 * the /hrm prefix from the browser URL.
 */
import { Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HrmRoot from './HrmRoot'
import './style.css'

function HrmLoadingFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        color: '#64748b',
        background: '#f8fafc',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: '3px solid #e2e8f0',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 12px',
          }}
        />
        <p style={{ margin: 0, fontSize: 14 }}>Loading HRM...</p>
      </div>
    </div>
  )
}

export default function HrmEmbed() {
  return (
    <BrowserRouter>
      <Suspense fallback={<HrmLoadingFallback />}>
        <Routes>
          <Route path="/hrm/*" element={<HrmRoot />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
