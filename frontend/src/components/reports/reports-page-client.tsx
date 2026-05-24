"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileDown } from "lucide-react";
import { toast } from "sonner";
import { ChartRangeToggle } from "@/components/dashboard/chart-range-toggle";
import { ReportsBudgetsTab } from "@/components/reports/reports-budgets-tab";
import { ReportsCashFlowTab } from "@/components/reports/reports-cash-flow-tab";
import { ReportsCategoriesTab } from "@/components/reports/reports-categories-tab";
import { ReportsNetWorthTab } from "@/components/reports/reports-net-worth-tab";
import { ReportsTagsTab } from "@/components/reports/reports-tags-tab";
import { PageError, PageLoading } from "@/components/shared/async-state";
import { DateInput } from "@/components/shared/date-input";
import { MonthPicker } from "@/components/shared/month-picker";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { getApiErrorMessage, logApiError, toastApiError } from "@/lib/api-error";
import { DashboardChartRange } from "@/lib/dashboard-analytics";
import { exportReportsToCsv } from "@/lib/export-reports-csv";
import { getCurrentPeriod } from "@/lib/format";
import { downloadReportsPdfFromParams } from "@/lib/reports-pdf/download-reports-pdf";
import { getReportsPeriodLabel } from "@/lib/reports-format";
import { ReportsOverview } from "@/types";

const REPORT_TABS = [
  { id: "cash-flow", label: "Cash flow" },
  { id: "categories", label: "Categories" },
  { id: "tags", label: "Tags" },
  { id: "net-worth", label: "Net worth" },
  { id: "budgets", label: "Budgets" },
] as const;

type ReportsTabId = (typeof REPORT_TABS)[number]["id"];
type PeriodMode = "preset" | "custom";

export function ReportsPageClient() {
  const [{ year, month }, setPeriod] = useState(getCurrentPeriod);
  const [range, setRange] = useState<DashboardChartRange>("ytd");
  const [periodMode, setPeriodMode] = useState<PeriodMode>("preset");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activeTab, setActiveTab] = useState<ReportsTabId>("cash-flow");
  const [overview, setOverview] = useState<ReportsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<string | null>(null);

  const usingCustomRange = periodMode === "custom";

  const loadData = useCallback(async () => {
    if (usingCustomRange && fromDate && toDate && fromDate > toDate) {
      setOverview(null);
      setLoadError("From date must be on or before to date");
      setLoading(false);
      return;
    }

    if (usingCustomRange && !fromDate) {
      setOverview(null);
      setLoadError("Choose a from date for the custom range");
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    setOverview(null);

    try {
      const data = await api.reports.overview(
        usingCustomRange
          ? {
              fromDate,
              toDate: toDate || fromDate,
            }
          : { year, month, range },
      );
      setOverview(data);
    } catch (error) {
      setLoadError(getApiErrorMessage(error));
      toastApiError("Failed to load reports", error);
      logApiError("Reports load failed", error);
    } finally {
      setLoading(false);
    }
  }, [year, month, range, usingCustomRange, fromDate, toDate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const periodLabel = overview
    ? getReportsPeriodLabel(overview)
    : usingCustomRange
      ? fromDate
        ? `${fromDate}${toDate ? ` to ${toDate}` : ""}`
        : "Custom range"
      : `${month}/${year}`;

  const handleExportCsv = () => {
    if (!overview) return;
    exportReportsToCsv(overview);
    toast.success("Report exported as CSV");
  };

  const handleDownloadPdf = async (mode: "full" | "summary") => {
    setPdfDownloading(true);
    setPdfProgress(null);
    try {
      await downloadReportsPdfFromParams(
        usingCustomRange
          ? {
              fromDate,
              toDate: toDate || fromDate,
            }
          : { year, month, range },
        {
          mode,
          onProgress: setPdfProgress,
        },
      );
      toast.success(
        mode === "summary" ? "Summary PDF downloaded" : "Full report PDF downloaded",
      );
    } catch (error) {
      toastApiError("Failed to generate PDF report", error);
      logApiError("Reports PDF export failed", error);
    } finally {
      setPdfDownloading(false);
      setPdfProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">{periodLabel}</p>
        </div>
        <div className="flex flex-col gap-3">
          <Tabs
            value={periodMode}
            onValueChange={(value) => {
              if (value === "preset" || value === "custom") {
                setPeriodMode(value);
              }
            }}
          >
            <TabsList className="h-8">
              <TabsTrigger value="preset" className="px-3 text-xs sm:text-sm">
                Preset
              </TabsTrigger>
              <TabsTrigger value="custom" className="px-3 text-xs sm:text-sm">
                Custom range
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {periodMode === "preset" ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <ChartRangeToggle value={range} onChange={setRange} />
              <MonthPicker
                year={year}
                month={month}
                onChange={(y, m) => setPeriod({ year: y, month: m })}
              />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <DateInput
                id="reports-from-date"
                label="From date"
                value={fromDate}
                onChange={setFromDate}
                showHint={false}
              />
              <DateInput
                id="reports-to-date"
                label="To date"
                value={toDate}
                onChange={setToDate}
                showHint={false}
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => void handleDownloadPdf("full")}
              disabled={loading || pdfDownloading}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {pdfDownloading
                ? pdfProgress ?? "Building PDF…"
                : "Download full PDF"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleDownloadPdf("summary")}
              disabled={loading || pdfDownloading}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {pdfDownloading && pdfProgress ? pdfProgress : "Summary PDF"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={loading || !overview}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <PageLoading message="Loading reports..." />
      ) : loadError || !overview ? (
        <PageError
          message={loadError ?? "Reports are unavailable."}
          onRetry={() => void loadData()}
        />
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (
              value === "cash-flow" ||
              value === "categories" ||
              value === "tags" ||
              value === "net-worth" ||
              value === "budgets"
            ) {
              setActiveTab(value);
            }
          }}
        >
          <TabsList className="h-auto w-full flex-wrap justify-start">
            {REPORT_TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="cash-flow" className="mt-6">
            <ReportsCashFlowTab overview={overview} />
          </TabsContent>
          <TabsContent value="categories" className="mt-6">
            <ReportsCategoriesTab overview={overview} />
          </TabsContent>
          <TabsContent value="tags" className="mt-6">
            <ReportsTagsTab overview={overview} />
          </TabsContent>
          <TabsContent value="net-worth" className="mt-6">
            <ReportsNetWorthTab overview={overview} />
          </TabsContent>
          <TabsContent value="budgets" className="mt-6">
            <ReportsBudgetsTab overview={overview} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
