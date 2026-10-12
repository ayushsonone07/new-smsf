import { RouterProvider } from '@tanstack/react-router'
import { router } from './app/router'
import { GlobalPreloader } from './components/ui/GlobalPreloader'

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <GlobalPreloader />
    </>
  )
}

export default App
