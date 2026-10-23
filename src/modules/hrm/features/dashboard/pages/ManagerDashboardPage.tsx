import EmployeeDashboardPage from "./EmployeeDashboardPage";

/**
 * Manager dashboard keeps the supported employee/self endpoint as its live source
 * and adds a team snapshot through the shared dashboard composition.
 */
export default function ManagerDashboardPage() {
  return <EmployeeDashboardPage />;
}
