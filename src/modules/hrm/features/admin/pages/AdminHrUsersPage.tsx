import { useState } from "react";

import { useMutation } from "@tanstack/react-query";
import { Check, Eye, EyeOff, Loader2, ShieldAlert, UserPlus, X } from "lucide-react";

import { useAuth } from "@features/auth";
import { useDepartments } from "@features/hr/hooks";
import { Card, PageHeader } from "@shared/components/ui";

import { Select } from "@hrm/components/ui/select";

import { adminService } from "../services/adminService";

import type { CreateUserInput } from "../services/adminService";

type CreateRole = "ADMIN" | "HR" | "MANAGER";

const ROLE_OPTIONS: { value: CreateRole; label: string; description: string; allowed: Set<string> }[] = [
  { value: "HR", label: "HR", description: "Human Resources", allowed: new Set(["ADMIN", "HR_HEAD", "HR"]) },
  { value: "MANAGER", label: "Manager", description: "Department Manager", allowed: new Set(["ADMIN"]) },
  { value: "ADMIN", label: "Admin", description: "System Administrator", allowed: new Set(["ADMIN"]) },
];

const initialForm: CreateUserInput = { name: "", email: "", phone: "", password: "", role: "HR" };
const INITIAL_PASSWORD_VISIBILITY = { showPassword: false, showConfirmPassword: false };

export function AdminHrUsersPage() {
  const { role: currentRole } = useAuth();
  const departmentsQuery = useDepartments();
  const departments = departmentsQuery.data ?? [];
  const [form, setForm] = useState<CreateUserInput>(initialForm);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisibility, setPasswordVisibility] = useState(INITIAL_PASSWORD_VISIBILITY);
  const [passwordError, setPasswordError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const mutation = useMutation<string, Error, CreateUserInput>({
    mutationFn: (input) => adminService.createUser(input),
    onSuccess: (msg) => {
      setSuccessMsg(msg);
      setForm(initialForm);
      setConfirmPassword("");
      setPasswordError("");
      setPasswordVisibility(INITIAL_PASSWORD_VISIBILITY);
      setTimeout(() => setSuccessMsg(""), 5000);
    },
  });

  const allowedRoles = ROLE_OPTIONS.filter((r) => currentRole && r.allowed.has(currentRole));

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name || !form.email || !form.password) return;
    if (form.role === "HR" && !form.departmentId) {
      setPasswordError("Please select a department for HR.");
      return;
    }
    if (form.password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setPasswordError("");
    mutation.mutate(form);
  }

  function setField<K extends keyof CreateUserInput>(key: K, value: CreateUserInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleVisibility(key: "showPassword" | "showConfirmPassword") {
    setPasswordVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Create and manage HR and Manager users."
      />

      <Card padding="md">
        <form onSubmit={handleSubmit} className="space-y-5">
          {successMsg ? (
            <div className="flex items-center gap-2 rounded-xl border border-success-soft bg-success-soft/50 px-4 py-3 text-sm font-semibold text-success">
              <Check size={16} /> {successMsg}
              <button type="button" onClick={() => setSuccessMsg("")} className="ml-auto cursor-pointer">
                <X size={14} />
              </button>
            </div>
          ) : null}

          {mutation.error ? (
            <div className="flex items-center gap-2 rounded-xl border border-danger-soft bg-danger-soft/50 px-4 py-3 text-sm font-semibold text-danger">
              <ShieldAlert size={16} /> {mutation.error.message}
            </div>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="user-full-name" className="mb-1.5 block text-sm font-semibold text-card-foreground">Full Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                id="user-full-name"
                placeholder="John Doe"
                className="mbg-filter-control h-11 w-full rounded-xl border border-border bg-surface-elevated px-4 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label htmlFor="user-email" className="mb-1.5 block text-sm font-semibold text-card-foreground">Email</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                id="user-email"
                placeholder="john@company.com"
                className="mbg-filter-control h-11 w-full rounded-xl border border-border bg-surface-elevated px-4 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label htmlFor="user-phone" className="mb-1.5 block text-sm font-semibold text-card-foreground">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                id="user-phone"
                placeholder="+91 98765 43210"
                className="mbg-filter-control h-11 w-full rounded-xl border border-border bg-surface-elevated px-4 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label htmlFor="user-role" className="mb-1.5 block text-sm font-semibold text-card-foreground">Role</label>
              <Select
                id="user-role"
                value={form.role}
                onChange={(e) => setField("role", e.target.value)}
                className="mbg-filter-control h-11 w-full rounded-xl border border-border bg-surface-elevated px-4 text-sm font-medium text-foreground outline-none"
              >
                {allowedRoles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label} - {r.description}
                  </option>
                ))}
              </Select>
            </div>
            {form.role === "HR" ? (
              <div>
                <label htmlFor="user-department" className="mb-1.5 block text-sm font-semibold text-card-foreground">Department</label>
                <Select
                  id="user-department"
                  required
                  value={form.departmentId ?? ""}
                  onChange={(e) => setField("departmentId", e.target.value ? Number(e.target.value) : undefined)}
                  className="mbg-filter-control h-11 w-full rounded-xl border border-border bg-surface-elevated px-4 text-sm font-medium text-foreground outline-none"
                >
                  <option value="" disabled>Select department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <label htmlFor="user-password" className="mb-1.5 block text-sm font-semibold text-card-foreground">Password</label>
              <div className="relative">
                <input
                  id="user-password"
                  required
                  type={passwordVisibility.showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => {
                    setField("password", e.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  placeholder="Min 8 characters"
                  minLength={8}
                  className="mbg-filter-control h-11 w-full rounded-xl border border-border bg-surface-elevated px-4 pr-12 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility("showPassword")}
                  aria-label={passwordVisibility.showPassword ? "Hide password" : "Show password"}
                  title={passwordVisibility.showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {passwordVisibility.showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="user-confirm-password" className="mb-1.5 block text-sm font-semibold text-card-foreground">Confirm Password</label>
              <div className="relative">
                <input
                  id="user-confirm-password"
                  required
                  type={passwordVisibility.showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  placeholder="Re-enter password"
                  minLength={8}
                  className="mbg-filter-control h-11 w-full rounded-xl border border-border bg-surface-elevated px-4 pr-12 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility("showConfirmPassword")}
                  aria-label={passwordVisibility.showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  title={passwordVisibility.showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {passwordVisibility.showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordError ? (
                <p className="mt-1 text-sm font-medium text-danger">{passwordError}</p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  {confirmPassword && form.password && confirmPassword === form.password
                    ? "Passwords match."
                    : ""}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setForm(initialForm)}
              className="cursor-pointer rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-card-foreground transition hover:bg-muted"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mutation.isPending ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <UserPlus size={16} />
              )}
              Create User
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
