import { CustomerDashboardLayout } from '../../../components/customers-dashboard/CustomerDashboardLayout'
import { CustomerServicesView } from '../../../components/customers-dashboard/CustomerServicesView'

export function CustomerServicesPage() {
  return (
    <CustomerDashboardLayout activeKey="services">
      <CustomerServicesView />
    </CustomerDashboardLayout>
  )
}

