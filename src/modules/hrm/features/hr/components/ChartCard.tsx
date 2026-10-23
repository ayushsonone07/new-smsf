import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  children: ReactNode;
  isLoading?: boolean;
  error?: Error | null;
  className?: string | undefined;
}

/** Card shell shared by all chart components in the HR dashboard. */
export function ChartCard({ title, children, isLoading, error, className }: ChartCardProps) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-5 shadow ${className ?? ""}`}>
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <span className="h-2 w-2 rounded-full bg-cyan-500" />
      </div>
      {error ? (
        <p className="text-sm text-rose-600">Failed to load: {error.message}</p>
      ) : isLoading ? (
        <div className="h-48 animate-pulse rounded-lg bg-slate-100" />
      ) : (
        children
      )}
    </div>
  );
}
