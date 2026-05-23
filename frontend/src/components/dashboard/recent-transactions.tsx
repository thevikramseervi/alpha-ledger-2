"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Transaction } from "@/types";
import {
  formatCategoryLabel,
  formatCurrency,
  formatDate,
  formatTransferLabel,
  TRANSACTION_TYPE_BG,
  TRANSACTION_TYPE_LABELS,
} from "@/lib/format";

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">
          Recent Transactions
        </CardTitle>
        <Link
          href="/transactions"
          className="inline-flex h-7 items-center gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No transactions yet. Add your first one to get started.
          </p>
        ) : (
          transactions.slice(0, 6).map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-background/40 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{tx.description}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={TRANSACTION_TYPE_BG[tx.type]}
                  >
                    {TRANSACTION_TYPE_LABELS[tx.type]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {tx.type === "TRANSFER" && tx.toAccount
                      ? formatTransferLabel(tx.account.name, tx.toAccount.name)
                      : tx.account.name}
                    {tx.type !== "TRANSFER" && tx.category
                      ? ` · ${formatCategoryLabel(
                          tx.category.name,
                          tx.subCategory?.name,
                        )}`
                      : null}{" "}
                    · {formatDate(tx.date)}
                  </span>
                </div>
              </div>
              <p className="shrink-0 text-sm font-semibold">
                {formatCurrency(tx.amount)}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
