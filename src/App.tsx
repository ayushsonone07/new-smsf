import { RouterProvider } from '@tanstack/react-router'
import { Suspense } from 'react'
import { router } from './app/router'
import { GlobalPreloader } from './components/ui/GlobalPreloader'

function App() {
  return (
    <>
      <Suspense fallback={<div className="route-loading" role="status">Loading page...</div>}>
        <RouterProvider router={router} />
      </Suspense>
      <GlobalPreloader />
    </>
  )
}

export default App
