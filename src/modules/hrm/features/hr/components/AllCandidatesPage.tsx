import { useEffect, useMemo, useRef, useState } from "react";

import { ChevronDown, Download, Plus, Upload } from "lucide-react";

import { useAuth } from "@features/auth";
import { useToast } from "@shared/components/feedback";
import { PageHeader, StaggerContainer, StaggerItem } from "@shared/components/ui";
import { getApiErrorMessage } from "@shared/lib";

import { AddCandidateDialog } from "./AddCandidateDialog";
import { BulkUploadDialog } from "./BulkUploadDialog";
import { CandidatesSection } from "./CandidatesSection";
import { hrService } from "../services";

import type { Candidate, DateRange } from "../types";

type Dialog = "none" | "bulkUpload" | "addCandidate";

export function AllCandidatesPage() {
  const initialRange = useMemo<DateRange>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 29);
    return { from, to };
  }, []);
  const [range] = useState<DateRange>(initialRange);
  const [dialog, setDialog] = useState<Dialog>("none");
  const [importExportOpen, setImportExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const importExportRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const toast = useToast();

  useEffect(() => {
    if (!importExportOpen) return;

    function handleOutsideClick(event: MouseEvent) {
      if (importExportRef.current && !importExportRef.current.contains(event.target as Node)) {
        setImportExportOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [importExportOpen]);

  function openImport() {
    setImportExportOpen(false);
    setDialog("bulkUpload");
  }

  async function exportCandidates() {
    setImportExportOpen(false);
    setExporting(true);

    try {
      const candidates: Candidate[] = [];
      let page = 0;
      let hasNext = true;

      while (hasNext) {
        const result = await hrService.listCandidates({
          range,
          page,
          size: 100,
          sort: "createdAt,desc",
        });
        candidates.push(...result.items);
        hasNext = result.meta.hasNext;
        page += 1;
      }

      downloadCandidateCsv(candidates);
      toast.success("Candidates exported", `${candidates.length} candidates downloaded.`);
    } catch (err) {
      toast.error("Couldn't export candidates", getApiErrorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  return (
    <StaggerContainer className="space-y-5">
      <StaggerItem>
        <PageHeader
          eyebrow="Candidate Pipeline"
          title="All Candidates"
          description="Search, filter, review, and progress every applicant from one workspace"
          actions={
            <>
              <ImportExportMenu
                open={importExportOpen}
                exporting={exporting}
                menuRef={importExportRef}
                onToggle={() => setImportExportOpen((current) => !current)}
                onImport={openImport}
                onExport={() => void exportCandidates()}
              />
              <PrimaryButton
                icon={<Plus size={14} />}
                label="Candidate"
                onClick={() => setDialog("addCandidate")}
              />
            </>
          }
        />
      </StaggerItem>

      <StaggerItem variant="card">
        <CandidatesSection range={range} showRecruiter={user?.role === "HR"} />
      </StaggerItem>

      <BulkUploadDialog open={dialog === "bulkUpload"} onClose={() => setDialog("none")} />
      <AddCandidateDialog open={dialog === "addCandidate"} onClose={() => setDialog("none")} />
    </StaggerContainer>
  );
}

interface ButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: (() => void) | undefined;
}

interface ImportExportMenuProps {
  open: boolean;
  exporting: boolean;
  menuRef: React.RefObject<HTMLDivElement>;
  onToggle: () => void;
  onImport: () => void;
  onExport: () => void;
}

function ImportExportMenu({
  open,
  exporting,
  menuRef,
  onToggle,
  onImport,
  onExport,
}: ImportExportMenuProps) {
  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface-elevated px-3 text-sm font-medium text-foreground transition-colors hover:border-border hover:bg-surface-hover"
      >
        <Upload size={14} />
        Import / Export
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-surface-elevated p-1.5 shadow-lg"
        >
          <MenuItem icon={<Upload size={15} />} label="Import" onClick={onImport} />
          <MenuItem
            icon={<Download size={15} />}
            label={exporting ? "Exporting" : "Export"}
            onClick={onExport}
            disabled={exporting}
          />
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  disabled = false,
}: ButtonProps & { disabled?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      {icon}
      {label}
    </button>
  );
}

function PrimaryButton({ icon, label, onClick }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white shadow transition-colors hover:bg-primary/90"
    >
      {icon}
      {label}
    </button>
  );
}

function downloadCandidateCsv(candidates: Candidate[]): void {
  const columns: Array<[string, (candidate: Candidate) => string | number | null]> = [
    ["ID", (candidate) => candidate.id],
    ["Name", (candidate) => candidate.name],
    ["Email", (candidate) => candidate.email],
    ["Phone", (candidate) => candidate.phone],
    ["Source", (candidate) => candidate.source],
    ["Status", (candidate) => candidate.status],
    ["Recruiter", (candidate) => candidate.recruiterName],
    ["City", (candidate) => candidate.city],
    ["Experience", (candidate) => candidate.experience],
    ["Education", (candidate) => candidate.education],
    ["Created At", (candidate) => candidate.createdAt],
    ["Updated At", (candidate) => candidate.updatedAt],
  ];

  const rows = [
    columns.map(([heading]) => csvCell(heading)).join(","),
    ...candidates.map((candidate) =>
      columns.map(([, value]) => csvCell(value(candidate))).join(","),
    ),
  ];
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `candidates-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number | null): string {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}
