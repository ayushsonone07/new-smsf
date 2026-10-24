import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_API_BASE_URL || 'http://localhost:8002'
  const hrmBackendUrl = env.VITE_HRM_BACKEND_URL || 'http://localhost:9096'
  const helpCenterUrl = (
    env.HELP_CENTER_URL ||
    env.VITE_HELP_CENTER_URL ||
    'https://ducking-shore-remedial.ngrok-free.dev'
  ).trim().replace(/\/$/, '')

  return {
    plugins: [tailwindcss(), react()],
    envPrefix: ['VITE_', 'REGISTRATION_', 'HELP_CENTER_'],
    server: {
      proxy: {
        // HRM backend proxy — /hrm-api/* → http://localhost:9096/*
        '/hrm-api': {
          target: hrmBackendUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/hrm-api/, ''),
          headers: { 'ngrok-skip-browser-warning': '1' },
          configure: (proxy) => {
            proxy.on('error', (err, _req, res) => {
              console.warn('[HRM Proxy] Backend unavailable:', err.message)
              if (res && 'writeHead' in res && !(res as any).headersSent) {
                (res as any).writeHead(503, { 'Content-Type': 'application/json' })
                ;(res as any).end(JSON.stringify({ error: 'HRM service unavailable', message: err.message }))
              }
            })
          },
        },
        '/help-center': {
          target: helpCenterUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/help-center/, '/api/v1'),
          headers: {
            'ngrok-skip-browser-warning': '1',
            'X-OAuth-Key': 'mbgcard-helpcenter-oauth-secret-key-2026',
          },
          configure: (proxy) => {
            proxy.on('error', (err) => {
              console.error('[Help Center Proxy] Error:', err.message)
            })
            proxy.on('proxyReq', (proxyReq, req) => {
              proxyReq.setHeader('ngrok-skip-browser-warning', '1')
              if (!proxyReq.getHeader('X-OAuth-Key')) {
                proxyReq.setHeader('X-OAuth-Key', 'mbgcard-helpcenter-oauth-secret-key-2026')
              }
              console.info('[Help Center Proxy]', req.method, req.url, '→', helpCenterUrl + proxyReq.path)
            })
          },
        },
        '/api/help-center': {
          target: helpCenterUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/help-center/, '/api/v1'),
          headers: {
            'ngrok-skip-browser-warning': '1',
            'X-OAuth-Key': 'mbgcard-helpcenter-oauth-secret-key-2026',
          },
          configure: (proxy) => {
            proxy.on('error', (err) => {
              console.error('[Help Center Proxy] Error:', err.message)
            })
            proxy.on('proxyReq', (proxyReq, req) => {
              proxyReq.setHeader('ngrok-skip-browser-warning', '1')
              if (!proxyReq.getHeader('X-OAuth-Key')) {
                proxyReq.setHeader('X-OAuth-Key', 'mbgcard-helpcenter-oauth-secret-key-2026')
              }
              console.info('[Help Center Proxy]', req.method, req.url, '→', helpCenterUrl + proxyReq.path)
            })
          },
        },
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
        '@hrm': path.resolve(import.meta.dirname, './src/modules/hrm'),
        '@app': path.resolve(import.meta.dirname, './src/modules/hrm/app'),
        '@features': path.resolve(import.meta.dirname, './src/modules/hrm/features'),
        '@shared': path.resolve(import.meta.dirname, './src/modules/hrm/shared'),
        '@config': path.resolve(import.meta.dirname, './src/modules/hrm/config'),
      },
    },
    optimizeDeps: {
      include: ['@stomp/stompjs', 'react', 'react-dom'],
    },
    define: {
      global: 'globalThis',
    },
  }
})
