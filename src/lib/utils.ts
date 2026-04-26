import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUSD(amount: number | string): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function formatBDT(amount: number | string): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(n);
}

export function formatCurrency(amount: number | string, currency: "USD" | "BDT" = "USD"): string {
  return currency === "BDT" ? formatBDT(amount) : formatUSD(amount);
}

export function formatPct(n: number | string): string {
  const val = typeof n === "string" ? parseFloat(n) : n;
  return `${val.toFixed(1)}%`;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(new Date(date));
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(date));
}

export function getCurrentQuarter(): string {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${q}-${now.getFullYear()}`;
}

export function getMonthRange(monthsBack: number = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  return { start, end };
}

// PF account display config
export const PF_CONFIG = {
  INCOME:     { label: "Income",       icon: "TrendingUp",  color: "#10B981", bgClass: "bg-pf-income/10",  textClass: "text-pf-income"  },
  PROFIT:     { label: "Profit",       icon: "Diamond",     color: "#8B5CF6", bgClass: "bg-pf-profit/10",  textClass: "text-pf-profit"  },
  OWNERS_COMP:{ label: "Owner's Comp", icon: "Crown",       color: "#3B82F6", bgClass: "bg-pf-comp/10",    textClass: "text-pf-comp"    },
  TAX:        { label: "Tax",          icon: "Scale",       color: "#F59E0B", bgClass: "bg-pf-tax/10",     textClass: "text-pf-tax"     },
  OPEX:       { label: "OPEX",         icon: "Settings",    color: "#EF4444", bgClass: "bg-pf-opex/10",    textClass: "text-pf-opex"    },
} as const;

export type PfAccountKey = keyof typeof PF_CONFIG;

// Entity color map
export const ENTITY_COLORS: Record<string, string> = {
  teamosis: "#0F766E",
  themefisher: "#8B5CF6",
  gethugothemes: "#3B82F6",
  zeonstudio: "#EF4444",
};
