import { useState, useRef, type ChangeEvent, type FormEvent } from "react";

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";

import { useToast } from "@shared/components/feedback";
import { Dialog } from "@shared/components/ui";
import { getApiErrorMessage } from "@shared/lib";

import { useBulkImportSalaryStructures } from "../hooks";
import { payrollService } from "../services";
import type { BulkSalaryStructureImportResult } from "../types";

interface BulkSalaryStructureDialogProps {
  open: boolean;
  onClose: () => void;
}

export function BulkSalaryStructureDialog({ open, onClose }: BulkSalaryStructureDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [importResult, setImportResult] = useState<BulkSalaryStructureImportResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const bulkImport = useBulkImportSalaryStructures();
  const toast = useToast();

  function handleClose() {
    setFile(null);
    setImportResult(null);
    onClose();
  }

  async function handleDownloadTemplate() {
    setIsDownloading(true);
    try {
      const blob = await payrollService.downloadSalaryStructureTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `salary_structures_template_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Template downloaded", "Fill in the salaries and upload the file.");
    } catch (err) {
      toast.error("Download failed", getApiErrorMessage(err, "Failed to download template"));
    } finally {
      setIsDownloading(false);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      validateAndSetFile(selected);
    }
  }

  function validateAndSetFile(selected: File) {
    const lowerName = selected.name.toLowerCase();
    if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".xls") && !lowerName.endsWith(".csv")) {
      toast.error("Invalid file format", "Please select an Excel (.xlsx, .xls) or CSV (.csv) file.");
      return;
    }
    setFile(selected);
    setImportResult(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      validateAndSetFile(dropped);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("No file selected", "Please choose an Excel or CSV file to import.");
      return;
    }

    bulkImport.mutate(file, {
      onSuccess: (result) => {
        setImportResult(result);
        if (result.failedCount === 0) {
          toast.success("Import successful", result.message);
        } else if (result.successCount > 0) {
          toast.warning("Partially imported", result.message);
        } else {
          toast.error("Import failed", result.message);
        }
      },
      onError: (err) => {
        toast.error("Import error", getApiErrorMessage(err, "Failed to import salary structures"));
      },
    });
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={importResult ? "Salary Structure Import Summary" : "Bulk Import Salary Structures"}
      size={importResult ? "lg" : "md"}
    >
      {importResult ? (
        <div className="space-y-5 p-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-surface-elevated p-3.5 text-center">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Rows</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{importResult.totalRows}</p>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-center">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Succeeded
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {importResult.successCount}
              </p>
            </div>

            <div
              className={`rounded-xl border p-3.5 text-center ${
                importResult.failedCount > 0
                  ? "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  : "border-border bg-surface-elevated text-muted-foreground"
              }`}
            >
              <p className="text-xs font-medium uppercase tracking-wider">Failed / Skipped</p>
              <p className="mt-1 text-2xl font-bold">{importResult.failedCount}</p>
            </div>
          </div>

          {/* Success Banner */}
          {importResult.successCount > 0 && importResult.failedCount === 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-semibold">All salary structures configured successfully!</p>
                <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                  {importResult.successCount} employee salary structures have been updated and are now active.
                </p>
              </div>
            </div>
          )}

          {/* Errors list */}
          {importResult.errors && importResult.errors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-4 w-4" />
                <span>Errors / Warnings ({importResult.errors.length})</span>
              </div>
              <div className="max-h-56 overflow-y-auto rounded-xl border border-border bg-surface-muted/40 p-3 space-y-1.5 text-xs">
                {importResult.errors.map((err, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-foreground/90">
                    <span className="font-mono text-muted-foreground shrink-0">•</span>
                    <span>{err}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                You can correct these rows in your Excel file and re-upload them at any time.
              </p>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                setImportResult(null);
                setFile(null);
              }}
              className="text-xs font-medium text-primary hover:underline"
            >
              ← Upload another file
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-all hover:brightness-110"
            >
              Done & View Payroll
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* Step 1: Download Template */}
          <div className="rounded-2xl border border-border bg-surface-muted/30 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Step 1: Download Pre-filled Template</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Contains all active employees. Only the monthly salary or stipend needs to be filled in.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleDownloadTemplate()}
                disabled={isDownloading}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow transition hover:bg-muted disabled:opacity-60"
              >
                {isDownloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5 text-primary" />
                )}
                <span>Download .xlsx</span>
              </button>
            </div>
          </div>

          {/* Step 2: Upload Area */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-foreground">
              Step 2: Upload Completed File (.xlsx, .xls, .csv)
            </label>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                isDragOver
                  ? "border-primary bg-primary/5"
                  : file
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-border bg-card hover:border-primary/50 hover:bg-muted/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />

              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="ml-2 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    Click to browse or drag and drop your file here
                  </p>
                  <p className="text-xs text-muted-foreground">Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv)</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Rules Helper Box */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5 text-xs text-blue-900 dark:text-blue-200 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-300">
              <Info className="h-3.5 w-3.5 shrink-0" />
              <span>How it works:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-1">
              <li>
                <strong className="text-foreground">Full-Time Employees</strong>: Enter monthly salary. Basic (60%),
                HRA (24%), Special (10%), and Other (6%) are automatically calculated.
              </li>
              <li>
                <strong className="text-foreground">Interns</strong>: Enter monthly stipend. Mapped directly as 100%
                stipend.
              </li>
              <li>
                <strong className="text-foreground">Non-technical friendly</strong>: Currency signs (₹, $), commas,
                and spaces are auto-cleaned. Effective date defaults to 1st of current month if blank.
              </li>
            </ul>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={bulkImport.isPending}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || bulkImport.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-all hover:brightness-110 disabled:opacity-60"
            >
              {bulkImport.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Importing Salaries...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" />
                  <span>Import Salaries</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
