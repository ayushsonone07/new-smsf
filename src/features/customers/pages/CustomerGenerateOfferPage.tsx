import { CustomerDashboardLayout } from '../../../components/customers-dashboard/CustomerDashboardLayout'
import { CustomerGenerateOfferView } from '../../../components/customers-dashboard/ai/CustomerGenerateOfferView'

export function CustomerGenerateOfferPage() {
  return (
    <CustomerDashboardLayout activeKey="ai-service">
      <CustomerGenerateOfferView />
    </CustomerDashboardLayout>
  )
}

