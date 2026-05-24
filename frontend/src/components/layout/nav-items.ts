import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  Landmark,
  Tags,
  Building2,
  CalendarClock,
  BarChart3,
  Hash,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/recurring", label: "Recurring", icon: CalendarClock },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/tags", label: "Tags", icon: Hash },
  { href: "/rental-income", label: "Rental Income", icon: Building2 },
  { href: "/investments", label: "Investments", icon: TrendingUp },
];
