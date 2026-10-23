import { useEffect, useMemo, useState } from "react";

import { Loader2, Save, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useMyProfile, useUpdateMyProfile } from "@features/auth";
import type { UpdateProfileInput } from "@features/auth";
import { useToast } from "@shared/components/feedback";
import { Card, ErrorDisplay, PageHeader, Skeleton } from "@shared/components/ui";
import { ROUTES } from "@shared/constants";
import { getApiErrorMessage } from "@shared/lib";

import { Button } from "@hrm/components/ui/button";
import { Input } from "@hrm/components/ui/input";
import { cn } from "@hrm/lib/utils";

function formatRole(role: string): string {
  if (role === "SUB_HR") return "Sub HR";
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

interface ProfileForm {
  name: string;
  email: string;
  phone: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function UpdateProfilePage() {
  const navigate = useNavigate();
  const toast = useToast();

  const { data: profile, isLoading, isError, error, refetch } = useMyProfile();
  const updateProfile = useUpdateMyProfile();

  const initialValues = useMemo<ProfileForm>(
    () => ({
      name: profile?.name ?? "",
      email: profile?.email ?? "",
      phone: profile?.phone ?? "",
    }),
    [profile?.email, profile?.name, profile?.phone],
  );

  const [form, setForm] = useState<ProfileForm>(initialValues);
  const [touched, setTouched] = useState<Partial<Record<keyof ProfileForm, boolean>>>({});

  useEffect(() => {
    if (!isLoading) {
      setForm(initialValues);
      setTouched({});
    }
  }, [initialValues, isLoading]);

  const fieldErrors = useMemo(
    () => ({
      name: !form.name.trim() ? "Name is required" : "",
      email: !form.email.trim()
        ? "Email is required"
        : !EMAIL_PATTERN.test(form.email.trim())
          ? "Enter a valid email address"
          : "",
      phone: form.phone.trim() && !/^[0-9+\-\s()]{7,20}$/.test(form.phone.trim()) ? "Enter a valid phone number" : "",
    }),
    [form.email, form.name, form.phone],
  );

  const hasErrors = Boolean(fieldErrors.name || fieldErrors.email || fieldErrors.phone);

  const isSaving = updateProfile.isPending;

  function handleChange(field: keyof ProfileForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleBlur(field: keyof ProfileForm) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ name: true, email: true, phone: true });
    if (hasErrors) return;

    const input: UpdateProfileInput = {
      name: form.name.trim(),
      email: form.email.trim(),
    };
    if (form.phone.trim()) {
      input.phone = form.phone.trim();
    }

    updateProfile.mutate(input, {
        onSuccess: (saved) => {
          toast.success("Profile updated", "Your profile changes have been saved.");
          setForm({
            name: saved.name,
            email: saved.email,
            phone: saved.phone ?? "",
          });
          setTouched({});
        },
        onError: (error) => {
          toast.error("Couldn't update profile", getApiErrorMessage(error));
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          title="Update Profile"
          description="Review and update your personal account details."
        />
        <Card padding="lg">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          title="Update Profile"
          description="Review and update your personal account details."
        />
        <Card padding="lg">
          <ErrorDisplay message={getApiErrorMessage(error)} />
          <div className="mt-4 flex justify-end">
            <Button type="button" variant="outline" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Update Profile"
        description="Review and update your personal account details."
        actions={
          <Button type="button" variant="outline" onClick={() => void navigate(ROUTES.dashboard)}>
            Back to Dashboard
          </Button>
        }
      />

      <Card padding="lg">
        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <div className="flex items-center gap-4 border-b border-border pb-5">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-primary text-lg font-extrabold text-white shadow">
              {profile.name
                .split(/\s+/)
                .filter(Boolean)
                .map((part) => part[0])
                .join("")
                .toUpperCase()
                .slice(0, 2) || "?"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-card-foreground">{profile.name}</p>
              <p className="truncate text-sm text-muted-foreground">{formatRole(profile.role)}</p>
              {profile.departmentName ? (
                <p className="truncate text-xs text-muted-foreground">{profile.departmentName}</p>
              ) : null}
            </div>
            <span className="ml-auto hidden rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
              {profile.employeeCode}
            </span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label htmlFor="profile-name" className="space-y-2">
              <span className="text-sm font-semibold text-card-foreground">Name</span>
              <Input
                id="profile-name"
                value={form.name}
                onChange={(event) => handleChange("name", event.target.value)}
                onBlur={() => handleBlur("name")}
                placeholder="Enter your name"
                aria-invalid={Boolean(touched.name && fieldErrors.name)}
              />
              {touched.name && fieldErrors.name ? (
                <span className="text-xs font-medium text-danger">{fieldErrors.name}</span>
              ) : null}
            </label>

            <label htmlFor="profile-email" className="space-y-2">
              <span className="text-sm font-semibold text-card-foreground">Email</span>
              <Input
                id="profile-email"
                type="email"
                value={form.email}
                onChange={(event) => handleChange("email", event.target.value)}
                onBlur={() => handleBlur("email")}
                placeholder="Enter your email"
                aria-invalid={Boolean(touched.email && fieldErrors.email)}
              />
              {touched.email && fieldErrors.email ? (
                <span className="text-xs font-medium text-danger">{fieldErrors.email}</span>
              ) : null}
            </label>

            <label htmlFor="profile-phone" className="space-y-2">
              <span className="text-sm font-semibold text-card-foreground">Phone</span>
              <Input
                id="profile-phone"
                value={form.phone}
                onChange={(event) => handleChange("phone", event.target.value)}
                onBlur={() => handleBlur("phone")}
                placeholder="Enter phone number"
                aria-invalid={Boolean(touched.phone && fieldErrors.phone)}
              />
              {touched.phone && fieldErrors.phone ? (
                <span className="text-xs font-medium text-danger">{fieldErrors.phone}</span>
              ) : null}
            </label>

            <label htmlFor="profile-role" className="space-y-2">
              <span className="text-sm font-semibold text-card-foreground">Role</span>
              <Input id="profile-role" value={formatRole(profile.role)} disabled />
            </label>
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setForm(initialValues);
                setTouched({});
              }}
            >
              Reset
            </Button>
            <Button type="submit" disabled={isSaving || hasErrors}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isSaving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>

      <Card padding="md" className={cn("border-info-soft bg-info-soft/40")}>
        <div className="flex gap-3 text-sm text-card-foreground">
          <User size={18} className="mt-0.5 shrink-0 text-info" />
          <p>
            You can update your name, email, and phone here. Role, employee code, department, and
            manager details are managed by HR.
          </p>
        </div>
      </Card>
    </div>
  );
}
