import { useEffect, useState, type ChangeEvent } from "react";

import { Info, Loader2, Save } from "lucide-react";

import { useToast } from "@shared/components/feedback";
import { Dialog } from "@shared/components/ui";
import { getApiErrorMessage } from "@shared/lib";

import { useUpdateCandidateAdditionalInfo } from "../hooks";

import { Select } from "@hrm/components/ui/select";

import type { Candidate } from "../types";

interface AdditionalInfoDialogProps {
  candidate: Candidate | null;
  onClose: () => void;
}

interface FormState {
  city: string;
  experience: string;
  hasLaptop: "unknown" | "yes" | "no";
  education: string;
  term: string;
}

export function AdditionalInfoDialog({ candidate, onClose }: AdditionalInfoDialogProps) {
  const [form, setForm] = useState<FormState>(() => toForm(candidate));
  const updateMut = useUpdateCandidateAdditionalInfo();
  const toast = useToast();
  const open = candidate !== null;

  useEffect(() => {
    if (open) {
      setForm(toForm(candidate));
      updateMut.reset();
    }
    return undefined;
    // updateMut.reset is stable enough for this dialog reset lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, candidate?.id]);

  if (!candidate) return null;
  const selectedCandidate = candidate;

  function setField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function onTextChange(field: keyof Omit<FormState, "hasLaptop">) {
    return (e: ChangeEvent<HTMLInputElement>) => setField(field, e.target.value);
  }

  function onSave() {
    updateMut.mutate(
      {
        id: selectedCandidate.id,
        city: nullableText(form.city),
        experience: nullableText(form.experience),
        hasLaptop: form.hasLaptop === "unknown" ? null : form.hasLaptop === "yes",
        education: nullableText(form.education),
        term: nullableText(form.term),
      },
      {
        onSuccess: () => {
          toast.success("Additional information saved");
          onClose();
        },
        onError: (err) =>
          toast.error("Could not save additional information", getApiErrorMessage(err)),
      },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Additional information"
      description={`For ${candidate.name}`}
      size="md"
    >
      <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
        <TextField label="Town / City" value={form.city} onChange={onTextChange("city")} />
        <TextField
          label="Experience"
          value={form.experience}
          onChange={onTextChange("experience")}
        />
        <LaptopField value={form.hasLaptop} onChange={(value) => setField("hasLaptop", value)} />
        <TextField label="Education" value={form.education} onChange={onTextChange("education")} />
        <div className="sm:col-span-2">
          <TextField label="Term" value={form.term} onChange={onTextChange("term")} />
        </div>
      </div>

      <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          disabled={updateMut.isPending}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={updateMut.isPending}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {updateMut.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {updateMut.isPending ? "Saving..." : "Save changes"}
        </button>
      </footer>
    </Dialog>
  );
}

export function AdditionalInfoButton({
  candidate,
  onClick,
}: {
  candidate: Candidate;
  onClick: () => void;
}) {
  const hasTextInfo = [
    candidate.city,
    candidate.experience,
    candidate.education,
    candidate.term,
  ].some((value) => (value ?? "").trim().length > 0);
  const hasAnyInfo = hasTextInfo ? true : candidate.hasLaptop !== null;

  return (
    <button
      type="button"
      onClick={onClick}
      title={hasAnyInfo ? "View or edit additional information" : "Add additional information"}
      className="inline-flex cursor-pointer h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition-colors hover:border-cyan-300 hover:bg-cyan-50 hover:text-slate-950"
    >
      <Info size={14} />
      Additional Information
    </button>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        type="text"
        value={value}
        onChange={onChange}
        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </label>
  );
}

function LaptopField({
  value,
  onChange,
}: {
  value: FormState["hasLaptop"];
  onChange: (value: FormState["hasLaptop"]) => void;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      Require Laptop
      <div className="relative">
        <Select
          value={value}
          onChange={(e) => onChange(e.target.value as FormState["hasLaptop"])}
          className="mt-1.5 w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="unknown">Not set</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </Select>
      </div>
    </label>
  );
}

function toForm(candidate: Candidate | null): FormState {
  return {
    city: candidate?.city ?? "",
    experience: candidate?.experience ?? "",
    hasLaptop:
      candidate?.hasLaptop === null || candidate?.hasLaptop === undefined
        ? "unknown"
        : candidate.hasLaptop
          ? "yes"
          : "no",
    education: candidate?.education ?? "",
    term: candidate?.term ?? "",
  };
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
