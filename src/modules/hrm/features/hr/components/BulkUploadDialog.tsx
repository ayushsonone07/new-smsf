import { useEffect, useState, type ChangeEvent } from "react";

import { CheckCircle2, FileText } from "lucide-react";

import { useToast } from "@shared/components/feedback";
import { Dialog } from "@shared/components/ui";
import { getApiErrorMessage } from "@shared/lib";

import { useImportCandidates } from "../hooks";

import type { ImportResult } from "../types";

interface BulkUploadDialogProps {
  open: boolean;
  onClose: () => void;
}

const ACCEPT = ".csv,.xlsx,.xls";

/**
 * Wired to POST /api/v1/hr/import/candidates. Single-file upload; backend
 * returns { saved, skipped, errors, message } which is rendered after success.
 * A global toast also fires so the outcome is visible after the user closes
 * the dialog.
 */
export function BulkUploadDialog({ open, onClose }: BulkUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const importMut = useImportCandidates();
  const toast = useToast();

  useEffect(() => {
    if (open) {
      setFile(null);
      importMut.reset();
    }
    // importMut.reset is stable; we only want to reset on (re-)open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null);
    importMut.reset();
  }

  function onSubmit() {
    if (!file) return;
    importMut.mutate(file, {
      onSuccess: (result) => {
        const tone = result.errors > 0 ? "warning" : "success";
        const description = `${result.saved} saved | ${result.skipped} duplicates | ${result.errors} errors`;
        toast.show({
          variant: tone,
          title: result.message || "Import complete",
          description,
        });
      },
      onError: (err) => {
        toast.error("Couldn’t import candidates", getApiErrorMessage(err));
      },
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Bulk upload candidates"
      description="Upload a CSV or Excel file. Existing candidates (matched by phone) are skipped."
    >
      <div className="space-y-4 px-6 py-5">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-sm text-slate-500 hover:border-indigo-400 hover:bg-indigo-50/30">
          <FileText size={28} />
          {file ? (
            <span className="font-medium text-slate-700">{file.name}</span>
          ) : (
            <>
              <span className="font-medium text-slate-700">Click to select a file</span>
              <span className="text-xs">CSV, XLSX, or XLS</span>
            </>
          )}
          <input type="file" accept={ACCEPT} onChange={onFileChange} className="hidden" />
        </label>

        {importMut.isSuccess && importMut.data ? (
          <ImportResultBanner result={importMut.data} />
        ) : null}
        {importMut.error ? (
          <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {getApiErrorMessage(importMut.error)}
          </p>
        ) : null}
      </div>

      <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {importMut.isSuccess ? "Done" : "Cancel"}
        </button>
        {!importMut.isSuccess ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={!file || importMut.isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:bg-indigo-700"
          >
            {importMut.isPending ? "Uploading…" : "Upload"}
          </button>
        ) : null}
      </footer>
    </Dialog>
  );
}

function ImportResultBanner({ result }: { result: ImportResult }) {
  return (
    <div className="rounded border border-emerald-200 bg-emerald-50 p-3">
      <div className="flex items-start gap-2">
        <CheckCircle2 size={18} className="mt-0.5 text-emerald-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-emerald-800">{result.message}</p>
          <div className="mt-2 flex gap-4 text-xs text-emerald-700">
            <span>
              <strong>{result.saved}</strong> saved
            </span>
            <span>
              <strong>{result.skipped}</strong> duplicates skipped
            </span>
            <span>
              <strong>{result.errors}</strong> errors
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

