import { canonicalSourceKey, prettySource } from "../utils/source";

import type { SourceBreakdownRow } from "../types";

interface SourceBreakdownChartProps {
  data: SourceBreakdownRow[];
}

const SOURCE_BAR_COLORS: Record<string, string> = {
  college: "bg-sky-500",
  linkedin: "bg-blue-600",
  referral: "bg-emerald-500",
  walk_in: "bg-rose-500",
  other: "bg-amber-500",
};

function sourceBarColor(source: string): string {
  return SOURCE_BAR_COLORS[canonicalSourceKey(source)] ?? "bg-violet-500";
}

/**
 * Horizontal bars styled to match the reference: source label + count/% on a row,
 * fill bar below. Custom (not recharts) - much cleaner for this layout.
 */
export function SourceBreakdownChart({ data }: SourceBreakdownChartProps) {
  if (data.length === 0) {
    return <p className="py-6 text-sm text-slate-400">No source data.</p>;
  }

  const rows = mergeSourceRows(data);
  const max = Math.max(...rows.map((d) => d.count), 1);

  return (
    <ul className="space-y-4">
      {rows.map((row) => (
        <li key={row.source}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">{prettySource(row.source)}</span>
            <span className="text-xs text-slate-500">
              {row.count.toLocaleString()} &middot; {row.pct.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${sourceBarColor(row.source)}`}
              style={{ width: `${(row.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
function mergeSourceRows(data: SourceBreakdownRow[]): SourceBreakdownRow[] {
  const counts = new Map<string, number>();

  data.forEach((row) => {
    const key = canonicalSourceKey(row.source);
    counts.set(key, (counts.get(key) ?? 0) + row.count);
  });

  const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);

  return Array.from(counts, ([source, count]) => ({
    source,
    count,
    pct: total === 0 ? 0 : (count * 100) / total,
  })).sort((a, b) => b.count - a.count);
}
