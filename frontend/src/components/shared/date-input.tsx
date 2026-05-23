"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  getDaysInMonth,
  splitIsoDate,
  toIsoDate,
} from "@/lib/format";

interface DateInputProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  showHint?: boolean;
}

export interface DateInputHandle {
  commit: () => boolean;
}

function isoToDisplay(iso: string) {
  const { year, month, day } = splitIsoDate(iso);
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

function parseDisplayDate(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const dayFirst = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dayFirst) {
    const day = Number(dayFirst[1]);
    const month = Number(dayFirst[2]);
    const year = Number(dayFirst[3]);
    if (isValidDateParts(year, month, day)) {
      return toIsoDate(year, month, day);
    }
    return null;
  }

  const yearFirst = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (yearFirst) {
    const year = Number(yearFirst[1]);
    const month = Number(yearFirst[2]);
    const day = Number(yearFirst[3]);
    if (isValidDateParts(year, month, day)) {
      return toIsoDate(year, month, day);
    }
  }

  return null;
}

function isValidDateParts(year: number, month: number, day: number) {
  if (month < 1 || month > 12 || day < 1) {
    return false;
  }

  return day <= getDaysInMonth(year, month);
}

export const DateInput = forwardRef<DateInputHandle, DateInputProps>(
  function DateInput(
    { id = "date", label = "Date", value, onChange, showHint = true },
    ref,
  ) {
    const [displayValue, setDisplayValue] = useState(() =>
      value ? isoToDisplay(value) : "",
    );
    const [error, setError] = useState<string | null>(null);
    const [calendarOpen, setCalendarOpen] = useState(false);

    useEffect(() => {
      setDisplayValue(value ? isoToDisplay(value) : "");
      setError(null);
    }, [value]);

    const applyIsoDate = (iso: string) => {
      setError(null);
      setDisplayValue(isoToDisplay(iso));
      onChange(iso);
    };

    const commitDisplayValue = (): boolean => {
      if (!displayValue.trim()) {
        setError(null);
        onChange("");
        return true;
      }

      const parsed = parseDisplayDate(displayValue);
      if (!parsed) {
        setError("Use DD/MM/YYYY or YYYY/MM/DD");
        setDisplayValue(value ? isoToDisplay(value) : "");
        return false;
      }

      applyIsoDate(parsed);
      return true;
    };

    useImperativeHandle(ref, () => ({
      commit: commitDisplayValue,
    }));

    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <div className="flex gap-2">
          <Input
            id={id}
            inputMode="numeric"
            placeholder="DD/MM/YYYY"
            value={displayValue}
            className="flex-1"
            onChange={(event) => {
              const next = event.target.value;
              setDisplayValue(next);
              if (!next.trim()) {
                setError(null);
                onChange("");
                return;
              }

              const parsed = parseDisplayDate(next);
              if (parsed) {
                setError(null);
                setDisplayValue(isoToDisplay(parsed));
                onChange(parsed);
              } else {
                setError(null);
              }
            }}
            onBlur={commitDisplayValue}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commitDisplayValue();
              }
            }}
          />

          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger
              type="button"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted"
              aria-label="Open calendar"
            >
              <CalendarIcon className="h-4 w-4" />
            </PopoverTrigger>
            <PopoverContent align="end">
              <Calendar
                selected={value || undefined}
                onSelect={(iso) => {
                  applyIsoDate(iso);
                  setCalendarOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
        {showHint ? (
          <p className="text-xs text-muted-foreground">
            Type DD/MM/YYYY or pick a date from the calendar
          </p>
        ) : null}
        {error ? <p className="text-xs text-rose-400">{error}</p> : null}
      </div>
    );
  },
);
