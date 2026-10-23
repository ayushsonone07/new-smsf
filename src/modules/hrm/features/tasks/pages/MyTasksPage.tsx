import { ClipboardList } from "lucide-react";
import { Link } from "react-router-dom";

import {
  IntegrationState,
  PageHeader,
  StaggerContainer,
  StaggerItem,
} from "@shared/components/ui";
import { ROUTES } from "@shared/constants";

export function MyTasksPage() {
  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <PageHeader
          title="My Tasks"
          description="Your assigned tasks and to-dos"
        />
      </StaggerItem>
      <StaggerItem variant="card">
        <IntegrationState
          icon={ClipboardList}
          title="Task management is currently under development."
          description="A place for your assigned work items is coming soon. Once the task service is available, this page will show the tasks assigned to you."
          action={
            <Link
              to={ROUTES.dashboard}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary-hover"
            >
              Back to dashboard
            </Link>
          }
        />
      </StaggerItem>
    </StaggerContainer>
  );
}
