import { useAuth } from "@features/auth";
import { hasPermission } from "@features/dashboard";

import { MyPayrollView } from "./MyPayrollView";
import { PayrollManagementView } from "./PayrollManagementView";

export function PayrollPage() {
  const { user } = useAuth();
  const canViewAllPayroll = hasPermission(user?.role ?? null, "payroll:view_all");

  return (
    <div className="w-full">
      {canViewAllPayroll ? <PayrollManagementView /> : <MyPayrollView />}
    </div>
  );
}