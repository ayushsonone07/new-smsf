import { useState } from "react";

import { useAuth } from "@features/auth";
import { ErrorDisplay, Skeleton } from "@shared/components/ui";
import { StaggerContainer, StaggerItem } from "@shared/components/ui";

import { EmployeeLeaveView } from "./EmployeeLeaveView";
import { EntitlementManagement } from "../components/EntitlementManagement";
import { OrganizationLeaveView } from "./OrganizationLeaveView";

export function LeavePage() {
  const { user, role, isAuthenticated } = useAuth();
  const [mode, setMode] = useState<"self" | "team" | "entitlements">("self");

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <Skeleton className="h-40 w-full max-w-md" />
      </div>
    );
  }

  const canViewTeam = role === "ADMIN" || role === "HR" || role === "HR_HEAD"
    || role === "SUB_HR" || role === "MANAGER";
  const canManageEntitlements = role === "ADMIN" || role === "HR" || role === "HR_HEAD";
  if (!role) return <ErrorDisplay message="You do not have permission to view the leave section." />;

  return (
    <StaggerContainer>
      <StaggerItem>
        {canViewTeam ? (
          <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow" role="tablist">
            <button type="button" role="tab" aria-selected={mode === "self"} onClick={() => setMode("self")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === "self" ? "bg-foreground text-background" : "text-muted-foreground"}`}>
              My Leave
            </button>
            <button type="button" role="tab" aria-selected={mode === "team"} onClick={() => setMode("team")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === "team" ? "bg-foreground text-background" : "text-muted-foreground"}`}>
              {role === "MANAGER"? "Team Leave" : "Organisation Leave"}
            </button>
            {canManageEntitlements ? (
              <button type="button" role="tab" aria-selected={mode === "entitlements"} onClick={() => setMode("entitlements")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === "entitlements" ? "bg-foreground text-background" : "text-muted-foreground"}`}>
                Entitlements
              </button>
            ) : null}
          </div>
        ) : null}
      </StaggerItem>

      <StaggerItem>
        {mode === "entitlements" && canManageEntitlements
          ? <EntitlementManagement />
          : mode === "team" && canViewTeam
            ? <OrganizationLeaveView role={role} />
            : <EmployeeLeaveView />}
      </StaggerItem>
    </StaggerContainer>
  );
}
