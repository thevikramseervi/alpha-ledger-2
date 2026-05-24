/** Semantic chart colors aligned with transaction types and the dark UI. */
export const CHART_COLORS = {
  income: "#34d399",
  expense: "#fb7185",
  investment: "#818cf8",
  netSavings: "#fbbf24",
  transfer: "#38bdf8",
  netWorth: "#2dd4bf",
  grid: "rgba(255,255,255,0.06)",
  axis: "#94a3b8",
  tooltipBg: "rgba(15, 23, 42, 0.95)",
  tooltipBorder: "rgba(255,255,255,0.08)",
} as const;

export const chartTooltipStyle = {
  background: CHART_COLORS.tooltipBg,
  border: `1px solid ${CHART_COLORS.tooltipBorder}`,
  borderRadius: "12px",
  fontSize: "12px",
} as const;

export const chartAxisTick = { fill: CHART_COLORS.axis, fontSize: 12 } as const;

export function getDonutPalette(count: number) {
  const base = [
    "#34d399",
    "#60a5fa",
    "#a78bfa",
    "#f472b6",
    "#fbbf24",
    "#38bdf8",
    "#fb923c",
    "#4ade80",
  ];
  return Array.from({ length: count }, (_, index) => base[index % base.length]!);
}
