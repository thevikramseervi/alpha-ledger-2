"use client";

import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  LineChart,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TRANSACTION_TYPE_LABELS } from "@/lib/format";
import { TransactionType } from "@/types";

const TRANSACTION_TYPES: TransactionType[] = [
  "INCOME",
  "EXPENSE",
  "INVESTMENT",
  "TRANSFER",
];

const TYPE_CONFIG: Record<
  TransactionType,
  {
    icon: LucideIcon;
    idle: string;
    active: string;
    iconIdle: string;
    iconActive: string;
  }
> = {
  INCOME: {
    icon: ArrowDownLeft,
    idle:
      "border-border/70 bg-card/30 hover:border-emerald-500/35 hover:bg-emerald-500/[0.06]",
    active:
      "border-emerald-500/45 bg-emerald-500/10 text-emerald-300 shadow-[0_0_0_1px_rgba(16,185,129,0.15)]",
    iconIdle: "text-muted-foreground",
    iconActive: "text-emerald-400",
  },
  EXPENSE: {
    icon: ArrowUpRight,
    idle:
      "border-border/70 bg-card/30 hover:border-rose-500/35 hover:bg-rose-500/[0.06]",
    active:
      "border-rose-500/45 bg-rose-500/10 text-rose-300 shadow-[0_0_0_1px_rgba(244,63,94,0.15)]",
    iconIdle: "text-muted-foreground",
    iconActive: "text-rose-400",
  },
  INVESTMENT: {
    icon: LineChart,
    idle:
      "border-border/70 bg-card/30 hover:border-indigo-500/35 hover:bg-indigo-500/[0.06]",
    active:
      "border-indigo-500/45 bg-indigo-500/10 text-indigo-200 shadow-[0_0_0_1px_rgba(99,102,241,0.15)]",
    iconIdle: "text-muted-foreground",
    iconActive: "text-indigo-300",
  },
  TRANSFER: {
    icon: ArrowLeftRight,
    idle:
      "border-border/70 bg-card/30 hover:border-sky-500/35 hover:bg-sky-500/[0.06]",
    active:
      "border-sky-500/45 bg-sky-500/10 text-sky-200 shadow-[0_0_0_1px_rgba(14,165,233,0.15)]",
    iconIdle: "text-muted-foreground",
    iconActive: "text-sky-300",
  },
};

interface TransactionTypeSelectorProps {
  value: TransactionType | "";
  onChange: (type: TransactionType) => void;
}

export function TransactionTypeSelector({
  value,
  onChange,
}: TransactionTypeSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Transaction type"
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
    >
      {TRANSACTION_TYPES.map((type) => {
        const config = TYPE_CONFIG[type];
        const Icon = config.icon;
        const selected = value === type;

        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(type)}
            className={cn(
              "group flex flex-col items-center gap-1 rounded-xl border px-1.5 py-2.5 transition-all duration-200 sm:px-2",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
              selected ? config.active : config.idle,
            )}
          >
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-lg border border-transparent transition-colors",
                selected
                  ? "border-white/10 bg-white/5"
                  : "bg-muted/40 group-hover:bg-muted/60",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  selected ? config.iconActive : config.iconIdle,
                )}
              />
            </span>
            <span className="text-[0.6875rem] font-medium tracking-wide sm:text-xs">
              {TRANSACTION_TYPE_LABELS[type]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
