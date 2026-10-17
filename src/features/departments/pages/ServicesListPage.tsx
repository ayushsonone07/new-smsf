import { Link } from '@tanstack/react-router'
import { AdminServiceListCard } from '../../../components/departments/AdminServiceListCard'
import { PageHeader } from '../../../components/layout/PageHeader'
import { PageLayout } from '../../../components/layout/PageLayout'

export function ServicesListPage() {
  return (
    <PageLayout>
      <PageHeader
        breadcrumb={
          <>
            <Link to="/admin">Administration</Link>
            {' / '}
            <span>Service List</span>
          </>
        }
        title="Service List"
        description="View and manage all registered services and department types."
      />

      <AdminServiceListCard onlyServiceList={true} />
    </PageLayout>
  )
}
