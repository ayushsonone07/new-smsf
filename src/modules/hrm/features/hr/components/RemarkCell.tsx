import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { MessageSquarePlus, Pencil } from "lucide-react";

import { useToast } from "@shared/components/feedback";
import { Dialog } from "@shared/components/ui";
import { getApiErrorMessage } from "@shared/lib";

import { useUpdateCandidateRemark } from "../hooks";

interface RemarkCellProps {
  candidateId: number;
  candidateName: string;
  remark: unknown;
}

/**
 * Display + editor for a candidate's remark.
 *
 *   null / empty  → "Add remark" button (dashed-border affordance)
 *   present       → truncated text; pencil icon revealed on hover; click to edit
 *
 * Editing opens a Dialog with a textarea. Submitting fires
 * useUpdateCandidateRemark (optimistic — cell updates instantly; rolls back +
 * red toast on failure). Backend's success message is surfaced via toast.
 */
export function RemarkCell({ candidateId, candidateName, remark }: RemarkCellProps) {
  const [editing, setEditing] = useState(false);
  const current = getRemarkText(remark);

  return (
    <>
      {current !== null ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          title={current}
          className="group flex w-full max-w-[22ch] items-center gap-1.5 text-left text-slate-600 transition-colors hover:text-slate-900"
        >
          <span className="min-w-0 flex-1 truncate">{current}</span>
          <Pencil
            size={12}
            className="shrink-0 opacity-0 transition-opacity group-hover:opacity-60"
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-700"
        >
          <MessageSquarePlus size={12} />
          Add remark
        </button>
      )}

      <RemarkEditorDialog
        open={editing}
        onClose={() => setEditing(false)}
        candidateId={candidateId}
        candidateName={candidateName}
        currentRemark={current ?? ""}
      />
    </>
  );
}

/* ── editor dialog (file-local) ──────────────────────────── */

interface RemarkEditorDialogProps {
  open: boolean;
  onClose: () => void;
  candidateId: number;
  candidateName: string;
  currentRemark: string;
}

function RemarkEditorDialog({
  open,
  onClose,
  candidateId,
  candidateName,
  currentRemark,
}: RemarkEditorDialogProps) {
  const [text, setText] = useState(currentRemark);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const updateMut = useUpdateCandidateRemark();
  const toast = useToast();

  // Reset to the latest current value + focus the textarea whenever the dialog
  // (re-)opens. Doing this in an effect (rather than autoFocus) keeps the
  // jsx-a11y rule happy and gives the dialog time to mount first.
  useEffect(() => {
    if (open) {
      setText(currentRemark);
      updateMut.reset();
      // Defer until after the dialog renders so focus actually lands.
      const t = window.setTimeout(() => {
        textareaRef.current?.focus();
        // Place caret at end of existing text for fast editing.
        const el = textareaRef.current;
        if (el) {
          el.selectionStart = el.value.length;
          el.selectionEnd = el.value.length;
        }
      }, 0);
      return () => window.clearTimeout(t);
    }
    return undefined;
    // updateMut.reset is stable; we only want to reset on (re-)open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isEditing = currentRemark.length > 0;
  const trimmed = text.trim();
  const canSave = trimmed.length > 0 && trimmed !== currentRemark.trim() && !updateMut.isPending;

  function onChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
  }

  function onSave() {
    if (!canSave) return;
    updateMut.mutate(
      { id: candidateId, remark: trimmed },
      {
        onSuccess: (message) => {
          toast.success(message || "Remark saved");
          onClose();
        },
        onError: (err) => toast.error("Couldn’t save remark", getApiErrorMessage(err)),
      },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit remark" : "Add remark"}
      description={`For ${candidateName}`}
      size="md"
    >
      <div className="px-6 py-5">
        <label htmlFor="remark-text" className="block text-sm font-medium text-slate-700">
          Your note
        </label>
        <textarea
          id="remark-text"
          ref={textareaRef}
          value={text}
          onChange={onChange}
          rows={5}
          placeholder="Strong technical background, available immediately…"
          disabled={updateMut.isPending}
          className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-relaxed transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
        />
        <p className="mt-1.5 text-xs text-slate-500">Visible to your HR team. Plain text.</p>
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
          disabled={!canSave}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {updateMut.isPending ? "Saving…" : isEditing ? "Save changes" : "Save remark"}
        </button>
      </footer>
    </Dialog>
  );
}

/* ── helpers ─────────────────────────────────────────────── */

/**
 * Backend remark shape varies across migrations:
 *   null / undefined          → no remark
 *   "..."                     → plain string (legacy)
 *   { text: "..." }           → current shape after PATCH /update-remark
 *   { ...other } / array      → unknown shape; fall through to JSON
 *
 * Returns null when there's nothing meaningful to display so the caller
 * shows the Add-remark affordance instead.
 */
function getRemarkText(remark: unknown): string | null {
  if (remark === null || remark === undefined) return null;
  if (typeof remark === "string") {
    const t = remark.trim();
    return t.length > 0 ? t : null;
  }
  if (typeof remark === "object") {
    if ("text" in remark) {
      const t = remark.text;
      if (typeof t === "string" && t.trim().length > 0) return t.trim();
    }
    try {
      const s = JSON.stringify(remark);
      return s !== "{}" && s !== "[]" ? s : null;
    } catch {
      return null;
    }
  }
  return null;
}
