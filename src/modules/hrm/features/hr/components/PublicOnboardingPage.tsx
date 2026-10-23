import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  FileUp,
  Loader2,
  RefreshCw,
  Send,
  X,
} from "lucide-react";
import { useParams } from "react-router-dom";

import { getApiErrorMessage } from "@shared/lib";
import { DatePicker } from "@shared/components/ui";

import { hrService } from "../services";
import {
  formatFileSize,
  MAX_ONBOARDING_FILE_SIZE,
  validateOnboardingForm,
  VALID_BLOOD_GROUPS,
} from "../utils/onboardingValidation";

import type { ManualOnboardingInput, PublicOnboardingForm } from "../types";

export function PublicOnboardingPage() {
  const { token = "" } = useParams();
  const [submitted, setSubmitted] = useState(false);

  const form = useQuery({
    queryKey: ["public-onboarding", token],
    queryFn: () => hrService.getPublicOnboardingForm(token),
    enabled: token.length > 0,
    retry: false,
  });

  const submit = useMutation({
    mutationFn: (input: ManualOnboardingInput) => hrService.submitPublicOnboarding(token, input),
    onSuccess: () => {
      clearDraft(token);
      clearFilesFromDB(token);
      setSubmitted(true);
    },
  });

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {form.isLoading ? (
          <CenteredState
            icon={<Loader2 className="animate-spin" size={28} />}
            title="Opening onboarding form"
          />
        ) : form.error ? (
          <CenteredState
            title="This onboarding link cannot be opened"
            message={getApiErrorMessage(form.error)}
          />
        ) : submitted ? (
          <CenteredState
            icon={<CheckCircle2 className="text-success" size={34} />}
            title="Onboarding submitted"
            message="Your details and documents have been sent to HR."
          />
        ) : form.data ? (
          <OnboardingForm
            token={token}
            profile={form.data}
            saving={submit.isPending}
            error={submit.error}
            onSubmit={(input) => submit.mutate(input)}
          />
        ) : null}
      </div>
    </main>
  );
}

function OnboardingForm({
  token,
  profile,
  saving,
  error,
  onSubmit,
}: {
  token: string;
  profile: PublicOnboardingForm;
  saving: boolean;
  error: unknown;
  onSubmit: (input: ManualOnboardingInput) => void;
}) {
  const initial = useMemo(() => {
    const empty = emptyValues();
    const saved = loadDraft(token);
    return { ...empty, ...saved };
  }, [token]);

  const [values, setValues] = useState<ManualOnboardingInput>(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof ManualOnboardingInput, boolean>>>({});
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const errors = useMemo(() => {
    return validateOnboardingForm(values);
  }, [values]);

  const markTouched = (key: keyof ManualOnboardingInput) => {
    setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  };

  useEffect(() => {
    const savedText = loadDraft(token);
    const hasText = Object.values(savedText).some((v) => !!v);

    loadFilesFromDB(token).then((files) => {
      const fileCount = Object.keys(files).length;
      if (hasText || fileCount > 0) {
        setHasRestoredDraft(true);
      }
      if (fileCount > 0) {
        setValues((curr) => ({
          ...curr,
          ...files,
        }));
      }
    });
  }, [token]);

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

    setValues((current) => {
      const next = { ...current, [key]: finalValue };
      saveDraft(token, next);
      return next;
    });

    if (finalValue instanceof File || finalValue === null) {
      saveFileToDB(token, key as string, (finalValue as File | null) ?? null);
    }
  }

  const handleResetDraft = () => {
    clearDraft(token);
    clearFilesFromDB(token);
    setValues(emptyValues());
    setTouched({});
    setHasRestoredDraft(false);
    setClientError(null);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setClientError(null);

    const currentErrors = validateOnboardingForm(values);
    const errorKeys = Object.keys(currentErrors) as (keyof ManualOnboardingInput)[];

    if (errorKeys.length > 0) {
      const allTouched: Partial<Record<keyof ManualOnboardingInput, boolean>> = {};
      for (const k of errorKeys) {
        allTouched[k] = true;
      }
      setTouched((prev) => ({ ...prev, ...allTouched }));

      const firstKey = errorKeys[0];
      const firstMsg = currentErrors[firstKey];
      setClientError(
        `Please correct the highlighted fields (${errorKeys.length} issue${
          errorKeys.length > 1 ? "s" : ""
        } found): ${firstMsg}`
      );

      const el = document.getElementById(`field-${firstKey}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const focusable = el.querySelector<HTMLElement>("input, select, textarea, button");
        if (focusable) {
          focusable.focus();
        }
      }
      return;
    }

    onSubmit(values);
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <header className="border-b border-border pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{profile.employeeCode}</p>
            <h1 className="mt-1 text-2xl font-semibold text-foreground">Employee onboarding</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile.employeeName} | {profile.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-50/80 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              Auto-save enabled
            </span>
          </div>
        </div>

        {hasRestoredDraft ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-500/30 bg-blue-50/90 px-4 py-2.5 text-xs text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
            <span>✓ Restored your previously entered form details and files.</span>
            <button
              type="button"
              onClick={handleResetDraft}
              className="font-semibold underline hover:text-blue-950"
            >
              Clear draft / Reset form
            </button>
          </div>
        ) : null}
      </header>

      {clientError || error ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-danger" />
          <span>{clientError || formatSubmissionError(error)}</span>
        </div>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Personal details</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field
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
          <Select
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
          <Select
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
          <Field
            id="guardianName"
            label="Guardian name"
            value={values.guardianName}
            onChange={(v) => update("guardianName", v)}
            onBlur={() => markTouched("guardianName")}
            error={touched.guardianName ? errors.guardianName : undefined}
            placeholder="Father/Mother/Spouse full name"
            required
          />
          <Field
            id="guardianRelation"
            label="Guardian relation"
            value={values.guardianRelation}
            onChange={(v) => update("guardianRelation", v)}
            onBlur={() => markTouched("guardianRelation")}
            error={touched.guardianRelation ? errors.guardianRelation : undefined}
            placeholder="e.g. Father, Mother, Spouse"
            required
          />
          <Field
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
          <Field
            id="vehicleNumber"
            label="Vehicle number"
            value={values.vehicleNumber}
            onChange={(v) => update("vehicleNumber", v)}
            onBlur={() => markTouched("vehicleNumber")}
            error={touched.vehicleNumber ? errors.vehicleNumber : undefined}
            placeholder="e.g. DL01AB1234 (optional)"
          />
          <Field
            id="vehicleBrand"
            label="Vehicle brand / model"
            value={values.vehicleBrand}
            onChange={(v) => update("vehicleBrand", v)}
            onBlur={() => markTouched("vehicleBrand")}
            error={touched.vehicleBrand ? errors.vehicleBrand : undefined}
            placeholder="e.g. Honda Activa (optional)"
          />
          <Textarea
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
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Identity and bank details</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field
            id="panNumber"
            label="PAN number"
            value={values.panNumber}
            onChange={(v) => update("panNumber", v)}
            onBlur={() => markTouched("panNumber")}
            error={touched.panNumber ? errors.panNumber : undefined}
            placeholder="ABCDE1234F (optional)"
            maxLength={10}
          />
          <Field
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
          <Field
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
          <Field
            id="bankIfsc"
            label="Bank IFSC code"
            value={values.bankIfsc}
            onChange={(v) => update("bankIfsc", v)}
            onBlur={() => markTouched("bankIfsc")}
            error={touched.bankIfsc ? errors.bankIfsc : undefined}
            placeholder="e.g. SBIN0001234"
            maxLength={11}
            required
          />
          <Field
            id="bankName"
            label="Bank name"
            value={values.bankName}
            onChange={(v) => update("bankName", v)}
            onBlur={() => markTouched("bankName")}
            error={touched.bankName ? errors.bankName : undefined}
            placeholder="e.g. State Bank of India"
            required
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Documents</h2>
          <span className="text-xs text-muted-foreground">Each file must be under 1 MB</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <FileField
            id="resume"
            label="Updated resume"
            file={values.resume}
            onChange={(f) => {
              update("resume", f);
              markTouched("resume");
            }}
            error={touched.resume ? errors.resume : undefined}
            required
          />
          <FileField
            id="aadhaarCard"
            label="Aadhaar card"
            file={values.aadhaarCard}
            onChange={(f) => {
              update("aadhaarCard", f);
              markTouched("aadhaarCard");
            }}
            error={touched.aadhaarCard ? errors.aadhaarCard : undefined}
            required
          />
          <FileField
            id="panCard"
            label="PAN card"
            file={values.panCard}
            onChange={(f) => {
              update("panCard", f);
              markTouched("panCard");
            }}
            error={touched.panCard ? errors.panCard : undefined}
          />
          <FileField
            id="bankPassbook"
            label="Bank passbook"
            file={values.bankPassbook}
            onChange={(f) => {
              update("bankPassbook", f);
              markTouched("bankPassbook");
            }}
            error={touched.bankPassbook ? errors.bankPassbook : undefined}
            required
          />
          <FileField
            id="passportPhoto"
            label="Passport photo"
            file={values.passportPhoto}
            onChange={(f) => {
              update("passportPhoto", f);
              markTouched("passportPhoto");
            }}
            error={touched.passportPhoto ? errors.passportPhoto : undefined}
            accept=".jpg,.jpeg,.png,.webp"
            required
          />
          <FileField
            id="marksheet10"
            label="10th marksheet"
            file={values.marksheet10}
            onChange={(f) => {
              update("marksheet10", f);
              markTouched("marksheet10");
            }}
            error={touched.marksheet10 ? errors.marksheet10 : undefined}
            required
          />
          <FileField
            id="marksheet12"
            label="12th marksheet"
            file={values.marksheet12}
            onChange={(f) => {
              update("marksheet12", f);
              markTouched("marksheet12");
            }}
            error={touched.marksheet12 ? errors.marksheet12 : undefined}
            required
          />
          <FileField
            id="marksheetGraduation"
            label="Graduation certificate"
            file={values.marksheetGraduation}
            onChange={(f) => {
              update("marksheetGraduation", f);
              markTouched("marksheetGraduation");
            }}
            error={touched.marksheetGraduation ? errors.marksheetGraduation : undefined}
          />
          <FileField
            id="experienceLetter"
            label="Experience letter"
            file={values.experienceLetter}
            onChange={(f) => {
              update("experienceLetter", f);
              markTouched("experienceLetter");
            }}
            error={touched.experienceLetter ? errors.experienceLetter : undefined}
          />
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        {saving ? (
          <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground animate-pulse">
            <Loader2 className="animate-spin text-primary" size={16} />
            Uploading your documents and details (please do not close or refresh)...
          </p>
        ) : (
          <span className="text-xs text-muted-foreground">
            Please review all details before submitting.
          </span>
        )}
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
          {saving ? "Submitting (Uploading)..." : "Submit onboarding"}
        </button>
      </div>
    </form>
  );
}

function formatSubmissionError(error: unknown): string {
  if (error && typeof error === "object") {
    const err = error as { code?: string; message?: string };
    if (err.code === "ECONNABORTED" || /timeout/i.test(err.message || "")) {
      return "Network timeout: The file upload took longer than expected. If your details were saved, please refresh the page to verify status.";
    }
  }
  return getApiErrorMessage(error);
}

function Field({
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
    <div id={id ? `field-${id}` : undefined} className="space-y-1">
      <label className="block text-xs font-medium uppercase text-muted-foreground">
        {label}
        <RequiredIndicator required={required} />
      </label>
      {type === "date" ? (
        <DatePicker
          id={id}
          value={value}
          onChange={onChange}
          required={required}
          ariaLabel={`Choose ${label.toLowerCase()}`}
          className="mt-1"
          buttonClassName={`rounded-lg px-3 text-slate-950 transition-colors ${
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
          className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm normal-case text-slate-950 transition-colors focus:outline-none focus:ring-1 ${
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

function Textarea({
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
      id={id ? `field-${id}` : undefined}
      className="space-y-1 md:col-span-2 lg:col-span-3"
    >
      <label className="block text-xs font-medium uppercase text-muted-foreground">
        {label}
        <RequiredIndicator required={required} />
      </label>
      <textarea
        id={id}
        value={value}
        placeholder={placeholder}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm normal-case text-foreground transition-colors focus:outline-none focus:ring-1 ${
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

function Select({
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
    <div id={id ? `field-${id}` : undefined} className="space-y-1">
      <label className="block text-xs font-medium uppercase text-muted-foreground">
        {label}
        <RequiredIndicator required={required} />
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm normal-case text-foreground transition-colors focus:outline-none focus:ring-1 ${
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

function FileField({
  id,
  label,
  file,
  onChange,
  error,
  required,
  accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp",
}: {
  id?: string;
  label: string;
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
      id={id ? `field-${id}` : undefined}
      className={`rounded-lg border p-3.5 text-sm transition-all ${
        displayError
          ? "border-red-500 bg-red-50/80 ring-2 ring-red-500/30 dark:bg-red-950/20"
          : file
            ? "border-emerald-500/50 bg-emerald-50/40 ring-1 ring-emerald-500/30 dark:bg-emerald-950/20"
            : "border-border bg-card"
      }`}
    >
      <div className="flex items-center justify-between gap-2 font-medium">
        <span className="flex items-center gap-1.5 truncate">
          <FileUp
            size={16}
            className={
              displayError ? "text-red-500" : file ? "text-emerald-600" : "text-muted-foreground"
            }
          />
          <span className="truncate">{label}</span>
          <RequiredIndicator required={required} />
        </span>
        <span className="shrink-0 rounded bg-muted/80 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
          Max 1 MB
        </span>
      </div>

      {displayError ? (
        <div className="mt-2.5 flex items-start gap-2 rounded-md border border-red-300 bg-red-100/90 p-2 text-xs font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300">
          <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-600" />
          <span>{displayError}</span>
        </div>
      ) : file ? (
        <div className="mt-2 flex items-center justify-between gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <span className="truncate">
            ✓ {file.name} ({formatFileSize(file.size)})
          </span>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setInternalError(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="ml-2 shrink-0 text-[11px] text-muted-foreground underline hover:text-red-500"
          >
            Remove
          </button>
        </div>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          {required ? "Required (Maximum 1 MB)" : "Optional (Maximum 1 MB)"}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="mt-2.5 block w-full cursor-pointer text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-card-foreground hover:file:bg-surface-hover"
      />
    </div>
  );
}

function RequiredIndicator({ required }: { required?: boolean | undefined }) {
  if (!required) return null;
  return <span className="ml-1 text-danger" aria-label="required">*</span>;
}

function CenteredState({
  icon,
  title,
  message,
}: {
  icon?: ReactNode;
  title: string;
  message?: string;
}) {
  return (
    <div className="grid min-h-screen place-items-center text-center">
      <div>
        {icon ? <div className="mb-3 flex justify-center">{icon}</div> : null}
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {message ? <p className="mt-2 text-sm text-muted-foreground">{message}</p> : null}
      </div>
    </div>
  );
}

function emptyValues(): ManualOnboardingInput {
  return {
    dateOfBirth: "",
    gender: "",
    bloodGroup: "",
    guardianName: "",
    guardianRelation: "",
    guardianNumber: "",
    address: "",
    vehicleNumber: "",
    vehicleBrand: "",
    panNumber: "",
    aadhaarNumber: "",
    bankAccountNumber: "",
    bankIfsc: "",
    bankName: "",
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

const DRAFT_PREFIX = "hrm_onboarding_draft_";

type TextOnboardingFields = Omit<
  ManualOnboardingInput,
  | "resume"
  | "aadhaarCard"
  | "panCard"
  | "experienceLetter"
  | "bankPassbook"
  | "passportPhoto"
  | "marksheet10"
  | "marksheet12"
  | "marksheetGraduation"
>;

function loadDraft(token: string): Partial<TextOnboardingFields> {
  if (!token) return {};
  try {
    const raw = localStorage.getItem(`${DRAFT_PREFIX}${token}`);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveDraft(token: string, values: ManualOnboardingInput) {
  if (!token) return;
  try {
    const textData: TextOnboardingFields = {
      dateOfBirth: values.dateOfBirth,
      gender: values.gender,
      bloodGroup: values.bloodGroup,
      guardianName: values.guardianName,
      guardianRelation: values.guardianRelation,
      guardianNumber: values.guardianNumber,
      address: values.address,
      vehicleNumber: values.vehicleNumber,
      vehicleBrand: values.vehicleBrand,
      panNumber: values.panNumber,
      aadhaarNumber: values.aadhaarNumber,
      bankAccountNumber: values.bankAccountNumber,
      bankIfsc: values.bankIfsc,
      bankName: values.bankName,
    };
    localStorage.setItem(`${DRAFT_PREFIX}${token}`, JSON.stringify(textData));
  } catch {}
}

function clearDraft(token: string) {
  if (!token) return;
  try {
    localStorage.removeItem(`${DRAFT_PREFIX}${token}`);
  } catch {}
}

function openFileDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not supported"));
      return;
    }
    const req = indexedDB.open("hrm_onboarding_db", 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains("files")) {
        req.result.createObjectStore("files");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveFileToDB(token: string, fieldName: string, file: File | null) {
  if (!token) return;
  try {
    const db = await openFileDB();
    const tx = db.transaction("files", "readwrite");
    const store = tx.objectStore("files");
    const key = `${token}_${fieldName}`;
    if (!file) {
      store.delete(key);
    } else {
      store.put(file, key);
    }
  } catch {}
}

async function loadFilesFromDB(token: string): Promise<Partial<Record<keyof ManualOnboardingInput, File>>> {
  if (!token) return {};
  try {
    const db = await openFileDB();
    return new Promise((resolve) => {
      const tx = db.transaction("files", "readonly");
      const store = tx.objectStore("files");
      const req = store.getAllKeys();
      req.onsuccess = async () => {
        const keys = (req.result as string[]).filter((k) => k.startsWith(`${token}_`));
        const results: Partial<Record<keyof ManualOnboardingInput, File>> = {};
        for (const k of keys) {
          const field = k.replace(`${token}_`, "") as keyof ManualOnboardingInput;
          await new Promise<void>((r) => {
            const valReq = store.get(k);
            valReq.onsuccess = () => {
              if (valReq.result instanceof File) {
                results[field] = valReq.result;
              }
              r();
            };
            valReq.onerror = () => r();
          });
        }
        resolve(results);
      };
      req.onerror = () => resolve({});
    });
  } catch {
    return {};
  }
}

async function clearFilesFromDB(token: string) {
  if (!token) return;
  try {
    const db = await openFileDB();
    const tx = db.transaction("files", "readwrite");
    const store = tx.objectStore("files");
    const req = store.getAllKeys();
    req.onsuccess = () => {
      const keys = (req.result as string[]).filter((k) => k.startsWith(`${token}_`));
      for (const k of keys) {
        store.delete(k);
      }
    };
  } catch {}
}
