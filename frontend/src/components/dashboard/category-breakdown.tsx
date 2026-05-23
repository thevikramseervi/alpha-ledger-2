import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MonthlySummary } from "@/types";
import {
  formatCurrency,
  TRANSACTION_TYPE_BG,
  TRANSACTION_TYPE_LABELS,
} from "@/lib/format";

interface CategoryBreakdownProps {
  summary: MonthlySummary;
}

export function CategoryBreakdown({ summary }: CategoryBreakdownProps) {
  const spendingCategories = summary.byCategory.filter(
    (item) => item.type === "EXPENSE" || item.type === "INVESTMENT",
  );
  const totalOutflow = summary.expenses + summary.investments;

  return (
    <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Spending by Category
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {spendingCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No spending recorded for this month.
          </p>
        ) : (
          spendingCategories.map((item) => {
            const percentage =
              totalOutflow > 0 ? (item.total / totalOutflow) * 100 : 0;

            return (
              <div key={item.categoryId} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium">{item.categoryName}</span>
                    <Badge
                      variant="outline"
                      className={TRANSACTION_TYPE_BG[item.type]}
                    >
                      {TRANSACTION_TYPE_LABELS[item.type]}
                    </Badge>
                  </div>
                  <span className="text-sm font-medium">
                    {formatCurrency(item.total)}
                  </span>
                </div>
                <Progress value={percentage} className="h-2 bg-muted/50" />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
