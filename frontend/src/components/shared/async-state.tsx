import { Button } from "@/components/ui/button";

interface PageLoadingProps {
  message?: string;
}

export function PageLoading({ message = "Loading..." }: PageLoadingProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/30 px-6 py-16 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

interface PageErrorProps {
  message: string;
  onRetry: () => void;
}

export function PageError({ message, onRetry }: PageErrorProps) {
  return (
    <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-6 py-12 text-center">
      <p className="text-sm font-medium text-rose-300">Could not load data</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{message}</p>
      <Button className="mt-4" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
