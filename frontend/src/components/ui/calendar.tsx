"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { enIN } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isoToLocalDate, toIsoDate } from "@/lib/format";

interface CalendarProps {
  selected?: string;
  onSelect: (isoDate: string) => void;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function Calendar({ selected, onSelect }: CalendarProps) {
  const selectedDate = selected ? isoToLocalDate(selected) : undefined;
  const selectedMonthKey = selectedDate
    ? format(selectedDate, "yyyy-MM")
    : null;
  const [visibleMonth, setVisibleMonth] = useState(
    () => selectedDate ?? new Date(),
  );
  const [syncedMonthKey, setSyncedMonthKey] = useState(selectedMonthKey);

  if (selectedMonthKey && selectedMonthKey !== syncedMonthKey) {
    setSyncedMonthKey(selectedMonthKey);
    setVisibleMonth(selectedDate!);
  }

  const days = useMemo(() => {
    const monthStart = startOfMonth(visibleMonth);
    const monthEnd = endOfMonth(visibleMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [visibleMonth]);

  return (
    <div className="w-[280px]">
      <div className="mb-3 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Previous month"
          onClick={() => setVisibleMonth((current) => subMonths(current, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-medium">
          {format(visibleMonth, "MMMM yyyy", { locale: enIN })}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Next month"
          onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-[0.7rem] font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          const isCurrentMonth = isSameMonth(day, visibleMonth);
          const isoDate = toIsoDate(
            day.getFullYear(),
            day.getMonth() + 1,
            day.getDate(),
          );

          return (
            <Button
              key={isoDate}
              type="button"
              variant={isSelected ? "default" : "ghost"}
              size="icon-sm"
              className={cn(
                "size-8 text-xs",
                !isCurrentMonth && "text-muted-foreground/50",
              )}
              onClick={() => onSelect(isoDate)}
            >
              {format(day, "d")}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
