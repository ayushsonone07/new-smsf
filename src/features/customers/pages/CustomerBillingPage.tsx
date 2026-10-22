import { CustomerDashboardLayout } from '../../../components/customers-dashboard/CustomerDashboardLayout'
import { CustomerBillingView } from '../../../components/customers-dashboard/CustomerBillingView'

export function CustomerBillingPage() {
  return (
    <CustomerDashboardLayout activeKey="billing">
      <CustomerBillingView />
    </CustomerDashboardLayout>
  )
}

