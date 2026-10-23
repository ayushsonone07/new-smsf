import type { ReactNode } from "react";

import { Banknote, CreditCard, FileCheck2, Sigma, Wallet } from "lucide-react";

import { AnimatedNumber, Card } from "@shared/components/ui";

import { formatMoney } from "../lib/payrollFormat";

import type { PayrollSummary } from "../types";

interface MetricCardProps {
  label: string;
  value: number;
  sublabel?: string;
  icon: ReactNode;
  accent: string;
  format?: (value: number) => string;
}

function MetricCard({ label, value, sublabel, icon, accent, format }: MetricCardProps) {
  return (
    <Card padding="md" className="flex items-center gap-4">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${accent}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <AnimatedNumber
          value={value}
          duration={0.8}
          formatter={format ?? ((n) => String(Math.round(n)))}
          className="truncate text-lg font-bold text-foreground tabular-nums"
        />
        {sublabel ? <p className="truncate text-xs text-muted-foreground">{sublabel}</p> : null}
      </div>
    </Card>
  );
}

export function PayrollSummaryCards({ summary }: { summary: PayrollSummary }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Net Payable"
        value={Number(summary.totalNetSalary) || 0}
        sublabel={`${summary.totalEmployees} employee(s)`}
        icon={<Wallet className="h-5 w-5 text-emerald-600" />}
        accent="bg-emerald-100"
        format={(n) => `₹ ${formatMoney(n)}`}
      />
      <MetricCard
        label="Gross Salary"
        value={Number(summary.totalGrossSalary) || 0}
        icon={<Sigma className="h-5 w-5 text-sky-600" />}
        accent="bg-sky-100"
        format={(n) => `₹ ${formatMoney(n)}`}
      />
      <MetricCard
        label="Deductions"
        value={Number(summary.totalDeductions) || 0}
        icon={<CreditCard className="h-5 w-5 text-amber-600" />}
        accent="bg-amber-100"
        format={(n) => `₹ ${formatMoney(n)}`}
      />
      <MetricCard
        label="Paid"
        value={summary.paidCount}
        sublabel={`Approved: ${summary.approvedCount} · Processed: ${summary.processedCount}`}
        icon={<Banknote className="h-5 w-5 text-violet-600" />}
        accent="bg-violet-100"
      />
    </div>
  );
}

export function PayrollStagePills({ summary }: { summary: PayrollSummary }) {
  const stages = [
    { label: "Draft", value: summary.draftCount, className: "bg-muted text-muted-foreground" },
    { label: "Calculated", value: summary.calculatedCount, className: "bg-primary-soft text-primary" },
    { label: "Approved", value: summary.approvedCount, className: "bg-warning-soft text-warning" },
    { label: "Processed", value: summary.processedCount, className: "bg-info-soft text-info" },
    { label: "Paid", value: summary.paidCount, className: "bg-success-soft text-success" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {stages.map((stage) => (
        <span
          key={stage.label}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${stage.className}`}
        >
          <FileCheck2 className="h-3.5 w-3.5" />
          {stage.label}
          <span className="tabular-nums">{stage.value}</span>
        </span>
      ))}
    </div>
  );
}