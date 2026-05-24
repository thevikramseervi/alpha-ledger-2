"use client";

import Link from "next/link";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Percent,
  PiggyBank,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MonthlySummary, TransactionType } from "@/types";
import {
  computePeriodComparison,
  computeSavingsRate,
  DashboardStatKey,
  formatComparisonLine,
  formatSavingsRate,
  getComparisonTone,
  pickSummaryValue,
} from "@/lib/dashboard-analytics";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface StatsCardsProps {
  summary: MonthlySummary;
  previousMonthSummary?: MonthlySummary | null;
  sameMonthLastYearSummary?: MonthlySummary | null;
}

const cards: Array<{
  key: DashboardStatKey;
  label: string;
  icon: typeof ArrowUpCircle;
  accent: string;
  glow: string;
  typeFilter: TransactionType | null;
  linkLabel: string;
}> = [
  {
    key: "income",
    label: "Income",
    icon: ArrowUpCircle,
    accent: "text-emerald-400",
    glow: "from-emerald-500/20",
    typeFilter: "INCOME",
    linkLabel: "View income transactions",
  },
  {
    key: "expenses",
    label: "Expenses",
    icon: ArrowDownCircle,
    accent: "text-rose-400",
    glow: "from-rose-500/20",
    typeFilter: "EXPENSE",
    linkLabel: "View expense transactions",
  },
  {
    key: "investments",
    label: "Investments",
    icon: TrendingUp,
    accent: "text-indigo-400",
    glow: "from-indigo-500/20",
    typeFilter: "INVESTMENT",
    linkLabel: "View investment transactions",
  },
  {
    key: "netSavings",
    label: "Net Savings",
    icon: PiggyBank,
    accent: "text-amber-400",
    glow: "from-amber-500/20",
    typeFilter: null,
    linkLabel: "View all transactions this month",
  },
];

function getTransactionsHref(
  year: number,
  month: number,
  typeFilter: TransactionType | null,
) {
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
  });
  if (typeFilter) {
    params.set("type", typeFilter);
  }
  return `/transactions?${params.toString()}`;
}

function ComparisonLines({
  statKey,
  current,
  previousMonthSummary,
  sameMonthLastYearSummary,
}: {
  statKey: DashboardStatKey | "savingsRate";
  current: number;
  previousMonthSummary?: MonthlySummary | null;
  sameMonthLastYearSummary?: MonthlySummary | null;
}) {
  const mom =
    statKey === "savingsRate"
      ? computePeriodComparison(
          current,
          previousMonthSummary
            ? computeSavingsRate(
                previousMonthSummary.income,
                previousMonthSummary.netSavings,
              ) ?? undefined
            : undefined,
          "vs last month",
        )
      : computePeriodComparison(
          current,
          pickSummaryValue(previousMonthSummary, statKey as DashboardStatKey),
          "vs last month",
        );

  const yoy =
    statKey === "savingsRate"
      ? computePeriodComparison(
          current,
          sameMonthLastYearSummary
            ? computeSavingsRate(
                sameMonthLastYearSummary.income,
                sameMonthLastYearSummary.netSavings,
              ) ?? undefined
            : undefined,
          "vs last year",
        )
      : computePeriodComparison(
          current,
          pickSummaryValue(sameMonthLastYearSummary, statKey as DashboardStatKey),
          "vs last year",
        );

  if (!mom && !yoy) {
    return null;
  }

  return (
    <div className="mt-2 space-y-0.5">
      {[mom, yoy].map((comparison) => {
        if (!comparison) {
          return null;
        }

        const tone = getComparisonTone(statKey, comparison.delta);

        return (
          <p
            key={comparison.label}
            className={cn(
              "text-xs tabular-nums",
              tone === "positive" && "text-emerald-400/90",
              tone === "negative" && "text-rose-400/90",
              tone === "neutral" && "text-muted-foreground",
            )}
          >
            {formatComparisonLine(comparison)}
          </p>
        );
      })}
    </div>
  );
}

export function StatsCards({
  summary,
  previousMonthSummary,
  sameMonthLastYearSummary,
}: StatsCardsProps) {
  const savingsRate = computeSavingsRate(summary.income, summary.netSavings);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        const value = summary[card.key];
        const isNegative = card.key === "netSavings" && value < 0;
        const href = getTransactionsHref(summary.year, summary.month, card.typeFilter);

        return (
          <Link
            key={card.key}
            href={href}
            aria-label={card.linkLabel}
            className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Card
              className={cn(
                "relative h-full overflow-hidden border-border/60 bg-card/50 backdrop-blur-sm",
                "transition-colors hover:border-border hover:bg-card/70",
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-60 transition-opacity group-hover:opacity-80",
                  card.glow,
                )}
              />
              <CardContent className="relative p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {card.label}
                  </span>
                  <div className="rounded-lg bg-background/60 p-2 ring-1 ring-border/60">
                    <Icon className={cn("h-4 w-4", card.accent)} />
                  </div>
                </div>
                <p
                  className={cn(
                    "text-2xl font-semibold tracking-tight tabular-nums",
                    isNegative && "text-rose-400",
                  )}
                >
                  {formatCurrency(value)}
                </p>
                <ComparisonLines
                  statKey={card.key}
                  current={value}
                  previousMonthSummary={previousMonthSummary}
                  sameMonthLastYearSummary={sameMonthLastYearSummary}
                />
                <p className="mt-2 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  View transactions →
                </p>
              </CardContent>
            </Card>
          </Link>
        );
      })}

      <Link
        href={getTransactionsHref(summary.year, summary.month, null)}
        aria-label="View all transactions this month"
        className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Card
          className={cn(
            "relative h-full overflow-hidden border-border/60 bg-card/50 backdrop-blur-sm",
            "transition-colors hover:border-border hover:bg-card/70",
          )}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-transparent opacity-60 transition-opacity group-hover:opacity-80" />
          <CardContent className="relative p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Savings rate
              </span>
              <div className="rounded-lg bg-background/60 p-2 ring-1 ring-border/60">
                <Percent className="h-4 w-4 text-cyan-400" />
              </div>
            </div>
            <p
              className={cn(
                "text-2xl font-semibold tracking-tight tabular-nums",
                savingsRate !== null && savingsRate < 0 && "text-rose-400",
                savingsRate !== null && savingsRate >= 0 && "text-cyan-300",
              )}
            >
              {formatSavingsRate(savingsRate)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.income > 0
                ? `${formatCurrency(summary.netSavings)} of ${formatCurrency(summary.income)} income`
                : "Add income to calculate rate"}
            </p>
            {savingsRate !== null ? (
              <ComparisonLines
                statKey="savingsRate"
                current={savingsRate}
                previousMonthSummary={previousMonthSummary}
                sameMonthLastYearSummary={sameMonthLastYearSummary}
              />
            ) : null}
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
