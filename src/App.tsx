import { AdminLayout } from './components/layout/AdminLayout'
import { DepartmentManagementPage } from './features/departments/pages/DepartmentManagementPage'

function App() {
  return (
    <AdminLayout>
      <DepartmentManagementPage />
    </AdminLayout>
  )
}

export default App