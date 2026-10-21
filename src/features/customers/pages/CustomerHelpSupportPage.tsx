import { CustomerDashboardLayout } from '../../../components/customers-dashboard/CustomerDashboardLayout'
import { CustomerHelpSupportView } from '../../../components/customers-dashboard/CustomerHelpSupportView'

export function CustomerHelpSupportPage() {
  return (
    <CustomerDashboardLayout activeKey="help-support">
      <CustomerHelpSupportView />
    </CustomerDashboardLayout>
  )
}

