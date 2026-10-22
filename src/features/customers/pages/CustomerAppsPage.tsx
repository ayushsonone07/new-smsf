import { CustomerDashboardLayout } from '../../../components/customers-dashboard/CustomerDashboardLayout'
import { CustomerAppsView } from '../../../components/customers-dashboard/CustomerAppsView'

export function CustomerAppsPage() {
  return (
    <CustomerDashboardLayout activeKey="apps">
      <CustomerAppsView />
    </CustomerDashboardLayout>
  )
}

