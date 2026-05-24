import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AllocationDonutChart } from "@/components/shared/allocation-donut-chart";
import { InvestmentCategorySummary } from "@/types";
import { formatCurrency } from "@/lib/format";

interface InvestmentCategoryBreakdownProps {
  title: string;
  description: string;
  total: number;
  categories: InvestmentCategorySummary[];
  emptyMessage: string;
}

export function InvestmentCategoryBreakdown({
  title,
  description,
  total,
  categories,
  emptyMessage,
}: InvestmentCategoryBreakdownProps) {
  return (
    <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
      <CardContent className="space-y-5 p-6">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        {categories.filter((category) => category.total > 0).length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <>
            <AllocationDonutChart
              slices={categories
                .filter((category) => category.total > 0)
                .map((category) => ({
                  id: category.categoryId ?? category.categoryName,
                  name: category.categoryName,
                  value: category.total,
                  color: category.color,
                }))}
              emptyMessage={emptyMessage}
            />
            {categories
            .filter((category) => category.total > 0)
            .map((category) => {
            const categoryPercentage =
              total > 0 ? (category.total / total) * 100 : 0;
            const visibleSubCategories = category.subCategories.filter(
              (subCategory) => subCategory.total > 0,
            );

            return (
              <div
                key={category.categoryId ?? category.categoryName}
                className="space-y-3 rounded-xl border border-border/50 bg-background/30 p-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="truncate text-sm font-medium">
                        {category.categoryName}
                      </span>
                    </div>
                    <span className="text-sm font-medium">
                      {formatCurrency(category.total)}
                    </span>
                  </div>
                  <Progress value={categoryPercentage} className="h-2 bg-muted/50" />
                  <p className="text-xs text-muted-foreground">
                    {category.count} transaction{category.count === 1 ? "" : "s"}
                  </p>
                </div>

                {visibleSubCategories.length > 0 ? (
                  <div className="space-y-2 border-t border-border/40 pt-3">
                    {visibleSubCategories.map((subCategory) => {
                      const subPercentage =
                        category.total > 0
                          ? (subCategory.total / category.total) * 100
                          : 0;

                      return (
                        <div
                          key={
                            subCategory.subCategoryId ?? subCategory.subCategoryName
                          }
                          className="space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate text-xs font-medium text-muted-foreground">
                              {subCategory.subCategoryName}
                            </span>
                            <span className="text-xs font-medium">
                              {formatCurrency(subCategory.total)}
                            </span>
                          </div>
                          <Progress
                            value={subPercentage}
                            className="h-1.5 bg-muted/40"
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
          </>
        )}
      </CardContent>
    </Card>
  );
}
