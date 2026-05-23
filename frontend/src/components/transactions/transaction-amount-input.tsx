"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { cn } from "@/lib/utils";
import { TRANSACTION_TYPE_COLORS } from "@/lib/format";
import { TransactionType } from "@/types";

interface TransactionAmountInputProps {
  id?: string;
  value: string;
  type: TransactionType | "";
  onChange: (value: string) => void;
}

export interface TransactionAmountInputHandle {
  focus: () => void;
}

export const TransactionAmountInput = forwardRef<
  TransactionAmountInputHandle,
  TransactionAmountInputProps
>(function TransactionAmountInput(
  { id = "amount", value, type, onChange },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    },
  }));

  return (
    <div className="py-1 text-center">
      <button
        type="button"
        className="mx-auto flex max-w-full items-baseline justify-center gap-1 rounded-xl px-2 py-0.5 transition-colors hover:bg-muted/30"
        onClick={() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }}
      >
        <span
          className={cn(
            "text-xl font-medium tabular-nums transition-colors sm:text-2xl",
            type ? TRANSACTION_TYPE_COLORS[type] : "text-muted-foreground",
          )}
        >
          ₹
        </span>
        <input
          ref={inputRef}
          id={id}
          type="number"
          min="0.01"
          step="0.01"
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          aria-label="Amount"
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "w-[min(11rem,65vw)] bg-transparent text-center text-3xl font-semibold tracking-tight tabular-nums outline-none sm:text-4xl",
            "placeholder:text-muted-foreground/35 [appearance:textfield]",
            "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            type ? TRANSACTION_TYPE_COLORS[type] : "text-foreground",
          )}
        />
      </button>
      {!type ? (
        <p className="mt-1 text-[0.6875rem] text-muted-foreground">
          Select a type to continue
        </p>
      ) : null}
    </div>
  );
});
