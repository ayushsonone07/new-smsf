import { FormEvent, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  FileText,
  Lock,
  MapPin,
  Printer,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

import { useAuth } from "@features/auth";
import { useToast } from "@shared/components/feedback";
import { getApiErrorMessage } from "@shared/lib";

import { useAcceptPolicy, useCurrentPolicy, useMyPolicyStatus } from "../hooks";
import type { PolicySection } from "../types";

const SECTION_ICONS: Record<number, any> = {
  1: UserCheck, // Employment & Probation
  2: Clock, // Working Hours
  3: Calendar, // Leaves
  4: FileText, // Notice Period
  5: AlertTriangle, // Absconding
  6: ShieldCheck, // Code of Conduct
  7: Lock, // Confidentiality
  8: Building2, // Assets
  9: FileCheck2, // Exit & F&F
  10: ShieldAlert, // Non-Solicitation
  11: Shield, // Non-Compete
  12: FileText, // IP
  13: Lock, // Salary Confidentiality
  14: FileText, // Expenses
  15: MapPin, // Transfer
};

export function PolicyAgreementModal() {
  const { user } = useAuth();
  const toast = useToast();
  const { data: myStatus, isLoading: statusLoading } = useMyPolicyStatus(!!user);
  const { data: policy, isLoading: policyLoading } = useCurrentPolicy(!!user);
  const acceptMutation = useAcceptPolicy();

  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [activeSection, setActiveSection] = useState<number>(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.name && !signatureName) {
      setSignatureName(user.name);
    }
  }, [user?.name, signatureName]);

  // Determine if modal should be shown
  // Only show if user is logged in, myStatus is loaded, and acknowledged is false
  const shouldShow =
    !!user &&
    !statusLoading &&
    myStatus !== undefined &&
    myStatus.acknowledged === false;

  function handleScroll() {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 80) {
      setHasScrolledToBottom(true);
    }
  }

  function scrollToSection(sectionNum: number) {
    setActiveSection(sectionNum);
    const element = document.getElementById(`policy-section-${sectionNum}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!agreed) {
      toast.error("Please tick the agreement checkbox to continue.");
      return;
    }
    if (!signatureName.trim()) {
      toast.error("Please enter your full name as digital signature.");
      return;
    }

    try {
      await acceptMutation.mutateAsync({
        policyVersion: policy?.version || "v1.0",
        signatureName: signatureName.trim(),
        agreed: true,
      });
      toast.success("Company policy acknowledged successfully. Welcome!");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to record agreement. Please try again."));
    }
  }

  if (!shouldShow) {
    return null;
  }

  const sections: PolicySection[] = policy?.sections ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-5 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-5xl h-[92vh] max-h-[900px] rounded-2xl bg-surface-elevated border border-border shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-6 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  {policy?.companyName || "MBG CARD INDIA PVT. LTD."}
                </span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {policy?.version || "v1.0"}
                </span>
              </div>
              <h2 className="text-lg font-bold text-foreground">
                {policy?.title || "Employee Policies & Code of Conduct"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-elevated px-3 text-xs font-semibold text-foreground hover:bg-surface-muted transition shadow-sm"
              title="Print Policy"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <span className="text-xs text-muted-foreground hidden sm:inline-block">
              Effective: {policy?.effectiveDate || "2026-01-01"}
            </span>
          </div>
        </div>

        {/* Notice Banner */}
        <div className="flex items-center gap-2.5 bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 text-xs text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>Mandatory Acknowledgment:</strong> As a new team member, please carefully read through all 15 company policies below and provide your digital signature to proceed to your workspace.
          </span>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Quick Jump Sidebar (Desktop) */}
          <div className="hidden lg:flex w-64 flex-col border-r border-border bg-surface-muted/30 p-3 overflow-y-auto">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2 pb-2">
              Sections (15 Policies)
            </span>
            <div className="space-y-1">
              {sections.map((sec) => {
                const Icon = SECTION_ICONS[sec.sectionNumber] || FileText;
                const isActive = activeSection === sec.sectionNumber;
                return (
                  <button
                    key={sec.sectionNumber}
                    type="button"
                    onClick={() => scrollToSection(sec.sectionNumber)}
                    className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">
                      {sec.sectionNumber}. {sec.title.split(" Policy")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable Document Body */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 bg-surface/50"
          >
            {policyLoading ? (
              <div className="py-20 text-center text-sm text-muted-foreground">
                Loading official policy documentation...
              </div>
            ) : (
              sections.map((sec) => {
                const Icon = SECTION_ICONS[sec.sectionNumber] || FileText;
                return (
                  <div
                    key={sec.sectionNumber}
                    id={`policy-section-${sec.sectionNumber}`}
                    className="rounded-xl border border-border bg-surface-elevated p-5 shadow-sm transition hover:border-primary/40 space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                        {sec.sectionNumber}
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <h3 className="text-base font-bold text-foreground">{sec.title}</h3>
                      </div>
                    </div>

                    <ul className="space-y-2 text-sm text-foreground/90 pl-2">
                      {sec.points.map((pt, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })
            )}

            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-xs text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="mx-auto h-5 w-5 mb-1 text-emerald-600 dark:text-emerald-400" />
              You have reviewed all 15 company policies. Please electronically sign below.
            </div>
          </div>
        </div>

        {/* Modal Acceptance Footer */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-border bg-surface p-4 sm:p-5 shadow-lg space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Full Legal Name (Digital Signature) <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                placeholder="Enter your full name"
                className="h-10 w-full rounded-lg border border-border bg-surface-elevated px-3 text-sm font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-foreground select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="leading-tight">
                  I, <strong>{signatureName || "Employee"}</strong>, have read, understood, and voluntarily agree to comply with all rules and employee policies of <strong>MBG Card India Pvt. Ltd.</strong>
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border/60">
            <span className="text-[11px] text-muted-foreground">
              Timestamp and IP address will be recorded upon submission as legal proof.
            </span>

            <button
              type="submit"
              disabled={!agreed || !signatureName.trim() || acceptMutation.isPending}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-xs font-semibold text-primary-foreground shadow transition hover:bg-primary/90 disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              {acceptMutation.isPending ? "Submitting..." : "Accept & Continue to Workspace"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
