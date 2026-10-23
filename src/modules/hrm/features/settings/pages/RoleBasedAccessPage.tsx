import { useMemo, useState } from "react";

import { CheckCircle2, Lock, Search, Shield, SlidersHorizontal, XCircle } from "lucide-react";

import type { Role } from "@features/auth";
import { ROLE_PERMISSIONS, type Permission } from "@features/dashboard";
import { Card, EmptyState, IntegrationState, PageHeader, StatusBadge } from "@shared/components/ui";

import { Input } from "@hrm/components/ui/input";
import { Select } from "@hrm/components/ui/select";
import { cn } from "@hrm/lib/utils";

type DisplayRole = Exclude<Role, "HR_HEAD">;

const ROLES: DisplayRole[] = ["ADMIN", "HR", "SUB_HR", "MANAGER", "EMPLOYEE"];

const ROLE_META: Record<DisplayRole, { label: string; description: string }> = {
  ADMIN: {
    label: "Admin",
    description: "Full organization and administration access.",
  },
  HR: {
    label: "HR",
    description: "Organization-wide HR operations and employee management.",
  },
  SUB_HR: {
    label: "Sub HR",
    description: "Delegated HR operations with controlled administrative access.",
  },
  MANAGER: {
    label: "Manager",
    description: "Team-specific management and approval access.",
  },
  EMPLOYEE: {
    label: "Employee",
    description: "Personal profile and self-service access.",
  },
};

const PERMISSION_GROUPS: { module: string; permissions: Permission[] }[] = [
  { module: "Employees", permissions: ["employee:view", "employee:directory", "employee:create", "employee:update", "employee:delete"] },
  { module: "Departments", permissions: ["department:manage"] },
  { module: "Designations", permissions: ["designation:manage"] },
  {
    module: "Recruitment",
    permissions: [
      "candidate:view",
      "candidate:create",
      "candidate:update",
      "candidate:delete",
      "recruitment:view",
      "onboarding:manage",
    ],
  },
  { module: "Attendance", permissions: ["attendance:view_all", "attendance:view_self", "attendance:manage"] },
  { module: "Leave", permissions: ["leave:view_all", "leave:view_self", "leave:approve"] },
  { module: "Payroll", permissions: ["payroll:view_all", "payroll:view_self", "payroll:manage"] },
  { module: "Reports / Analytics", permissions: ["reports:view_all", "reports:view_limited", "performance:view"] },
  { module: "Administration", permissions: ["settings:manage", "roles:manage", "audit:view"] },
  { module: "Announcements", permissions: ["announcements:view"] },
];

const ALL_MODULES = ["All modules", ...PERMISSION_GROUPS.map((group) => group.module)] as const;
type ModuleFilter = (typeof ALL_MODULES)[number];

const SYSTEM_REQUIRED: Partial<Record<Role, Permission[]>> = {
  ADMIN: ["roles:manage", "settings:manage", "audit:view"],
};

export function RoleBasedAccessPage() {
  const [selectedRole, setSelectedRole] = useState<DisplayRole>("ADMIN");
  const [query, setQuery] = useState("");
  const [module, setModule] = useState<ModuleFilter>("All modules");
  const [grantedOnly, setGrantedOnly] = useState(false);

  const granted = ROLE_PERMISSIONS[selectedRole];
  const filteredGroups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return PERMISSION_GROUPS.filter((group) => module === "All modules" || group.module === module)
      .map((group) => ({
        ...group,
        permissions: group.permissions.filter((permission) => {
          const hasAccess = granted.includes(permission);
          const matchesGranted = !grantedOnly || hasAccess;
          const text = `${group.module} ${permissionLabel(permission)} ${permission}`.toLowerCase();
          const matchesQuery = !needle || text.includes(needle);
          return matchesGranted && matchesQuery;
        }),
      }))
      .filter((group) => group.permissions.length > 0);
  }, [granted, grantedOnly, module, query]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Role-based Access"
        description="Manage module access and permissions for each organizational role."
      />

      <IntegrationState
        icon={Lock}
        title="Permission editing is read-only"
        description="This screen reflects the centralized role and permission mapping used across the workspace."
      />

      <section className="grid gap-3 md:grid-cols-5" aria-label="Role summary">
        {ROLES.map((role) => {
          const active = role === selectedRole;
          return (
            <button
              key={role}
              type="button"
              onClick={() => setSelectedRole(role)}
              className={cn(
                "cursor-pointer rounded-xl border bg-card p-4 text-left shadow transition-all hover:border-primary/40 hover:bg-primary-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "border-primary bg-primary-soft text-primary" : "border-border",
              )}
              aria-pressed={active}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-card-foreground">{ROLE_META[role].label}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {ROLE_META[role].description}
                  </p>
                </div>
                <Shield size={17} className={active ? "text-primary" : "text-muted-foreground"} />
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <StatusBadge label={`${ROLE_PERMISSIONS[role].length} permissions`} tone={active ? "blue" : "slate"} />
                <span className="text-xs font-medium text-muted-foreground">System role</span>
              </div>
            </button>
          );
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card padding="md" className="h-fit xl:sticky xl:top-24">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
              <Shield size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-card-foreground">
                {ROLE_META[selectedRole].label}
              </h2>
              <p className="text-xs text-muted-foreground">{selectedRole}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {ROLE_META[selectedRole].description}
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <dt className="text-xs font-medium text-muted-foreground">Granted</dt>
              <dd className="mt-1 text-xl font-semibold text-card-foreground">{granted.length}</dd>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <dt className="text-xs font-medium text-muted-foreground">Available</dt>
              <dd className="mt-1 text-xl font-semibold text-card-foreground">
                {permissionCount()}
              </dd>
            </div>
          </dl>
        </Card>

        <section className="space-y-4">
          <Card padding="md">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-center">
              <label htmlFor="permission-search" className="relative">
                <span className="sr-only">Search permissions</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="permission-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search permission or module"
                  className="pl-9"
                />
              </label>

              <label>
                <span className="sr-only">Filter by module</span>
                <Select
                  value={module}
                  onChange={(event) => setModule(event.target.value)}
                >
                  {ALL_MODULES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </label>

              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-muted focus-within:ring-2 focus-within:ring-ring">
                <input
                  type="checkbox"
                  checked={grantedOnly}
                  onChange={(event) => setGrantedOnly(event.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-border text-primary"
                />
                Granted only
              </label>
            </div>
          </Card>

          {filteredGroups.length > 0 ? (
            filteredGroups.map((group) => (
              <Card key={group.module} padding="none" className="overflow-hidden">
                <header className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-5 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <SlidersHorizontal size={17} className="shrink-0 text-muted-foreground" />
                    <h3 className="truncate text-sm font-semibold text-card-foreground">
                      {group.module}
                    </h3>
                  </div>
                  <StatusBadge
                    label={`${group.permissions.filter((permission) => granted.includes(permission)).length}/${group.permissions.length} granted`}
                    tone="slate"
                  />
                </header>
                <div className="divide-y divide-border">
                  {group.permissions.map((permission) => {
                    const hasAccess = granted.includes(permission);
                    const systemRequired = SYSTEM_REQUIRED[selectedRole]?.includes(permission) ?? false;
                    return (
                      <div
                        key={permission}
                        className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-card-foreground">
                              {permissionLabel(permission)}
                            </p>
                            {systemRequired ? (
                              <StatusBadge label="System required" tone="amber" />
                            ) : null}
                          </div>
                          <p className="mt-1 break-all text-xs text-muted-foreground">
                            {permission}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                            hasAccess
                              ? "bg-success-soft text-success ring-success/30"
                              : "bg-muted text-muted-foreground ring-border",
                          )}
                        >
                          {hasAccess ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          {hasAccess ? "Granted" : "Not granted"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))
          ) : (
            <EmptyState
              icon={Search}
              title="No permissions found"
              description="Adjust search, module filter, or granted-only mode."
            />
          )}
        </section>
      </div>
    </div>
  );
}

function permissionCount(): number {
  return new Set(PERMISSION_GROUPS.flatMap((group) => group.permissions)).size;
}

function permissionLabel(permission: Permission): string {
  const labels: Record<Permission, string> = {
    "employee:view": "View employee profile",
    "employee:directory": "View employee directory",
    "employee:create": "Create employees",
    "employee:update": "Update employees",
    "employee:delete": "Delete employees",
    "candidate:view": "View candidates",
    "candidate:create": "Create candidates",
    "candidate:update": "Update candidates",
    "candidate:delete": "Delete candidates",
    "department:manage": "Manage departments",
    "designation:manage": "Manage designations",
    "attendance:view_all": "View organization attendance",
    "attendance:view_self": "View own attendance",
    "attendance:manage": "Manage attendance",
    "leave:view_all": "View organization leave",
    "leave:view_self": "View own leave",
    "leave:approve": "Approve leave requests",
    "payroll:view_all": "View organization payroll",
    "payroll:view_self": "View own payslips",
    "payroll:manage": "Manage payroll",
    "reports:view_all": "View all reports",
    "reports:view_limited": "View limited reports",
    "settings:manage": "Manage settings",
    "roles:manage": "Manage roles and permissions",
    "audit:view": "View audit logs",
    "recruitment:view": "View recruitment",
    "onboarding:manage": "Manage onboarding",
    "performance:view": "View performance",
    "announcements:view": "View announcements",
  };
  return labels[permission];
}
