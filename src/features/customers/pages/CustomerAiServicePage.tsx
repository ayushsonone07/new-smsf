import { CustomerDashboardLayout } from '../../../components/customers-dashboard/CustomerDashboardLayout'
import { CustomerAiServiceView } from '../../../components/customers-dashboard/CustomerAiServiceView'

export function CustomerAiServicePage() {
  return (
    <CustomerDashboardLayout activeKey="ai-service">
      <CustomerAiServiceView />
    </CustomerDashboardLayout>
  )
}

