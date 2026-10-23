function readVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return val ? `hsl(${val})` : fallback;
}

export interface ChartColors {
  grid: string;
  axis: string;
  tooltipBg: string;
  tooltipBorder: string;
  cursor: string;
}

export function resolveChartColors(): ChartColors {
  return {
    grid: readVar("--chart-grid", "#e2e8f0"),
    axis: readVar("--chart-axis", "#64748b"),
    tooltipBg: readVar("--card", "#ffffff"),
    tooltipBorder: readVar("--border", "#e2e8f0"),
    cursor: readVar("--muted", "#f1f5f9"),
  };
}
