import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";

import { AlertTriangle, Loader2 } from "lucide-react";

import { useToast } from "@shared/components/feedback";
import { Dialog } from "@shared/components/ui";
import { getApiErrorMessage } from "@shared/lib";

import { Select } from "@hrm/components/ui/select";

import { useAddCandidate } from "../hooks";
import { normalizeSourceForSave } from "../utils/source";

import type { NewCandidateInput } from "../types";

interface AddCandidateDialogProps {
  open: boolean;
  onClose: () => void;
}

type View = "form" | "confirm-discard";

const EMPTY: NewCandidateInput = { name: "", email: "", phone: "", source: "" };

const SOURCE_OPTIONS = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "naukri", label: "Naukri" },
  { value: "referral", label: "Referral" },
  { value: "walk_in", label: "Walk-in" },
  { value: "college", label: "College" },
  { value: "other", label: "Other" },
] as const;

const EMAIL_RE = /^\S+@\S+\.\S+$/;

type Errors = Partial<Record<keyof NewCandidateInput, string>>;

function isValidIndianMobile(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  const localNumber = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(localNumber);
}

/**
 * Add a single candidate via POST /add/candidate.
 *
 * Two internal views:
 *   - "form"             — the input form (default)
 *   - "confirm-discard"  — shown when the user attempts close with a dirty form
 *
 * Success / error surface as global toasts (useToast). On success we close the
 * dialog immediately; the toast carries the backend's message. On failure we
 * keep the dialog open so the user can fix and retry, with an inline banner
 * mirroring the toast for in-context visibility.
 */
export function AddCandidateDialog({ open, onClose }: AddCandidateDialogProps) {
  const [values, setValues] = useState<NewCandidateInput>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [view, setView] = useState<View>("form");
  const addMut = useAddCandidate();
  const toast = useToast();

  const isDirty = useMemo(
    () =>
      (Object.keys(values) as (keyof NewCandidateInput)[]).some((k) => values[k].trim().length > 0),
    [values],
  );

  // Reset everything when the dialog (re-)opens.
  useEffect(() => {
    if (open) {
      setValues(EMPTY);
      setErrors({});
      setSubmitted(false);
      setView("form");
      addMut.reset();
    }
    // addMut.reset is stable across renders; omitting from deps avoids re-runs on every mut state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function update<K extends keyof NewCandidateInput>(key: K, value: NewCandidateInput[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (submitted) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function validate(v: NewCandidateInput): Errors {
    const e: Errors = {};
    if (!v.name.trim()) e.name = "Name is required.";
    if (!v.email.trim()) e.email = "Email is required.";
    else if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter a valid email address.";
    if (!v.phone.trim()) e.phone = "Phone is required.";
    else if (!isValidIndianMobile(v.phone)) e.phone = "Enter a valid 10-digit mobile number.";
    if (!v.source.trim()) e.source = "Source is required.";
    return e;
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    const trimmed: NewCandidateInput = {
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      source: normalizeSourceForSave(values.source),
    };
    const eMap = validate(trimmed);
    setErrors(eMap);
    if (Object.keys(eMap).length > 0) return;
    addMut.mutate(trimmed, {
      onSuccess: (message) => {
        toast.success(message || "Candidate added", `${trimmed.name} is now in your list.`);
        onClose();
      },
      onError: (err) => {
        toast.error("Couldn’t add candidate", getApiErrorMessage(err));
      },
    });
  }

  /** Called from the Dialog (X / Esc / backdrop) and from the Cancel button. */
  function attemptClose() {
    // If we're mid-flight, ignore close attempts.
    if (addMut.isPending) return;
    // If the form is untouched, close directly.
    if (!isDirty) {
      onClose();
      return;
    }
    setView("confirm-discard");
  }

  return (
    <Dialog
      open={open}
      onClose={attemptClose}
      title={view === "form" ? "Add candidate" : "Discard changes?"}
      description={
        view === "form"
          ? "Create a new candidate. They'll appear in your list immediately."
          : undefined
      }
      size="md"
    >
      {view === "form" ? (
        <form onSubmit={onSubmit} noValidate>
          <div className="space-y-4 px-6 py-5">
            <Field
              id="cand-name"
              label="Full name"
              required
              error={errors.name}
              input={
                <input
                  id="cand-name"
                  type="text"
                  autoComplete="name"
                  value={values.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="John Deo"
                  className={fieldClass(errors.name)}
                  disabled={addMut.isPending}
                />
              }
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                id="cand-email"
                label="Email"
                required
                error={errors.email}
                input={
                  <input
                    id="cand-email"
                    type="email"
                    autoComplete="email"
                    value={values.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="name@example.com"
                    className={fieldClass(errors.email)}
                    disabled={addMut.isPending}
                  />
                }
              />

              <Field
                id="cand-phone"
                label="Phone"
                required
                error={errors.phone}
                input={
                  <input
                    id="cand-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={values.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="+91 98765 43210"
                    className={fieldClass(errors.phone)}
                    disabled={addMut.isPending}
                  />
                }
              />
            </div>

            <Field
              id="cand-source"
              label="Source"
              required
              error={errors.source}
              hint="Pick a known source or type your own (e.g. College, Conference)."
              input={
                <Select
                  id="cand-source"
                  value={values.source}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => update("source", e.target.value)}
                  disabled={addMut.isPending}
                  className={fieldClass(errors.source)}
                >
                  <option value="">Select source</option>
                  {SOURCE_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              }
            />

            {addMut.error ? (
              <p className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{getApiErrorMessage(addMut.error)}</span>
              </p>
            ) : null}
          </div>

          <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button
              type="button"
              onClick={attemptClose}
              disabled={addMut.isPending}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addMut.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {addMut.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Adding…
                </>
              ) : (
                "Add candidate"
              )}
            </button>
          </footer>
        </form>
      ) : (
        <DiscardConfirm
          onKeepEditing={() => setView("form")}
          onDiscard={() => {
            setView("form");
            onClose();
          }}
        />
      )}
    </Dialog>
  );
}
/* ── form bits ────────────────────────────────────────────── */

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string | undefined;
  hint?: string | undefined;
  input: React.ReactNode;
}

function Field({ id, label, required, error, hint, input }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </label>
      <div className="mt-1.5">{input}</div>
      {error ? (
        <p className="mt-1 text-xs text-rose-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

function fieldClass(error?: string): string {
  const base =
    "w-full rounded-lg border bg-white px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-1 disabled:bg-slate-50 disabled:text-slate-400";
  const tone = error
    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500"
    : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500";
  return `${base} ${tone}`;
}

/* ── confirm-discard view ────────────────────────────────── */

function DiscardConfirm({
  onKeepEditing,
  onDiscard,
}: {
  onKeepEditing: () => void;
  onDiscard: () => void;
}) {
  return (
    <>
      <div className="flex items-start gap-3 px-6 py-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-600">
          <AlertTriangle size={20} />
        </span>
        <div>
          <p className="text-sm text-slate-700">
            Your candidate details haven’t been saved yet. Are you sure you want to discard them?
          </p>
          <p className="mt-1 text-xs text-slate-500">You can’t undo this.</p>
        </div>
      </div>
      <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
        <button
          type="button"
          onClick={onKeepEditing}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Keep editing
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-rose-700"
        >
          Discard
        </button>
      </footer>
    </>
  );
}
