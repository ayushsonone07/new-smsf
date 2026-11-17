import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  FileText,
  Filter,
  Globe,
  Lock,
  MapPin,
  Printer,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";

import { useAuth } from "@features/auth";
import { Card, PageHeader } from "@shared/components/ui";

import { useCurrentPolicy, useMyPolicyStatus, usePolicyAcknowledgments } from "../hooks";
import type { EmployeePolicyAcknowledgmentItem, PolicySection } from "../types";

const SECTION_ICONS: Record<number, any> = {
  1: UserCheck,
  2: Clock,
  3: Calendar,
  4: FileText,
  5: AlertTriangle,
  6: ShieldCheck,
  7: Lock,
  8: Building2,
  9: FileCheck2,
  10: ShieldAlert,
  11: Shield,
  12: FileText,
  13: Lock,
  14: FileText,
  15: MapPin,
};

export function CompanyPolicyPage() {
  const { role } = useAuth();
  const canManage = role === "ADMIN" || role === "HR" || role === "HR_HEAD" || role === "SUB_HR";

  const [activeTab, setActiveTab] = useState<"document" | "acknowledgments">("document");
  const { data: policy, isLoading: isPolicyLoading } = useCurrentPolicy();
  const { data: myStatus } = useMyPolicyStatus();
  const { data: acksSummary, isLoading: isAcksLoading } = usePolicyAcknowledgments(canManage);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACCEPTED" | "PENDING">("ALL");

  const sections: PolicySection[] = policy?.sections ?? [];

  const filteredSections = sections.filter((sec) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      sec.title.toLowerCase().includes(term) ||
      sec.points.some((p) => p.toLowerCase().includes(term))
    );
  });

  const acksList = acksSummary?.acknowledgments ?? [];

  const filteredAcks = useMemo(() => {
    return acksList.filter((item) => {
      const matchSearch =
        !search.trim() ||
        (item.employeeName && item.employeeName.toLowerCase().includes(search.toLowerCase())) ||
        (item.employeeCode && item.employeeCode.toLowerCase().includes(search.toLowerCase())) ||
        (item.signatureName && item.signatureName.toLowerCase().includes(search.toLowerCase())) ||
        (item.departmentName && item.departmentName.toLowerCase().includes(search.toLowerCase()));

      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACCEPTED" && item.acknowledged) ||
        (statusFilter === "PENDING" && !item.acknowledged);

      return matchSearch && matchStatus;
    });
  }, [acksList, search, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Policies"
        description="Official Employee Policies, Code of Conduct, and Compliance Guidelines of MBG Card India Pvt. Ltd."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-elevated px-3 text-xs font-semibold text-foreground hover:bg-surface-muted transition shadow-sm"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        }
      />

      {/* Tabs Header (Visible to HR & Admin) */}
      {canManage && (
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("document");
              setSearch("");
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === "document"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
            }`}
          >
            <FileText className="h-4 w-4" />
            Policy Document (15 Sections)
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("acknowledgments");
              setSearch("");
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === "acknowledgments"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            Employee Sign-offs & Audit Log
            {acksSummary && (
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  activeTab === "acknowledgments"
                    ? "bg-white/20 text-white"
                    : "bg-surface-muted text-muted-foreground"
                }`}
              >
                {acksSummary.acceptedCount} / {acksSummary.totalEmployees}
              </span>
            )}
          </button>
        </div>
      )}

      {/* TAB 1: Policy Document View */}
      {activeTab === "document" && (
        <div className="space-y-6">
          {/* Employee's own Acknowledgment Status Card */}
          {myStatus?.acknowledged ? (
            <Card className="border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <div>
                  <span className="font-bold text-sm block">Your Acknowledgment is Recorded</span>
                  <span>
                    Digitally signed by <strong>{myStatus.signatureName || myStatus.employeeName}</strong> ({myStatus.employeeCode}) on{" "}
                    {myStatus.acceptedAt
                      ? new Date(myStatus.acceptedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Active"}
                    .
                  </span>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                Version {myStatus.policyVersion || "v1.0"}
              </span>
            </Card>
          ) : (
            <Card className="border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <div>
                  <span className="font-bold text-sm block">Acknowledgment Pending</span>
                  <span>Please review and digitally acknowledge the company policies.</span>
                </div>
              </div>
            </Card>
          )}

          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search policy points (e.g. probation, notice, leaves)..."
              className="h-10 w-full rounded-lg border border-border bg-surface-elevated pl-9 pr-3 text-xs font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Sections List */}
          <div className="space-y-4">
            {isPolicyLoading ? (
              <div className="py-20 text-center text-sm text-muted-foreground">
                Loading official policy documentation...
              </div>
            ) : filteredSections.length === 0 ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                No policy matching "{search}" found.
              </Card>
            ) : (
              filteredSections.map((sec) => {
                const Icon = SECTION_ICONS[sec.sectionNumber] || FileText;
                return (
                  <Card key={sec.sectionNumber} className="p-5 space-y-3 shadow-sm hover:border-primary/40 transition">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                        {sec.sectionNumber}
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <h3 className="text-base font-bold text-foreground">{sec.title}</h3>
                      </div>
                    </div>

                    <ul className="space-y-2 text-sm text-foreground/90 pl-3">
                      {sec.points.map((pt, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: HR / Admin Audit Log & Sign-offs */}
      {canManage && activeTab === "acknowledgments" && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-xs font-medium text-muted-foreground block">Total Employees</span>
                <span className="text-2xl font-bold text-foreground">{acksSummary?.totalEmployees ?? 0}</span>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
            </Card>

            <Card className="p-4 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-xs font-medium text-muted-foreground block">Signed & Acknowledged</span>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {acksSummary?.acceptedCount ?? 0}
                  {acksSummary && acksSummary.totalEmployees > 0 && (
                    <span className="text-xs font-normal text-muted-foreground ml-1.5">
                      ({((acksSummary.acceptedCount / acksSummary.totalEmployees) * 100).toFixed(0)}%)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </Card>

            <Card className="p-4 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-xs font-medium text-muted-foreground block">Pending Sign-off</span>
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {acksSummary?.pendingCount ?? 0}
                </span>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
            </Card>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by employee name, code, or signature..."
                className="h-10 w-full rounded-lg border border-border bg-surface-elevated pl-9 pr-3 text-xs font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-surface-elevated p-1 rounded-lg border border-border">
              {(["ALL", "ACCEPTED", "PENDING"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setStatusFilter(mode)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                    statusFilter === mode
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {mode === "ALL" ? "All" : mode === "ACCEPTED" ? "Signed" : "Pending"}
                </button>
              ))}
            </div>
          </div>

          {/* Audit Log Table */}
          <Card className="overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-muted/50 text-muted-foreground font-semibold border-b border-border uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Accepted Date & Time</th>
                    <th className="px-4 py-3">Digital Signature</th>
                    <th className="px-4 py-3">IP Address (Proof)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isAcksLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        Loading employee acknowledgments...
                      </td>
                    </tr>
                  ) : filteredAcks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        No employee records found.
                      </td>
                    </tr>
                  ) : (
                    filteredAcks.map((item) => (
                      <tr key={item.employeeId} className="hover:bg-surface-muted/30 transition">
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-foreground text-sm">
                            {item.employeeName || "—"}
                          </div>
                          <span className="text-xs text-muted-foreground">{item.employeeCode}</span>
                        </td>
                        <td className="px-4 py-3.5 text-foreground/80">
                          {item.departmentName || "—"}
                          {item.designationTitle && (
                            <span className="block text-[11px] text-muted-foreground">
                              {item.designationTitle}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {item.acknowledged ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" /> Signed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                              <Clock className="h-3 w-3" /> Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-foreground">
                          {item.acceptedAt ? (
                            <span>
                              {new Date(item.acceptedAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">Not signed yet</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {item.signatureName ? (
                            <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                              {item.signatureName}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {item.ipAddress ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                              <Globe className="h-3 w-3 text-muted-foreground/70" />
                              {item.ipAddress}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
