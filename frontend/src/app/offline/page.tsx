import Link from "next/link";
import { WifiOff } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
      <div className="w-full rounded-3xl border border-border/60 bg-card/60 p-8 text-center shadow-lg backdrop-blur">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <WifiOff className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">You&apos;re offline</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Alpha Ledger can still open cached screens and previously loaded data. For
          safety, new transactions and edits are disabled until your connection returns.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className={cn(buttonVariants({ variant: "default" }))}>
            Open dashboard
          </Link>
          <Link
            href="/reports"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Open reports
          </Link>
        </div>
      </div>
    </div>
  );
}
