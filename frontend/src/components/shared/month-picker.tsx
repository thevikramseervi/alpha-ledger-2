"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MONTH_NAMES } from "@/lib/format";

interface MonthPickerProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}

export function MonthPicker({ year, month, onChange }: MonthPickerProps) {
  const goToPrevious = () => {
    if (month === 1) {
      onChange(year - 1, 12);
    } else {
      onChange(year, month - 1);
    }
  };

  const goToNext = () => {
    if (month === 12) {
      onChange(year + 1, 1);
    } else {
      onChange(year, month + 1);
    }
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-border/60 bg-card/50 p-1">
      <Button variant="ghost" size="icon" aria-label="Previous month" onClick={goToPrevious}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="min-w-[140px] px-2 text-center text-sm font-medium">
        {MONTH_NAMES[month - 1]} {year}
      </div>
      <Button variant="ghost" size="icon" aria-label="Next month" onClick={goToNext}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
