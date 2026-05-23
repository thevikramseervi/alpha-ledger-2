import {
  ArrowDownCircle,
  ArrowUpCircle,
  PiggyBank,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MonthlySummary } from "@/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface StatsCardsProps {
  summary: MonthlySummary;
}

const cards = [
  {
    key: "income" as const,
    label: "Income",
    icon: ArrowUpCircle,
    accent: "text-emerald-400",
    glow: "from-emerald-500/20",
  },
  {
    key: "expenses" as const,
    label: "Expenses",
    icon: ArrowDownCircle,
    accent: "text-rose-400",
    glow: "from-rose-500/20",
  },
  {
    key: "investments" as const,
    label: "Investments",
    icon: TrendingUp,
    accent: "text-indigo-400",
    glow: "from-indigo-500/20",
  },
  {
    key: "netSavings" as const,
    label: "Net Savings",
    icon: PiggyBank,
    accent: "text-amber-400",
    glow: "from-amber-500/20",
  },
];

export function StatsCards({ summary }: StatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const value = summary[card.key];
        const isNegative = card.key === "netSavings" && value < 0;

        return (
          <Card
            key={card.key}
            className="relative overflow-hidden border-border/60 bg-card/50 backdrop-blur-sm"
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-60",
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
                  "text-2xl font-semibold tracking-tight",
                  isNegative && "text-rose-400",
                )}
              >
                {formatCurrency(value)}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
