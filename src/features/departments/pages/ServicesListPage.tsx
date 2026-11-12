import { AdminServiceListCard } from '../../../components/departments/AdminServiceListCard'
import { PageHeader } from '../../../components/layout/PageHeader'
import { PageLayout } from '../../../components/layout/PageLayout'

export function ServicesListPage() {
  return (
    <PageLayout>
     

      <AdminServiceListCard onlyServiceList={true} />
    </PageLayout>
  )
}
