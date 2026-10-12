import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  // Expose the registration passkey from `.env` to the client. Vite only
  // inlines VITE_* variables by default, so add the REGISTRATION_* prefix
  // for `import.meta.env.REGISTRATION_PASSWORD`.
  envPrefix: ['VITE_', 'REGISTRATION_'],
  server: {
    proxy: {
      '/api': {
        target: 'https://taskmbg.techmbgcard.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
})
