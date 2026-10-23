import { useEffect, useMemo, useState, type FormEvent } from "react";

import { AlertTriangle, Loader2, Mail } from "lucide-react";

import { useToast } from "@shared/components/feedback";
import { Dialog } from "@shared/components/ui";
import { getApiErrorMessage } from "@shared/lib";

import { useSendInterviewMail } from "../hooks";

import type { Candidate, InterviewMailInput } from "../types";

interface InterviewMailDialogProps {
  candidate: Candidate | null;
  onClose: () => void;
}

type Errors = Partial<Record<keyof InterviewMailInput, string>>;

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export function InterviewMailDialog({ candidate, onClose }: InterviewMailDialogProps) {
  const open = Boolean(candidate);
  const [values, setValues] = useState<InterviewMailInput>(() => emptyValues(candidate));
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const mail = useSendInterviewMail();
  const toast = useToast();

  const isDirty = useMemo(() => {
    const initial = emptyValues(candidate);
    return (
      values.to !== initial.to || values.subject !== initial.subject || values.text !== initial.text
    );
  }, [candidate, values]);

  useEffect(() => {
    if (candidate) {
      setValues(emptyValues(candidate));
      setErrors({});
      setSubmitted(false);
      mail.reset();
    }
    // mail.reset is stable enough for mutation usage; avoid re-opening resets on mutation state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate?.id]);

  function update<K extends keyof InterviewMailInput>(key: K, value: InterviewMailInput[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (submitted) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    const trimmed: InterviewMailInput = {
      to: values.to.trim(),
      subject: values.subject.trim(),
      text: values.text.trim(),
    };
    const nextErrors = validate(trimmed);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    mail.mutate(trimmed, {
      onSuccess: (message) => {
        toast.success(message || "Interview mail sent", trimmed.to);
        onClose();
      },
      onError: (err) => {
        toast.error("Couldn't send interview mail", getApiErrorMessage(err));
      },
    });
  }

  function close() {
    if (mail.isPending) return;
    if (!isDirty || window.confirm("Discard the interview mail draft?")) onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Send interview mail"
      description={candidate ? `Compose interview details for ${candidate.name}.` : undefined}
      size="lg"
    >
      <form onSubmit={submit} noValidate>
        <div className="space-y-4 px-6 py-5">
          <Field
            id="mail-to"
            label="Candidate email"
            required
            error={errors.to}
            input={
              <input
                id="mail-to"
                type="email"
                autoComplete="email"
                value={values.to}
                onChange={(e) => update("to", e.target.value)}
                className={fieldClass(errors.to)}
                disabled={mail.isPending}
              />
            }
          />

          <Field
            id="mail-subject"
            label="Subject"
            required
            error={errors.subject}
            input={
              <input
                id="mail-subject"
                value={values.subject}
                onChange={(e) => update("subject", e.target.value)}
                placeholder="Interview scheduled"
                className={fieldClass(errors.subject)}
                disabled={mail.isPending}
              />
            }
          />

          <Field
            id="mail-text"
            label="Mail body"
            required
            error={errors.text}
            input={
              <textarea
                id="mail-text"
                value={values.text}
                onChange={(e) => update("text", e.target.value)}
                rows={10}
                className={`${fieldClass(errors.text)} resize-y leading-6`}
                disabled={mail.isPending}
              />
            }
          />

          {mail.error ? (
            <p className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{getApiErrorMessage(mail.error)}</span>
            </p>
          ) : null}
        </div>

        <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={close}
            disabled={mail.isPending}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mail.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mail.isPending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
            {mail.isPending ? "Sending..." : "Send mail"}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}

function emptyValues(candidate: Candidate | null): InterviewMailInput {
  const candidateName = candidate?.name ?? "Candidate";
  return {
    to: candidate?.email ?? "",
    subject: `Interview scheduled - ${candidateName}`,
    text: [
      `Dear ${candidateName},`,
      "",
      "Your interview has been scheduled. Please find the details below:",
      "",
      "Date:",
      "Time:",
      "Mode/Location:",
      "Interviewer:",
      "",
      "Please confirm your availability for the scheduled slot.",
      "",
      "Regards,",
      "HR Team",
    ].join("\n"),
  };
}

function validate(values: InterviewMailInput): Errors {
  const errors: Errors = {};
  if (!values.to) errors.to = "Candidate email is required.";
  else if (!EMAIL_RE.test(values.to)) errors.to = "Enter a valid email address.";
  if (!values.subject) errors.subject = "Subject is required.";
  if (!values.text) errors.text = "Mail body is required.";
  return errors;
}

interface FieldProps {
  id: string;
  label: string;
  required?: boolean | undefined;
  error?: string | undefined;
  input: React.ReactNode;
}

function Field({ id, label, required, error, input }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </label>
      <div className="mt-1.5">{input}</div>
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
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
