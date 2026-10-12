import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { QueryProvider } from './app/providers/QueryProvider'
import '@fontsource-variable/inter'
import '@fontsource-variable/jost'
import '@fontsource/jost/400.css'
import '@fontsource/jost/500.css'
import '@fontsource/jost/600.css'
import '@fontsource/jost/700.css'
import './index.css'

createRoot(
  document.getElementById('root')!,
).render(
  <StrictMode>
    <QueryProvider>
      <App />
    </QueryProvider>
  </StrictMode>,
)