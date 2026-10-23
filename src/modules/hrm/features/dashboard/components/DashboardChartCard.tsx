import type { ReactNode } from "react";
import { motion } from "framer-motion";

import { cn } from "@hrm/lib/utils";

interface DashboardChartCardProps {
  title: string;
  children: ReactNode;
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function DashboardChartCard({
  title,
  children,
  loading = false,
  error = null,
  isEmpty = false,
  emptyMessage = "No data available",
  className,
}: DashboardChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn("mbg-card relative overflow-hidden bg-gradient-to-br from-card via-card to-surface-muted/20 p-4 sm:p-5 shadow-md hover:shadow-lg transition-shadow", className)}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-primary/50 to-transparent opacity-80" />
      <div className="mb-4 flex items-center justify-between border-b border-border/80 pb-3">
        <h3 className="text-sm font-bold tracking-tight text-card-foreground flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary shadow-sm" />
          {title}
        </h3>
      </div>
      {error ? (
        <div className="flex items-center gap-2 rounded-md bg-danger-soft p-3 text-xs text-danger">
          <svg
            className="h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
          {error}
        </div>
      ) : loading ? (
        <div className="space-y-3">
          <div className="h-48 animate-pulse rounded-lg bg-muted" />
          <div className="flex gap-4">
            <div className="h-3 flex-1 animate-pulse rounded bg-muted-foreground/20" />
            <div className="h-3 w-20 animate-pulse rounded bg-muted-foreground/20" />
          </div>
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <svg
            className="mb-2 h-10 w-10 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-3 3" />
          </svg>
          <p className="text-xs text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        children
      )}
    </motion.div>
  );
}
