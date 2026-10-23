import { RouterProvider } from '@tanstack/react-router'
import { Suspense } from 'react'
import { router } from './app/router'
import {
  GlobalPreloader,
  RouteLoadingSkeleton,
} from './components/ui/GlobalPreloader'

function App() {
  return (
    <>
      <Suspense fallback={<RouteLoadingSkeleton />}>
        <RouterProvider router={router} />
      </Suspense>
      <GlobalPreloader />
    </>
  )
}

export default App
