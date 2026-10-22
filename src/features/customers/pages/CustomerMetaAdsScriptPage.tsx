import { CustomerDashboardLayout } from '../../../components/customers-dashboard/CustomerDashboardLayout'
import { CustomerMetaAdsScriptView } from '../../../components/customers-dashboard/ai/CustomerMetaAdsScriptView'

export function CustomerMetaAdsScriptPage() {
  return (
    <CustomerDashboardLayout activeKey="ai-service">
      <CustomerMetaAdsScriptView />
    </CustomerDashboardLayout>
  )
}

