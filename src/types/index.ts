// ── Types ────────────────────────────────────────────────────

export type UserRole = "ADMIN" | "ACCOUNTS_MANAGER" | "ENTRY_MANAGER";
export type PfAccountType = "INCOME" | "PROFIT" | "OWNERS_COMP" | "TAX" | "OPEX";
export type Currency = "USD" | "BDT";

// ── Session & Auth ──────────────────────────────────────────

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

// ── Dashboard Data ──────────────────────────────────────────

export interface PfAccountBalance {
  account: PfAccountType;
  opening: number;
  deposits: number;
  withdrawals: number;
  balance: number;
  targetPct: number;
  actualPct: number;
}

export interface EntitySummary {
  id: string;
  name: string;
  slug: string;
  color: string;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  monthlyData: MonthlyDataPoint[];
}

export interface MonthlyDataPoint {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

// ── Money Flow ──────────────────────────────────────────────

export interface FundTransferInput {
  entityId: string;
  fromAccountId: string;
  toAccountId: string;
  amountFrom: number;
  currencyFrom: Currency;
  amountTo: number;
  currencyTo: Currency;
  exchangeRate?: number;
  date: string;
  reference?: string;
  note?: string;
}

// ── Expense ─────────────────────────────────────────────────

export interface ExpenseInput {
  entityId: string;
  date: string;
  description: string;
  amount: number;
  currency: Currency;
  category: string;
  pfAccount: PfAccountType;
  receiptFile?: File | null;
  splitEnabled: boolean;
  splits?: Record<string, number>; // entityId → percentage
}

// ── Petty Cash ──────────────────────────────────────────────

export interface PettyCashInput {
  periodId: string;
  entityId: string;
  date: string;
  description: string;
  amount: number;
  txnType: "ATM_WITHDRAWAL" | "CARD_PAYMENT" | "CASH_EXPENSE" | "FLOAT_TOPUP";
  receiptFile?: File | null;
}

// ── Drawings ────────────────────────────────────────────────

export interface DrawingInput {
  entityId: string;
  ownershipRegistryId: string;
  sourceAccount: "PROFIT" | "OWNERS_COMP";
  amount: number;
  date: string;
  note?: string;
}

// ── API Response ────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
