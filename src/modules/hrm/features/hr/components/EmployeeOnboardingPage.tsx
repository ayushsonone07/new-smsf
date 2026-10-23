import { useEffect, useMemo, useRef, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Clipboard,
  Download,
  Eye,
  FileUp,
  Key,
  Loader2,
  Mail,
  Pencil,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";

import { useToast } from "@shared/components/feedback";
import { DatePicker, Dialog } from "@shared/components/ui";
import { getApiErrorMessage } from "@shared/lib";

import { hrService } from "../services";
import {
  formatFileSize,
  MAX_ONBOARDING_FILE_SIZE,
  validateOnboardingForm,
  VALID_BLOOD_GROUPS,
} from "../utils/onboardingValidation";

import { OnboardingStatusBadge } from "./OnboardingStatusBadge";

import type { EmployeeOnboardingView, ManualOnboardingInput } from "../types";

interface OnboardingBackState {
  from?: string;
  label?: string;
}

export function EmployeeOnboardingPage() {
  const params = useParams();
  const location = useLocation();
  const employeeId = Number(params.employeeId);
  const toast = useToast();
  const qc = useQueryClient();
  const [lastExpiry, setLastExpiry] = useState<string | null>(null);
  const [lastFormUrl, setLastFormUrl] = useState<string | null>(null);
  const backState = location.state as OnboardingBackState | null;
  const backTo = backState?.from || "/hrm/employees";
  const backLabel = backState?.label || "Back to employees";

  const queryKey = useMemo(() => ["hr", "employee-onboarding", employeeId], [employeeId]);
  const onboarding = useQuery({
    queryKey,
    queryFn: () => hrService.getEmployeeOnboarding(employeeId),
    enabled: Number.isFinite(employeeId) && employeeId > 0,
  });

  const linkMutation = useMutation({
    mutationFn: () => hrService.generateOnboardingLink(employeeId),
    onSuccess: async (response) => {
      setLastExpiry(response.expiresAt);
      setLastFormUrl(response.formUrl);
      await qc.invalidateQueries({ queryKey });
      toast.success("Onboarding form sent", `Expires ${formatDateTime(response.expiresAt)}.`);
    },
    onError: (err) => toast.error("Couldn't send onboarding form", getApiErrorMessage(err)),
  });

  const verifyMutation = useMutation({
    mutationFn: () => hrService.verifyOnboarding(employeeId),
    onSuccess: async (message) => {
      await qc.invalidateQueries({ queryKey });
      toast.success(message || "Onboarding verified");
    },
    onError: (err) => toast.error("Couldn't verify onboarding", getApiErrorMessage(err)),
  });

  const resendPasswordSetupMutation = useMutation({
    mutationFn: () => hrService.resendPasswordSetupLink(employeeId),
    onSuccess: async (response) => {
      await qc.invalidateQueries({ queryKey });
      toast.success(
        "Password setup link resent",
        `New setup link sent. URL: ${response.setupUrl}`
      );
      if (response.setupUrl) {
        await navigator.clipboard.writeText(response.setupUrl);
        toast.info("Setup link copied to clipboard");
      }
    },
    onError: (err) => toast.error("Couldn't resend password setup link", getApiErrorMessage(err)),
  });

  const view = onboarding.data;

  return (
    <>
      <div className="mx-auto max-w-6xl space-y-5">
        <Link
          to={backTo}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-card-foreground"
        >
          <ArrowLeft size={16} />
          {backLabel}
        </Link>

        {onboarding.isLoading ? (
          <LoadingState />
        ) : onboarding.error ? (
          <ErrorState message={getApiErrorMessage(onboarding.error)} />
        ) : view ? (
          <>
            <Header view={view} />
            <ActionPanel
              view={view}
              lastExpiry={lastExpiry}
              lastFormUrl={lastFormUrl}
              isSending={linkMutation.isPending}
              isVerifying={verifyMutation.isPending}
              isResendingPasswordSetup={resendPasswordSetupMutation.isPending}
              onCopyLink={() => {
                if (!lastFormUrl) return;
                void navigator.clipboard.writeText(lastFormUrl).then(
                  () => toast.success("Link copied"),
                  () => toast.error("Copy failed", "Select and copy the link manually."),
                );
              }}
              onSend={() => linkMutation.mutate()}
              onResend={() => {
                if (
                  window.confirm("Resend the onboarding link? The old link will stop being useful.")
                ) {
                  linkMutation.mutate();
                }
              }}
              onVerify={() => {
                if (window.confirm("Verify and complete onboarding for this employee?")) {
                  verifyMutation.mutate();
                }
              }}
              onResendPasswordSetup={() => {
                if (
                  window.confirm(
                    "Resend the password setup link? The old link will stop being useful."
                  )
                ) {
                  resendPasswordSetupMutation.mutate();
                }
              }}
            />
            <ReviewGrid view={view} />
          </>
        ) : null}
      </div>
    </>
  );
}

function Header({ view }: { view: EmployeeOnboardingView }) {
  return (
    <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{view.employeeCode}</p>
        <h1 className="text-2xl font-semibold text-card-foreground">{view.employeeName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{view.email}</p>
      </div>
      <OnboardingStatusBadge status={view.onboardingStatus} />
    </header>
  );
}

function ActionPanel({
  view,
  lastExpiry,
  lastFormUrl,
  isSending,
  isVerifying,
  isResendingPasswordSetup,
  onCopyLink,
  onSend,
  onResend,
  onVerify,
  onResendPasswordSetup,
}: {
  view: EmployeeOnboardingView;
  lastExpiry: string | null;
  lastFormUrl: string | null;
  isSending: boolean;
  isVerifying: boolean;
  isResendingPasswordSetup: boolean;
  onCopyLink: () => void;
  onSend: () => void;
  onResend: () => void;
  onVerify: () => void;
  onResendPasswordSetup: () => void;
}) {
  if (view.onboardingStatus === "PENDING") {
    return (
      <ActionShell>
        <p className="text-sm text-muted-foreground">Onboarding form not sent yet.</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <PrimaryAction
            icon={<Mail size={15} />}
            label="Send Onboarding Form"
            loading={isSending}
            onClick={onSend}
          />
          <PrimaryAction
            icon={<Key size={15} />}
            label="Resend Password Setup Link"
            loading={isResendingPasswordSetup}
            onClick={onResendPasswordSetup}
            variant="secondary"
          />
        </div>
        <GeneratedLink url={lastFormUrl} onCopy={onCopyLink} />
      </ActionShell>
    );
  }

  if (view.onboardingStatus === "LINK_SENT") {
    return (
      <ActionShell tone="amber">
        <p className="text-sm text-warning">
          Waiting for candidate to submit their details.
          {lastExpiry ? ` Expires ${formatDateTime(lastExpiry)}.` : ""}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <PrimaryAction
            icon={<RefreshCw size={15} />}
            label="Resend Onboarding Link"
            loading={isSending}
            onClick={onResend}
          />
          <PrimaryAction
            icon={<Key size={15} />}
            label="Resend Password Setup Link"
            loading={isResendingPasswordSetup}
            onClick={onResendPasswordSetup}
            variant="secondary"
          />
        </div>
        <GeneratedLink url={lastFormUrl} onCopy={onCopyLink} />
      </ActionShell>
    );
  }

  if (view.onboardingStatus === "DETAILS_SUBMITTED") {
    return (
      <section className="flex flex-col gap-3 rounded-xl border border-info/30 bg-info-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-info">Candidate details are ready for HR review.</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <PrimaryAction
            icon={<CheckCircle2 size={15} />}
            label="Verify & Complete Onboarding"
            loading={isVerifying}
            onClick={onVerify}
          />
          <PrimaryAction
            icon={<Key size={15} />}
            label="Resend Password Setup Link"
            loading={isResendingPasswordSetup}
            onClick={onResendPasswordSetup}
            variant="secondary"
          />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-success/30 bg-success-soft px-5 py-4 text-sm text-success">
      Onboarding is verified.
    </section>
  );
}

function ActionShell({
  children,
  tone = "white",
}: {
  children: React.ReactNode;
  tone?: "white" | "amber" | undefined;
}) {
  const classes =
    tone === "amber" ? "border-warning/30 bg-warning-soft" : "border-border bg-card shadow";
  return (
    <section className={`space-y-3 rounded-xl border px-5 py-4 ${classes}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {children}
      </div>
    </section>
  );
}

function GeneratedLink({ url, onCopy }: { url: string | null; onCopy: () => void }) {
  if (!url) return null;
  return (
    <div className="basis-full rounded-lg border border-border bg-card px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Generated form link
      </p>
      <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          readOnly
          value={url}
          className="min-w-0 flex-1 rounded-md border border-border bg-surface-muted px-2 py-1.5 text-xs text-card-foreground"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-card-foreground hover:bg-surface-hover"
        >
          <Clipboard size={13} />
          Copy
        </button>
      </div>
    </div>
  );
}

function ReviewGrid({ view }: { view: EmployeeOnboardingView }) {
  const [editing, setEditing] = useState(false);
  const toast = useToast();
  const qc = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (input: ManualOnboardingInput) =>
      hrService.saveManualOnboarding(view.employeeId, input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["hr", "employee-onboarding", view.employeeId] });
      setEditing(false);
      toast.success("Onboarding saved", "Manual details and uploaded files were updated.");
    },
    onError: (err) => toast.error("Couldn't save onboarding", getApiErrorMessage(err)),
  });

  if (editing) {
    return (
      <div className="space-y-5">
        <section className="rounded-xl border border-primary/30 bg-card shadow lg:col-span-2">
          <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold text-card-foreground">Manual onboarding entry</h2>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-card-foreground hover:bg-surface-hover"
            >
              <X size={14} />
              Close
            </button>
          </header>
          <ManualOnboardingForm
            view={view}
            saving={saveMutation.isPending}
            onCancel={() => setEditing(false)}
            onSave={(input) => saveMutation.mutate(input)}
          />
        </section>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr_0.7fr]">
      <section className="rounded-xl border border-border bg-card shadow">
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-card-foreground">Submitted details</h2>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary-soft px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary-soft/80"
          >
            <Pencil size={14} />
            Edit / Upload
          </button>
        </header>
        <dl className="grid grid-cols-1 gap-x-5 gap-y-4 px-5 py-5 sm:grid-cols-2">
          <Detail label="Date of birth" value={view.dateOfBirth} />
          <Detail label="Gender" value={view.gender} />
          <Detail label="Blood group" value={view.bloodGroup} optional />
          <Detail label="Guardian name" value={view.guardianName} />
          <Detail label="Guardian relation" value={view.guardianRelation} />
          <Detail label="Guardian number" value={view.guardianNumber} />
          <Detail label="PAN number" value={view.panNumber} optional />
          <Detail label="Aadhaar number" value={view.aadhaarNumber} />
          <Detail label="Bank account number" value={view.bankAccountNumber} />
          <Detail label="Bank IFSC" value={view.bankIfsc} />
          <Detail label="Bank name" value={view.bankName} />
          <Detail label="Vehicle number" value={view.vehicleNumber} optional />
          <Detail label="Vehicle brand" value={view.vehicleBrand} optional />
          <Detail label="Address" value={view.address} wide />
        </dl>
      </section>

      <section className="rounded-xl border border-border bg-card shadow">
        <header className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-card-foreground">Documents</h2>
        </header>
        <div className="space-y-2 px-5 py-5">
          <DocumentLink label="Updated resume" url={view.resumeUrl} required />
          <DocumentLink label="Aadhaar card" url={view.aadhaarCardUrl} required />
          <DocumentLink label="PAN card" url={view.panCardUrl} />
          <DocumentLink label="Bank passbook" url={view.bankPassbookUrl} required />
          <DocumentLink label="Passport photo" url={view.passportPhotoUrl} required />
          <DocumentLink label="10th marksheet" url={view.marksheet10Url} required />
          <DocumentLink label="12th marksheet" url={view.marksheet12Url} required />
          <DocumentLink label="Graduation certificate" url={view.marksheetGraduationUrl} />
          <DocumentLink label="Experience letter" url={view.experienceLetterUrl} />
        </div>
      </section>
    </div>
  );
}

function ManualOnboardingForm({
  view,
  saving,
  onCancel,
  onSave,
}: {
  view: EmployeeOnboardingView;
  saving: boolean;
  onCancel: () => void;
  onSave: (input: ManualOnboardingInput) => void;
}) {
  const [values, setValues] = useState<ManualOnboardingInput>(() => manualInitialValues(view));
  const [touched, setTouched] = useState<Partial<Record<keyof ManualOnboardingInput, boolean>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const existingUrls = useMemo<Partial<Record<keyof ManualOnboardingInput, string | null>>>(
    () => ({
      resume: view.resumeUrl,
      aadhaarCard: view.aadhaarCardUrl,
      panCard: view.panCardUrl,
      experienceLetter: view.experienceLetterUrl,
      bankPassbook: view.bankPassbookUrl,
      passportPhoto: view.passportPhotoUrl,
      marksheet10: view.marksheet10Url,
      marksheet12: view.marksheet12Url,
      marksheetGraduation: view.marksheetGraduationUrl,
    }),
    [view]
  );

  const errors = useMemo(() => {
    return validateOnboardingForm(values, { existingUrls });
  }, [values, existingUrls]);

  const markTouched = (key: keyof ManualOnboardingInput) => {
    setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  };

  function update<K extends keyof ManualOnboardingInput>(key: K, value: ManualOnboardingInput[K]) {
    let finalValue = value;
    if (typeof value === "string") {
      if (key === "aadhaarNumber") {
        finalValue = value.replace(/\D/g, "").slice(0, 12) as ManualOnboardingInput[K];
      } else if (key === "panNumber") {
        finalValue = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) as ManualOnboardingInput[K];
      } else if (key === "guardianNumber") {
        finalValue = value.replace(/\D/g, "").slice(0, 10) as ManualOnboardingInput[K];
      } else if (key === "bankAccountNumber") {
        finalValue = value.replace(/\D/g, "").slice(0, 18) as ManualOnboardingInput[K];
      } else if (key === "bankIfsc") {
        finalValue = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11) as ManualOnboardingInput[K];
      } else if (key === "vehicleNumber") {
        finalValue = value.toUpperCase().replace(/[^A-Z0-9\s-]/g, "").slice(0, 15) as ManualOnboardingInput[K];
      }
    }
    setValues((current) => ({ ...current, [key]: finalValue }));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const currentErrors = validateOnboardingForm(values, { existingUrls });
    const errorKeys = Object.keys(currentErrors) as (keyof ManualOnboardingInput)[];

    if (errorKeys.length > 0) {
      const allTouched: Partial<Record<keyof ManualOnboardingInput, boolean>> = {};
      for (const k of errorKeys) {
        allTouched[k] = true;
      }
      setTouched((prev) => ({ ...prev, ...allTouched }));

      const firstKey = errorKeys[0];
      const firstMsg = currentErrors[firstKey];
      setSubmitError(
        `Please correct the highlighted fields (${errorKeys.length} issue${
          errorKeys.length > 1 ? "s" : ""
        } found): ${firstMsg}`
      );

      const el = document.getElementById(`manual-field-${firstKey}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const focusable = el.querySelector<HTMLElement>("input, select, textarea, button");
        if (focusable) {
          focusable.focus();
        }
      }
      return;
    }

    onSave(values);
  };

  return (
    <form className="space-y-5 px-5 py-5" onSubmit={handleSubmit} noValidate>
      {submitError ? (
        <div className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-xs font-medium text-danger">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-danger" />
          <span>{submitError}</span>
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ManualField
          id="dateOfBirth"
          label="Date of birth"
          type="date"
          value={values.dateOfBirth}
          onChange={(v) => {
            update("dateOfBirth", v);
            markTouched("dateOfBirth");
          }}
          onBlur={() => markTouched("dateOfBirth")}
          error={touched.dateOfBirth ? errors.dateOfBirth : undefined}
          required
        />
        <ManualSelect
          id="gender"
          label="Gender"
          value={values.gender}
          onChange={(v) => {
            update("gender", v);
            markTouched("gender");
          }}
          onBlur={() => markTouched("gender")}
          error={touched.gender ? errors.gender : undefined}
          options={[
            { label: "Male", value: "male" },
            { label: "Female", value: "female" },
            { label: "Other", value: "other" },
          ]}
          placeholder="Select gender"
          required
        />
        <ManualSelect
          id="bloodGroup"
          label="Blood group"
          value={values.bloodGroup}
          onChange={(v) => {
            update("bloodGroup", v);
            markTouched("bloodGroup");
          }}
          onBlur={() => markTouched("bloodGroup")}
          error={touched.bloodGroup ? errors.bloodGroup : undefined}
          options={VALID_BLOOD_GROUPS.map((bg) => ({ label: bg, value: bg }))}
          placeholder="Select blood group (optional)"
        />
        <ManualField
          id="guardianName"
          label="Guardian name"
          value={values.guardianName}
          onChange={(v) => update("guardianName", v)}
          onBlur={() => markTouched("guardianName")}
          error={touched.guardianName ? errors.guardianName : undefined}
          placeholder="Father/Mother/Spouse full name"
          required
        />
        <ManualField
          id="guardianRelation"
          label="Guardian relation"
          value={values.guardianRelation}
          onChange={(v) => update("guardianRelation", v)}
          onBlur={() => markTouched("guardianRelation")}
          error={touched.guardianRelation ? errors.guardianRelation : undefined}
          placeholder="e.g. Father, Mother, Spouse"
          required
        />
        <ManualField
          id="guardianNumber"
          label="Guardian mobile number"
          value={values.guardianNumber}
          onChange={(v) => update("guardianNumber", v)}
          onBlur={() => markTouched("guardianNumber")}
          error={touched.guardianNumber ? errors.guardianNumber : undefined}
          placeholder="10-digit mobile number"
          maxLength={10}
          required
        />
        <ManualField
          id="panNumber"
          label="PAN number"
          value={values.panNumber}
          onChange={(v) => update("panNumber", v)}
          onBlur={() => markTouched("panNumber")}
          error={touched.panNumber ? errors.panNumber : undefined}
          placeholder="ABCDE1234F (optional)"
          maxLength={10}
        />
        <ManualField
          id="aadhaarNumber"
          label="Aadhaar number"
          value={values.aadhaarNumber}
          onChange={(v) => update("aadhaarNumber", v)}
          onBlur={() => markTouched("aadhaarNumber")}
          error={touched.aadhaarNumber ? errors.aadhaarNumber : undefined}
          placeholder="12-digit Aadhaar number"
          maxLength={12}
          required
        />
        <ManualField
          id="bankAccountNumber"
          label="Bank account number"
          value={values.bankAccountNumber}
          onChange={(v) => update("bankAccountNumber", v)}
          onBlur={() => markTouched("bankAccountNumber")}
          error={touched.bankAccountNumber ? errors.bankAccountNumber : undefined}
          placeholder="9 to 18 digits"
          maxLength={18}
          required
        />
        <ManualField
          id="bankIfsc"
          label="Bank IFSC"
          value={values.bankIfsc}
          onChange={(v) => update("bankIfsc", v)}
          onBlur={() => markTouched("bankIfsc")}
          error={touched.bankIfsc ? errors.bankIfsc : undefined}
          placeholder="e.g. SBIN0001234"
          maxLength={11}
          required
        />
        <ManualField
          id="bankName"
          label="Bank name"
          value={values.bankName}
          onChange={(v) => update("bankName", v)}
          onBlur={() => markTouched("bankName")}
          error={touched.bankName ? errors.bankName : undefined}
          placeholder="e.g. State Bank of India"
          required
        />
        <ManualField
          id="vehicleNumber"
          label="Vehicle number"
          value={values.vehicleNumber}
          onChange={(v) => update("vehicleNumber", v)}
          onBlur={() => markTouched("vehicleNumber")}
          error={touched.vehicleNumber ? errors.vehicleNumber : undefined}
          placeholder="e.g. DL01AB1234 (optional)"
        />
        <ManualField
          id="vehicleBrand"
          label="Vehicle brand"
          value={values.vehicleBrand}
          onChange={(v) => update("vehicleBrand", v)}
          onBlur={() => markTouched("vehicleBrand")}
          error={touched.vehicleBrand ? errors.vehicleBrand : undefined}
          placeholder="e.g. Honda Activa (optional)"
        />
        <ManualTextarea
          id="address"
          label="Residential address"
          value={values.address}
          onChange={(v) => update("address", v)}
          onBlur={() => markTouched("address")}
          error={touched.address ? errors.address : undefined}
          placeholder="Complete address with pincode"
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <ManualFile
          id="resume"
          label="Updated resume"
          currentUrl={view.resumeUrl}
          file={values.resume}
          onChange={(f) => {
            update("resume", f);
            markTouched("resume");
          }}
          error={touched.resume ? errors.resume : undefined}
          required
        />
        <ManualFile
          id="aadhaarCard"
          label="Aadhaar card"
          currentUrl={view.aadhaarCardUrl}
          file={values.aadhaarCard}
          onChange={(f) => {
            update("aadhaarCard", f);
            markTouched("aadhaarCard");
          }}
          error={touched.aadhaarCard ? errors.aadhaarCard : undefined}
          required
        />
        <ManualFile
          id="panCard"
          label="PAN card"
          currentUrl={view.panCardUrl}
          file={values.panCard}
          onChange={(f) => {
            update("panCard", f);
            markTouched("panCard");
          }}
          error={touched.panCard ? errors.panCard : undefined}
        />
        <ManualFile
          id="bankPassbook"
          label="Bank passbook"
          currentUrl={view.bankPassbookUrl}
          file={values.bankPassbook}
          onChange={(f) => {
            update("bankPassbook", f);
            markTouched("bankPassbook");
          }}
          error={touched.bankPassbook ? errors.bankPassbook : undefined}
          required
        />
        <ManualFile
          id="passportPhoto"
          label="Passport photo"
          currentUrl={view.passportPhotoUrl}
          file={values.passportPhoto}
          onChange={(f) => {
            update("passportPhoto", f);
            markTouched("passportPhoto");
          }}
          error={touched.passportPhoto ? errors.passportPhoto : undefined}
          accept=".jpg,.jpeg,.png,.webp"
          required
        />
        <ManualFile
          id="marksheet10"
          label="10th marksheet"
          currentUrl={view.marksheet10Url}
          file={values.marksheet10}
          onChange={(f) => {
            update("marksheet10", f);
            markTouched("marksheet10");
          }}
          error={touched.marksheet10 ? errors.marksheet10 : undefined}
          required
        />
        <ManualFile
          id="marksheet12"
          label="12th marksheet"
          currentUrl={view.marksheet12Url}
          file={values.marksheet12}
          onChange={(f) => {
            update("marksheet12", f);
            markTouched("marksheet12");
          }}
          error={touched.marksheet12 ? errors.marksheet12 : undefined}
          required
        />
        <ManualFile
          id="marksheetGraduation"
          label="Graduation certificate"
          currentUrl={view.marksheetGraduationUrl}
          file={values.marksheetGraduation}
          onChange={(f) => {
            update("marksheetGraduation", f);
            markTouched("marksheetGraduation");
          }}
          error={touched.marksheetGraduation ? errors.marksheetGraduation : undefined}
        />
        <ManualFile
          id="experienceLetter"
          label="Experience letter"
          currentUrl={view.experienceLetterUrl}
          file={values.experienceLetter}
          onChange={(f) => {
            update("experienceLetter", f);
            markTouched("experienceLetter");
          }}
          error={touched.experienceLetter ? errors.experienceLetter : undefined}
        />
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-card-foreground hover:bg-surface-hover"
        >
          <X size={15} />
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Save onboarding
        </button>
      </div>
    </form>
  );
}

function ManualField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  type = "text",
  required,
  placeholder,
  maxLength,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  type?: string;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div id={id ? `manual-field-${id}` : undefined} className="space-y-1">
      <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </label>
      {type === "date" ? (
        <DatePicker
          id={id}
          value={value}
          onChange={onChange}
          required={required}
          ariaLabel={`Choose ${label.toLowerCase()}`}
          className="mt-1"
          buttonClassName={`rounded-lg px-3 text-slate-900 transition-colors ${
            error
              ? "border-red-500 bg-red-50/20 ring-1 ring-red-500"
              : "border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          }`}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm normal-case tracking-normal text-slate-900 transition-colors focus:outline-none focus:ring-1 ${
            error
              ? "border-red-500 bg-red-50/20 focus:border-red-500 focus:ring-red-500"
              : "border-slate-300 bg-white focus:border-indigo-500 focus:ring-indigo-500"
          }`}
        />
      )}
      {error ? (
        <p className="flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
          <AlertCircle size={13} className="shrink-0 text-red-500" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

function ManualTextarea({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  required,
  placeholder,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div
      id={id ? `manual-field-${id}` : undefined}
      className="space-y-1 md:col-span-2 lg:col-span-3"
    >
      <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </label>
      <textarea
        id={id}
        value={value}
        rows={3}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm normal-case tracking-normal text-card-foreground transition-colors focus:outline-none focus:ring-1 ${
          error
            ? "border-red-500 bg-red-50/20 focus:border-red-500 focus:ring-red-500"
            : "border-border bg-card focus:border-primary focus:ring-primary"
        }`}
      />
      {error ? (
        <p className="flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
          <AlertCircle size={13} className="shrink-0 text-red-500" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

function ManualSelect({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  required,
  options,
  placeholder = "Select an option",
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  required?: boolean;
  options: { label: string; value: string }[];
  placeholder?: string;
}) {
  return (
    <div id={id ? `manual-field-${id}` : undefined} className="space-y-1">
      <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm normal-case tracking-normal text-card-foreground transition-colors focus:outline-none focus:ring-1 ${
          error
            ? "border-red-500 bg-red-50/20 focus:border-red-500 focus:ring-red-500"
            : "border-border bg-card focus:border-primary focus:ring-primary"
        }`}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
          <AlertCircle size={13} className="shrink-0 text-red-500" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

function ManualFile({
  id,
  label,
  currentUrl,
  file,
  onChange,
  error,
  required,
  accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp",
}: {
  id?: string;
  label: string;
  currentUrl: string | null;
  file: File | null;
  onChange: (file: File | null) => void;
  error?: string | null;
  required?: boolean;
  accept?: string;
}) {
  const [internalError, setInternalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const displayError = error || internalError;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    if (!selected) {
      return;
    }

    if (selected.size > MAX_ONBOARDING_FILE_SIZE) {
      const msg = `This file is ${formatFileSize(selected.size)}, which is larger than the 1 MB limit. Please upload a file under 1 MB.`;
      setInternalError(msg);
      e.target.value = "";
      onChange(null);
      return;
    }

    const parts = selected.name.split(".");
    const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : "";
    const allowed = accept.split(",").map((s) => s.trim().replace(/^\./, "").toLowerCase());
    if (allowed.length > 0 && !allowed.includes(ext)) {
      const msg = `Invalid file type (.${ext}). Allowed types: ${allowed.join(", ")}`;
      setInternalError(msg);
      e.target.value = "";
      onChange(null);
      return;
    }

    setInternalError(null);
    onChange(selected);
  };

  return (
    <div
      id={id ? `manual-field-${id}` : undefined}
      className={`rounded-lg border p-3 text-xs font-medium transition-all ${
        displayError
          ? "border-red-500 bg-red-50/80 ring-2 ring-red-500/30 dark:bg-red-950/20"
          : file
            ? "border-emerald-500/40 bg-emerald-50/5 text-card-foreground"
            : "border-border bg-card text-muted-foreground"
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="block truncate font-semibold text-card-foreground">
          {label}
          {required ? <span className="ml-1 text-danger">*</span> : null}
        </span>
        <span className="shrink-0 rounded bg-muted/80 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
          Max 1 MB
        </span>
      </div>

      {displayError ? (
        <div className="mt-2 flex items-start gap-1.5 rounded border border-red-300 bg-red-100/90 p-2 text-[11px] font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300">
          <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-600" />
          <span>{displayError}</span>
        </div>
      ) : file ? (
        <div className="mt-1 flex items-center justify-between gap-1">
          <span className="truncate text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            ✓ {file.name} ({formatFileSize(file.size)})
          </span>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setInternalError(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="ml-2 shrink-0 text-[10px] text-muted-foreground underline hover:text-red-500"
          >
            Remove
          </button>
        </div>
      ) : (
        <span
          className={`mt-1 block text-[11px] ${
            currentUrl
              ? "text-success"
              : required
                ? "text-danger"
                : "text-muted-foreground"
          }`}
        >
          {currentUrl
            ? "Existing file will be kept"
            : required
              ? "Missing (Required under 1 MB)"
              : "Optional (Under 1 MB)"}
        </span>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="mt-2 block w-full cursor-pointer text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-card-foreground hover:file:bg-surface-hover"
      />
    </div>
  );
}

function Detail({
  label,
  value,
  optional,
  wide,
}: {
  label: string;
  value: string | null;
  optional?: boolean;
  wide?: boolean;
}) {
  const missing = !value || value.trim().length === 0;
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-card-foreground">
        {missing ? (
          <span className={optional ? "text-muted-foreground" : "font-medium text-danger"}>
            {optional ? "Optional - empty" : "Missing"}
          </span>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function DocumentLink({
  label,
  url,
  required,
}: {
  label: string;
  url: string | null;
  required?: boolean;
}) {
  const toast = useToast();
  const qc = useQueryClient();
  const [busyAction, setBusyAction] = useState<"view" | "download" | "delete" | null>(null);
  const [preview, setPreview] = useState<{ title: string; url: string; mime: string } | null>(null);
  const missing = !url;

  async function download() {
    if (!url) return;
    setBusyAction("download");
    try {
      const blob = await hrService.downloadOnboardingDocument(url);
      triggerBrowserDownload(blob, url.split("/").pop() ?? `${label}.pdf`);
    } catch (err) {
      toast.error("Download failed", getApiErrorMessage(err));
    } finally {
      setBusyAction(null);
    }
  }

  async function viewDocument() {
    if (!url) return;
    const fileName = url.split("/").pop() ?? `${label}.pdf`;

    setBusyAction("view");
    try {
      const blob = await hrService.downloadOnboardingDocument(url);
      const mime = mimeFromName(fileName);
      const typedBlob = new Blob([blob], { type: mime });
      setPreview((current) => {
        if (current) URL.revokeObjectURL(current.url);
        return { title: label, url: URL.createObjectURL(typedBlob), mime };
      });
    } catch (err) {
      toast.error("Preview failed", getApiErrorMessage(err));
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteDocument() {
    if (!url) return;
    if (!window.confirm(`Delete ${label}? This will remove the stored document.`)) return;

    setBusyAction("delete");
    try {
      const message = await hrService.deleteOnboardingDocument(url);
      await qc.invalidateQueries({ queryKey: ["hr", "employee-onboarding"] });
      toast.success(message || "Document deleted");
    } catch (err) {
      toast.error("Delete failed", getApiErrorMessage(err));
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-card-foreground">{label}</p>
          {missing ? (
            <p className={`text-xs ${required ? "text-danger" : "text-muted-foreground"}`}>
              {required ? "Missing" : "Optional - empty"}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <DocumentAction
            label="View"
            icon={<Eye size={14} />}
            loading={busyAction === "view"}
            disabled={missing || busyAction !== null}
            onClick={() => void viewDocument()}
          />
          <DocumentAction
            label="Download"
            icon={<Download size={14} />}
            loading={busyAction === "download"}
            disabled={missing || busyAction !== null}
            onClick={() => void download()}
          />
          <DocumentAction
            label="Delete"
            icon={<Trash2 size={14} />}
            loading={busyAction === "delete"}
            disabled={missing || busyAction !== null}
            tone="danger"
            onClick={() => void deleteDocument()}
          />
        </div>
      </div>
      <DocumentPreviewDialog
        preview={preview}
        onClose={() => {
          if (preview) URL.revokeObjectURL(preview.url);
          setPreview(null);
        }}
      />
    </>
  );
}

function DocumentPreviewDialog({
  preview,
  onClose,
}: {
  preview: { title: string; url: string; mime: string } | null;
  onClose: () => void;
}) {
  const canEmbed = preview
    ? preview.mime.startsWith("image/") || preview.mime === "application/pdf"
    : false;

  return (
    <Dialog
      open={preview !== null}
      onClose={onClose}
      title={preview?.title ?? "Document preview"}
      description={
        canEmbed ? "Preview opens inside HRM." : "This file type may need to be downloaded to view."
      }
      size="xl"
    >
      <div className="bg-surface-muted p-4">
        {preview && canEmbed ? (
          preview.mime.startsWith("image/") ? (
            <img
              src={preview.url}
              alt={preview.title}
              className="mx-auto max-h-[78vh] rounded-lg border border-border bg-card object-contain"
            />
          ) : (
            <iframe
              title={preview.title}
              src={preview.url}
              className="h-[78vh] w-full rounded-lg border border-border bg-card"
            />
          )
        ) : (
          <div className="rounded-lg border border-border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
            Preview is not available for this document type. Use Download to open it on your
            computer.
          </div>
        )}
      </div>
    </Dialog>
  );
}

function DocumentAction({
  label,
  icon,
  loading,
  disabled,
  tone = "default",
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  loading: boolean;
  disabled: boolean;
  tone?: "default" | "danger";
  onClick: () => void;
}) {
  const classes =
    tone === "danger"
      ? "border-danger/30 text-danger hover:bg-danger-soft"
      : "border-border text-card-foreground hover:bg-surface-hover";

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-lg border bg-card px-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-45 ${classes}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      <span className="hidden xl:inline">{label}</span>
    </button>
  );
}

function PrimaryAction({
  icon,
  label,
  loading,
  onClick,
  variant = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  loading: boolean;
  onClick: () => void;
  variant?: "primary" | "secondary";
}) {
  const primaryClasses =
    "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60";
  const secondaryClasses =
    "inline-flex items-center justify-center gap-2 rounded-lg bg-amber px-4 py-2 text-sm font-medium text-amber-foreground shadow hover:bg-amber-hover disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={variant === "secondary" ? secondaryClasses : primaryClasses}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : icon}
      {label}
    </button>
  );
}

function LoadingState() {
  return (
    <div className="grid min-h-[18rem] place-items-center rounded-xl border border-border bg-card">
      <Loader2 className="animate-spin text-muted-foreground" size={28} />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-danger/30 bg-danger-soft px-5 py-4 text-sm text-danger">
      {message}
    </div>
  );
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function mimeFromName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return "application/octet-stream";
  }
}

function manualInitialValues(view: EmployeeOnboardingView): ManualOnboardingInput {
  return {
    dateOfBirth: view.dateOfBirth ?? "",
    gender: view.gender?.toLowerCase() ?? "",
    bloodGroup: view.bloodGroup ?? "",
    guardianName: view.guardianName ?? "",
    guardianRelation: view.guardianRelation ?? "",
    guardianNumber: view.guardianNumber ?? "",
    address: view.address ?? "",
    vehicleNumber: view.vehicleNumber ?? "",
    vehicleBrand: view.vehicleBrand ?? "",
    panNumber: view.panNumber ?? "",
    aadhaarNumber: view.aadhaarNumber ?? "",
    bankAccountNumber: view.bankAccountNumber ?? "",
    bankIfsc: view.bankIfsc ?? "",
    bankName: view.bankName ?? "",
    resume: null,
    aadhaarCard: null,
    panCard: null,
    experienceLetter: null,
    bankPassbook: null,
    passportPhoto: null,
    marksheet10: null,
    marksheet12: null,
    marksheetGraduation: null,
  };
}
