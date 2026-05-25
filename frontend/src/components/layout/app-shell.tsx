"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, Menu } from "lucide-react";
import { Sidebar } from "./sidebar";
import { navItems } from "./nav-items";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl lg:px-8"
          style={{
            minHeight: "calc(4rem + env(safe-area-inset-top))",
            paddingTop: "env(safe-area-inset-top)",
          }}
        >
          <div className="flex items-center gap-3 lg:hidden">
            <Sheet>
              <SheetTrigger
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted"
                aria-label="Open navigation menu"
              >
                <Menu className="h-4 w-4" />
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="border-b border-border/60 p-6 text-left">
                  <SheetTitle className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                      <Wallet className="h-5 w-5 text-primary" />
                    </div>
                    Alpha Ledger
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 p-4">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>
            <div>
              <p className="text-sm font-semibold">Alpha Ledger</p>
              <p className="text-xs text-muted-foreground">Personal finance</p>
            </div>
          </div>

          <div className="hidden lg:block">
            <p className="text-sm text-muted-foreground">
              {pathname === "/"
                ? "Overview of your monthly finances"
                : pathname.startsWith("/reports")
                  ? "Long-range cash flow, categories, net worth, and budgets"
                  : pathname.startsWith("/transactions")
                  ? "Manage your transactions"
                  : pathname.startsWith("/recurring")
                    ? "Monthly templates for salary, rent, and SIP"
                    : pathname.startsWith("/accounts")
                      ? "Manage your cash and bank accounts"
                      : pathname.startsWith("/categories")
                        ? "Manage income, expense, and investment categories"
                        : pathname.startsWith("/tags")
                          ? "Label transactions for filters and reports"
                          : pathname.startsWith("/rental-income")
                          ? "Track rent received from each property"
                          : pathname.startsWith("/investments")
                            ? "Track investments by category and account"
                            : "Manage your transactions"}
            </p>
          </div>
        </header>

        <main
          className="flex-1 px-4 py-6 lg:px-8 lg:py-8"
          style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
