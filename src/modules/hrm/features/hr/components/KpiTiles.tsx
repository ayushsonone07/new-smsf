import {
  AlertCircle,
  CalendarRange,
  Layers3,
  MessageSquare,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

import { AnimatedNumber } from "@shared/components/ui";

import { prettySource } from "../utils/source";

import type { KpiData } from "../types";

interface KpiTilesProps {
  data: KpiData | undefined;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Top-of-page KPI grid (9 tiles, 4 + 5 across).
 * Each tile has an icon-in-tinted-square accent in the top right.
 * Hover lifts the card subtly so the grid feels interactive.
 */
export function KpiTiles({ data, isLoading, error }: KpiTilesProps) {
  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Couldn’t load KPIs: {error.message}
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonTile key={i} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonTile key={i} />
          ))}
        </div>
      </div>
    );
  }

  const growthUp = data.monthOverMonthGrowthPct >= 0;
  const growthLabel = `${growthUp ? "+" : ""}${data.monthOverMonthGrowthPct.toFixed(1)}% MoM`;
  const dupAmber = data.phoneDuplicates > 0;

  return (
    <div className="space-y-3">
      {/* Row 1: headline counts */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile
          label="Total candidates"
          value={formatInt(data.totalCandidates)}
          icon={Users}
          tone="indigo"
        />
        <Tile
          label="Added today"
          value={formatInt(data.addedToday)}
          icon={Sparkles}
          tone="emerald"
        />
        <Tile
          label="This week"
          value={formatInt(data.addedThisWeek)}
          icon={CalendarRange}
          tone="cyan"
        />
        <Tile
          label="This month"
          value={formatInt(data.addedThisMonth)}
          icon={growthUp ? TrendingUp : TrendingDown}
          tone="violet"
          footer={
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                growthUp ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
              }`}
            >
              {growthUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {growthLabel}
            </span>
          }
        />
      </div>

      {/* Row 2: insights */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Tile
          label="Top source"
          value={data.topSource ? prettySource(data.topSource.source) : "—"}
          icon={Trophy}
          tone="amber"
          valueClass="text-xl"
          footer={
            data.topSource ? (
              <span className="text-xs text-slate-500">
                {formatInt(data.topSource.count)} | {data.topSource.pct.toFixed(1)}%
              </span>
            ) : (
              <span className="text-xs text-slate-400">No candidates yet</span>
            )
          }
        />
        <Tile
          label="Active sources"
          value={formatInt(data.activeSources)}
          icon={Layers3}
          tone="sky"
        />
        <Tile
          label="Phone duplicates"
          value={formatInt(data.phoneDuplicates)}
          icon={AlertCircle}
          tone={dupAmber ? "rose" : "slate"}
          valueClass={dupAmber ? "text-amber-600" : undefined}
        />
        <Tile
          label="With remarks"
          value={`${data.withRemarksPct.toFixed(1)}%`}
          icon={MessageSquare}
          tone="fuchsia"
        />
        <Tile
          label="Updated (7d)"
          value={formatInt(data.updatedLast7Days)}
          icon={RefreshCw}
          tone="slate"
        />
      </div>
    </div>
  );
}

/* ── tile ────────────────────────────────────────────────── */

type Tone =
  | "indigo"
  | "emerald"
  | "cyan"
  | "violet"
  | "amber"
  | "sky"
  | "rose"
  | "fuchsia"
  | "slate";

/** Pre-baked tone classes — Tailwind must see them as literal strings to keep them in the build. */
const TONE_CLASSES: Record<Tone, { bg: string; text: string; ring: string }> = {
  indigo: { bg: "bg-indigo-50", text: "text-indigo-600", ring: "ring-indigo-100" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-100" },
  cyan: { bg: "bg-cyan-50", text: "text-cyan-600", ring: "ring-cyan-100" },
  violet: { bg: "bg-violet-50", text: "text-violet-600", ring: "ring-violet-100" },
  amber: { bg: "bg-amber-50", text: "text-amber-600", ring: "ring-amber-100" },
  sky: { bg: "bg-sky-50", text: "text-sky-600", ring: "ring-sky-100" },
  rose: { bg: "bg-rose-50", text: "text-rose-600", ring: "ring-rose-100" },
  fuchsia: { bg: "bg-fuchsia-50", text: "text-fuchsia-600", ring: "ring-fuchsia-100" },
  slate: { bg: "bg-slate-100", text: "text-slate-500", ring: "ring-slate-200" },
};

interface TileProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: Tone;
  footer?: React.ReactNode | undefined;
  valueClass?: string | undefined;
}

function Tile({ label, value, icon: Icon, tone, footer, valueClass }: TileProps) {
  const t = TONE_CLASSES[tone];
  return (
    <div
      className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-slate-950/90" />
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <span
          className={`grid h-8 w-8 place-items-center rounded-lg ring-1 ring-inset transition-transform group-hover:scale-105 ${t.bg} ${t.text} ${t.ring}`}
        >
          <Icon size={16} />
        </span>
      </div>
      <p className={`mt-2 font-semibold text-slate-900 ${valueClass ?? "text-2xl"}`}>
        <AnimatedNumber value={value} />
      </p>
      {footer ? <div className="mt-2">{footer}</div> : null}
    </div>
  );
}

function SkeletonTile() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow">
      <div className="flex items-start justify-between">
        <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
        <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-100" />
      </div>
      <div className="mt-3 h-7 w-20 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

/* ── helpers ───────────────────────────────────────────────── */

function formatInt(n: number): string {
  return n.toLocaleString();
}
