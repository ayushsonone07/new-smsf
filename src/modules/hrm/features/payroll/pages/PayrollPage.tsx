import { useAuth } from "@features/auth";
import { hasPermission } from "@features/dashboard";

import { MyPayrollView } from "./MyPayrollView";
import { PayrollManagementView } from "./PayrollManagementView";
import { StaggerContainer, StaggerItem } from "@shared/components/ui";

export function PayrollPage() {
  const { user } = useAuth();
  const canViewAllPayroll = hasPermission(user?.role ?? null, "payroll:view_all");

  return (
    <StaggerContainer>
      <StaggerItem>
        {canViewAllPayroll ? <PayrollManagementView /> : <MyPayrollView />}
      </StaggerItem>
    </StaggerContainer>
  );
}