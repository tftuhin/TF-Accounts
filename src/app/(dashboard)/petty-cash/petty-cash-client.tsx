"use client";

import { useState } from "react";
import { formatBDT } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowRight, Banknote, CreditCard, Wallet, Plus, Upload,
  Building2, TrendingDown, TrendingUp, CircleDollarSign, History,
} from "lucide-react";
import type { UserRole } from "@/types";
import { EXPENSE_CATEGORIES, CATEGORY_KEYS } from "@/lib/expense-categories";

interface Balances {
  bankBalance:      number;
  handCash:         number;
  currentBalance:   number;
  monthlyInput:     number;
  prevMonthClosing: number;
}

interface Entry {
  id:          string;
  date:        string;
  description: string;
  amount:      number;
  txnType:     string;
  hasReceipt:  boolean;
}

interface ProcessedPeriodData {
  id:         string;
  entityId:   string;
  entityName: string;
  periodStart: string;
  periodEnd:   string;
  isClosed:   boolean;
  balances: {
    bankBalance:    number;
    handCash:       number;
    currentBalance: number;
    monthlyInput:   number;
    prevMonthClosing: number;
  };
  entries: Entry[];
}

const TXN_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; sign: 1 | -1 }> = {
  FLOAT_TOPUP:    { label: "Fund Top-up",       icon: <Wallet className="w-3.5 h-3.5" />,           color: "#10B981", sign:  1 },
  ATM_WITHDRAWAL: { label: "ATM Withdrawal",     icon: <Banknote className="w-3.5 h-3.5" />,         color: "#3B82F6", sign: -1 },
  CARD_PAYMENT:   { label: "Card Payment",       icon: <CreditCard className="w-3.5 h-3.5" />,       color: "#8B5CF6", sign: -1 },
  CASH_EXPENSE:   { label: "Cash Expense",       icon: <CircleDollarSign className="w-3.5 h-3.5" />, color: "#EF4444", sign: -1 },
};

// Entry Manager can record spending; Admin/Manager can also top up
const ENTRY_MANAGER_TYPES = ["ATM_WITHDRAWAL", "CARD_PAYMENT", "CASH_EXPENSE"];
const MANAGER_TYPES       = ["FLOAT_TOPUP", "ATM_WITHDRAWAL", "CARD_PAYMENT", "CASH_EXPENSE"];

export function PettyCashClient({
  allPeriodsData,
  userRole,
}: {
  allPeriodsData: ProcessedPeriodData[];
  userRole: UserRole;
}) {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState(allPeriodsData[0]?.id || "");
  const [form, setForm] = useState({
    date:        new Date().toISOString().split("T")[0],
    description: "",
    amount:      "",
    txnType:     userRole === "ENTRY_MANAGER" ? "CASH_EXPENSE" : "FLOAT_TOPUP",
    category:    CATEGORY_KEYS[0],
    subcategory: EXPENSE_CATEGORIES[CATEGORY_KEYS[0]][0],
    receipt:     null as File | null,
  });

  const allowedTypes = userRole === "ENTRY_MANAGER" ? ENTRY_MANAGER_TYPES : MANAGER_TYPES;
  const isExpenseTxn = form.txnType === "CASH_EXPENSE" || form.txnType === "CARD_PAYMENT";
  const subcategories = EXPENSE_CATEGORIES[form.category] || [];

  function handleCategoryChange(category: string) {
    setForm((f) => ({ ...f, category, subcategory: EXPENSE_CATEGORIES[category]?.[0] || "" }));
  }

  if (!allPeriodsData.length) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-2xl font-display text-ink-white mb-2">Petty Cash</h1>
        <div className="card p-10 text-center text-ink-muted">
          No petty cash periods found. Ask your admin to create one in Settings.
        </div>
      </div>
    );
  }

  const currentPeriod = allPeriodsData.find(p => p.id === selectedPeriodId) || allPeriodsData[0];
  const { balances, entries } = currentPeriod;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description || !form.amount) { toast.error("Fill required fields"); return; }
    if (!allowedTypes.includes(form.txnType)) { toast.error("Not permitted"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/petty-cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodId:    currentPeriod.id,
          entityId:    currentPeriod.entityId,
          date:        form.date,
          description: isExpenseTxn && form.category
            ? `[${form.category} › ${form.subcategory}] ${form.description}`
            : form.description,
          amount:      parseFloat(form.amount),
          txnType:     form.txnType,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      toast.success("Entry saved — refresh to see updated balances");
      setShowForm(false);
      setForm({ date: new Date().toISOString().split("T")[0], description: "", amount: "", txnType: allowedTypes[0], category: CATEGORY_KEYS[0], subcategory: EXPENSE_CATEGORIES[CATEGORY_KEYS[0]][0], receipt: null });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error saving entry");
    } finally {
      setSubmitting(false);
    }
  }

  const StatCard = ({
    label, value, icon, color, sub,
  }: { label: string; value: number; icon: React.ReactNode; color: string; sub?: string }) => (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xs text-ink-faint uppercase tracking-wider">{label}</span>
        <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: `${color}18`, color }}>
          {icon}
        </div>
      </div>
      <div className="text-xl font-bold font-mono" style={{ color }}>{formatBDT(value)}</div>
      {sub && <div className="text-2xs text-ink-faint mt-1">{sub}</div>}
    </div>
  );

  function handlePeriodChange(periodId: string) {
    setSelectedPeriodId(periodId);
    setShowForm(false); // Close form when switching periods
  }

  return (
    <div className="max-w-4xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display text-ink-white">Petty Cash</h1>
          <div className="flex items-center gap-4 mt-2">
            {allPeriodsData.length > 1 && (
              <select
                value={selectedPeriodId}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="input text-sm"
              >
                {allPeriodsData.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.periodStart} → {p.periodEnd} {p.isClosed ? "(Closed)" : ""}
                  </option>
                ))}
              </select>
            )}
            <p className="text-sm text-ink-muted">
              {currentPeriod.periodStart} → {currentPeriod.periodEnd} · {currentPeriod.entityName}
              {currentPeriod.isClosed && <span className="ml-2 badge bg-surface-4 text-ink-faint">Closed</span>}
            </p>
          </div>
        </div>
        {!currentPeriod.isClosed && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary text-xs">
            <Plus className="w-3.5 h-3.5" />
            {userRole === "ENTRY_MANAGER" ? "Record Expense" : "Add Entry"}
          </button>
        )}
      </div>

      {/* 5 Balance Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard
          label="Bank Balance"
          value={balances.bankBalance}
          icon={<Building2 className="w-3.5 h-3.5" />}
          color="#3B82F6"
          sub="Petty cash a/c"
        />
        <StatCard
          label="Hand Cash"
          value={balances.handCash}
          icon={<Banknote className="w-3.5 h-3.5" />}
          color="#F59E0B"
          sub="After ATM withdrawals"
        />
        <StatCard
          label="Prev Month Close"
          value={balances.prevMonthClosing}
          icon={<History className="w-3.5 h-3.5" />}
          color="#6B7280"
          sub="Last period closing"
        />
        <StatCard
          label="Monthly Input"
          value={balances.monthlyInput}
          icon={<TrendingUp className="w-3.5 h-3.5" />}
          color="#10B981"
          sub="From BDT account"
        />
        <StatCard
          label="Current Balance"
          value={balances.currentBalance}
          icon={<TrendingDown className="w-3.5 h-3.5" />}
          color={balances.currentBalance < 0 ? "#EF4444" : "#A78BFA"}
          sub="Bank + hand cash"
        />
      </div>

      {/* Entry Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card p-5 mb-5 animate-slide-down space-y-4">
          <div className="text-sm font-semibold text-ink-white">
            {userRole === "ENTRY_MANAGER" ? "Record Expense" : "New Petty Cash Entry"}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="input-label">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="input-label">Amount (BDT)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                className="input font-mono"
              />
            </div>
            <div>
              <label className="input-label">Type</label>
              <select
                value={form.txnType}
                onChange={(e) => setForm({ ...form, txnType: e.target.value })}
                className="input"
              >
                {allowedTypes.map((t) => (
                  <option key={t} value={t}>{TXN_CONFIG[t]?.label ?? t}</option>
                ))}
              </select>
            </div>
          </div>

          {isExpenseTxn && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Category</label>
                <select value={form.category} onChange={(e) => handleCategoryChange(e.target.value)} className="input">
                  {CATEGORY_KEYS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">Subcategory</label>
                <select value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} className="input">
                  {subcategories.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="input-label">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={
                form.txnType === "FLOAT_TOPUP"    ? "e.g., Monthly fund transfer from BDT account" :
                form.txnType === "ATM_WITHDRAWAL" ? "e.g., ATM withdrawal — Uttara branch" :
                form.txnType === "CARD_PAYMENT"   ? "e.g., Office supplies — Bashundhara City" :
                "e.g., Tea & snacks for team"
              }
              className="input"
            />
          </div>

          <div>
            <label className="input-label">Receipt <span className="text-ink-faint">(optional)</span></label>
            <label className="block cursor-pointer">
              <div className="p-3 border border-dashed border-surface-border-light rounded-lg text-center bg-surface-2 text-sm text-ink-muted hover:border-accent-blue/30 transition-colors">
                {form.receipt ? (
                  <span className="text-accent-green">{form.receipt.name}</span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <Upload className="w-4 h-4" /> Upload receipt
                  </span>
                )}
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*,.pdf"
                onChange={(e) => setForm({ ...form, receipt: e.target.files?.[0] || null })}
              />
            </label>
          </div>

          {/* Contextual hint */}
          {form.txnType === "ATM_WITHDRAWAL" && (
            <div className="px-3 py-2 rounded-lg bg-accent-blue/8 border border-accent-blue/15 text-2xs text-accent-blue">
              This reduces your bank balance and increases hand cash. Record cash expenses separately as Cash Expense.
            </div>
          )}
          {form.txnType === "FLOAT_TOPUP" && (
            <div className="px-3 py-2 rounded-lg bg-accent-green/8 border border-accent-green/15 text-2xs text-accent-green">
              Records funds received from the core BDT account into the petty cash bank account.
            </div>
          )}

          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? "Saving…" : "Save Entry"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Entries Table */}
      <div className="table-container">
        <div className="card-header flex items-center justify-between">
          <span className="text-sm font-semibold text-ink-white">Transactions</span>
          <span className="text-2xs text-ink-faint">{entries.length} entries</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="table-header">
              {["#", "Date", "Description", "Type", "Amount", "Receipt"].map((h) => (
                <th key={h} className="table-cell text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => {
              const cfg = TXN_CONFIG[entry.txnType] ?? TXN_CONFIG.CASH_EXPENSE;
              return (
                <tr key={entry.id} className="table-row">
                  <td className="table-cell text-ink-faint text-xs">{i + 1}</td>
                  <td className="table-cell font-mono text-xs text-ink-secondary">{entry.date}</td>
                  <td className="table-cell text-ink-white">{entry.description}</td>
                  <td className="table-cell">
                    <span
                      className="inline-flex items-center gap-1 text-2xs font-semibold"
                      style={{ color: cfg.color }}
                    >
                      {cfg.icon} {cfg.label}
                    </span>
                  </td>
                  <td
                    className="table-cell font-mono font-semibold"
                    style={{ color: cfg.sign === 1 ? "#10B981" : "#EF4444" }}
                  >
                    {cfg.sign === 1 ? "+" : "−"}{formatBDT(entry.amount)}
                  </td>
                  <td className="table-cell">
                    {entry.hasReceipt
                      ? <span className="text-2xs text-accent-green">✓</span>
                      : <span className="text-2xs text-ink-faint">—</span>}
                  </td>
                </tr>
              );
            })}
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="table-cell text-center text-ink-faint py-8">
                  No entries yet.{!currentPeriod.isClosed && " Click Record Expense to start."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
