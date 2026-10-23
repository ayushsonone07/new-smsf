import { useRef, useState } from "react";

import { isAxiosError } from "axios";
import { Check, Download, Eye, Loader2, Trash2, Upload, X } from "lucide-react";

import { useToast } from "@shared/components/feedback";

import { useDeleteResume, useUploadResume } from "../hooks";
import { hrService } from "../services";

interface ResumeActionsProps {
  candidateId: number;
  candidateName: string;
  /** Download path like "/api/v1/hr/resumes/<uuid>.pdf", or null if none uploaded. */
  resumeUrl: string | null;
}

const ACCEPT = ".pdf,.doc,.docx";

/**
 * Per-row resume controls.
 *
 * - No resume yet: [Upload] + [Download (disabled)]
 * - Resume present: [Download (enabled)] + [Delete] — Upload is hidden so a
 *   resume can't be re-uploaded; the user must delete the existing one first.
 */
export function ResumeActions({ candidateId, candidateName, resumeUrl }: ResumeActionsProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadResume();
  const del = useDeleteResume();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const hasResume = Boolean(resumeUrl);

  function onPickFile() {
    fileInputRef.current?.click();
  }

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so re-picking the same file still fires onChange
    if (!file) return;

    upload.mutate(
      { candidateId, file },
      {
        onSuccess: (message) => toast.success(message || "Resume uploaded"),
        onError: (err) => toast.error("Upload failed", errorMessage(err)),
      },
    );
  }

  async function onDownload() {
    if (!resumeUrl) return;
    const fileName = resumeUrl.split("/").pop() ?? "";
    if (!fileName) {
      toast.error("Download failed", "Resume file name is missing.");
      return;
    }
    setIsDownloading(true);
    try {
      const blob = await hrService.downloadResume(fileName);
      triggerBrowserDownload(blob, downloadName(candidateName, fileName));
    } catch (err) {
      toast.error("Download failed", errorMessage(err));
    } finally {
      setIsDownloading(false);
    }
  }

  async function onView() {
    if (!resumeUrl) return;
    const fileName = resumeUrl.split("/").pop() ?? "";
    if (!fileName) {
      toast.error("Couldn't open resume", "Resume file name is missing.");
      return;
    }

    // Open the tab synchronously (inside the click gesture) so popup blockers
    // don't kill it; we point it at the blob URL once the fetch resolves.
    const win = window.open("", "_blank");
    setIsViewing(true);
    try {
      const blob = await hrService.downloadResume(fileName);
      // Re-wrap with the correct MIME type so the browser renders it inline
      // (the download endpoint doesn't set Content-Type). PDFs preview; Office
      // docs will fall back to download — browsers can't render them inline.
      const typed = new Blob([blob], { type: mimeFromName(fileName) });
      const url = URL.createObjectURL(typed);
      if (win) {
        win.location.href = url;
      } else {
        window.open(url, "_blank");
      }
      // Keep the URL alive long enough for the new tab to load, then release it.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      win?.close();
      toast.error("Couldn't open resume", errorMessage(err));
    } finally {
      setIsViewing(false);
    }
  }

  function onConfirmDelete() {
    del.mutate(candidateId, {
      onSuccess: (message) => {
        toast.success(message || "Resume deleted");
        setConfirmingDelete(false);
      },
      onError: (err) => {
        toast.error("Delete failed", errorMessage(err));
        setConfirmingDelete(false);
      },
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={onFileChosen}
      />

      {/* Upload — only when no resume exists yet. */}
      {!hasResume ? (
        <button
          type="button"
          onClick={onPickFile}
          disabled={upload.isPending}
          title="Upload resume (PDF/DOC/DOCX, max 5MB)"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {upload.isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          Resume
        </button>
      ) : null}

      {/* View — only when a resume exists. Opens inline in a new tab (PDF previews). */}
      {hasResume ? (
        <button
          type="button"
          onClick={() => void onView()}
          disabled={isViewing}
          title="View resume in a new tab"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isViewing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
          View
        </button>
      ) : null}

      {/* Download — always shown; enabled only when a resume exists. */}
      <button
        type="button"
        onClick={() => void onDownload()}
        disabled={!hasResume || isDownloading}
        title={hasResume ? "Download resume" : "No resume uploaded yet"}
        className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
      </button>

      {/* Delete — only when a resume exists. Two-click inline confirm. */}
      {hasResume ? (
        confirmingDelete ? (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            Delete?
            <button
              type="button"
              onClick={onConfirmDelete}
              disabled={del.isPending}
              title="Confirm delete"
              className="grid h-7 w-7 place-items-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-60"
            >
              {del.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={del.isPending}
              title="Cancel"
              className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-60"
            >
              <X size={14} />
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            title="Delete resume"
            className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 bg-white text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 size={14} />
          </button>
        )
      ) : null}
    </div>
  );
}

/* ── helpers ─────────────────────────────────────────────────── */

function errorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const body = err.response?.data as { message?: string } | undefined;
    return body?.message ?? err.message;
  }
  return err instanceof Error ? err.message : "Something went wrong";
}

/** Maps a stored file name's extension to a MIME type for inline viewing. */
function mimeFromName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return "application/octet-stream";
  }
}

/** Build a friendly download filename: "Asha-Sharma-resume.pdf". */
function downloadName(candidateName: string, storedFileName: string): string {
  const ext = storedFileName.includes(".") ? storedFileName.split(".").pop() : "pdf";
  const safeName =
    candidateName
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-]/g, "") || "candidate";
  return `${safeName}-resume.${ext}`;
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
