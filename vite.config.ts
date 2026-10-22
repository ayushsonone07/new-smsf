import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_API_BASE_URL || 'http://localhost:8002'
  const helpCenterUrl = (
    env.HELP_CENTER_URL ||
    env.VITE_HELP_CENTER_URL ||
    'https://displace-cupcake-aqueduct.ngrok-free.dev'
  ).trim().replace(/\/$/, '')

  return {
    plugins: [tailwindcss(), react()],
    // Expose the registration passkey and help center url from `.env` to the client.
    envPrefix: ['VITE_', 'REGISTRATION_', 'HELP_CENTER_'],
    server: {
      proxy: {
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
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '/api'),
        },
      },
    },
  }
})
