import { useState } from "react";
import { Plus } from "lucide-react";
import { useQueryClient, useIsFetching } from "@tanstack/react-query";

import { useAuth } from "@features/auth";
import { useToast } from "@shared/components/feedback";
import { ErrorDisplay, Skeleton } from "@shared/components/ui";
import { RefreshButton } from "@/components/ui/RefreshButton";

import { EmployeeLeaveView } from "./EmployeeLeaveView";
import { EntitlementManagement } from "../components/EntitlementManagement";
import { OrganizationLeaveView } from "./OrganizationLeaveView";
import { ApplyLeaveDialog } from "../components/ApplyLeaveDialog";
import { leaveKeys } from "../hooks";

export function LeavePage() {
  const { user, role, isAuthenticated } = useAuth();
  const [mode, setMode] = useState<"self" | "team" | "entitlements">("self");
  const [showApply, setShowApply] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();
  const isFetching = useIsFetching({ queryKey: leaveKeys.all }) > 0;

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

  async function handleRefresh() {
    try {
      await queryClient.invalidateQueries({ queryKey: leaveKeys.all });
      toast.success("Refreshed successfully");
    } catch {
      toast.error("Failed to refresh leave");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {canViewTeam ? (
          <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "self"}
              onClick={() => setMode("self")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                mode === "self" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              My Leave
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "team"}
              onClick={() => setMode("team")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                mode === "team" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {role === "MANAGER" ? "Team Leave" : "Organisation Leave"}
            </button>
            {canManageEntitlements ? (
              <button
                type="button"
                role="tab"
                aria-selected={mode === "entitlements"}
                onClick={() => setMode("entitlements")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  mode === "entitlements" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Entitlements
              </button>
            ) : null}
          </div>
        ) : <span />}

        <div className="flex items-center gap-2">
          {mode === "self" ? (
            <button
              type="button"
              onClick={() => setShowApply(true)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition-all hover:brightness-110"
            >
              <Plus size={18} />
              Apply for Leave
            </button>
          ) : null}
          <RefreshButton
            onRefresh={handleRefresh}
            isRefreshing={isFetching}
            label="leave"
          />
        </div>
      </div>

      <div>
        {mode === "entitlements" && canManageEntitlements
          ? <EntitlementManagement />
          : mode === "team" && canViewTeam
            ? <OrganizationLeaveView role={role} />
            : <EmployeeLeaveView onOpenApply={() => setShowApply(true)} />}
      </div>

      <ApplyLeaveDialog open={showApply} onClose={() => setShowApply(false)} />
    </div>
  );
}
