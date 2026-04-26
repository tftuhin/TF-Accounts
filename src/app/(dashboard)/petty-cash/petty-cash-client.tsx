"use client";

import { useState } from "react";
import { formatBDT } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowRight, Banknote, CreditCard, Wallet, Plus, Upload,
  Building2, TrendingDown, TrendingUp, CircleDollarSign, History,
} from "lucide-react";
import type { UserRole } from "@/types";

interface Balances {
  bankBalance:      number;
  handCash:         number;
  currentBalance:   number;
  prevMonthClosing: number;
  monthlyInput:     number;
}

interface Period {
  id:          string;
  entityId:    string;
  entityName:  string;
  periodStart: string;
  periodEnd:   string;
  isClosed:    boolean;
}

interface Entry {
  id:          string;
  date:        string;
  description: string;
  amount:      number;
  txnType:     string;
  hasReceipt:  boolean;
}

interface PettyCashData {
  period:   Period;
  balances: Balances;
  entries:  Entry[];
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
  data,
  userRole,
}: {
  data: PettyCashData | null;
  userRole: UserRole;
}) {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    date:        new Date().toISOString().split("T")[0],
    description: "",
    amount:      "",
    txnType:     userRole === "ENTRY_MANAGER" ? "CASH_EXPENSE" : "FLOAT_TOPUP",
    receipt:     null as File | null,
  });

  const allowedTypes = userRole === "ENTRY_MANAGER" ? ENTRY_MANAGER_TYPES : MANAGER_TYPES;

  if (!data) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-2xl font-display text-ink-white mb-2">Petty Cash</h1>
        <div className="card p-10 text-center text-ink-muted">
          No active petty cash period. Ask your admin to create one in Settings.
        </div>
      </div>
    );
  }

  const { period, balances, entries } = data;

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
          periodId:    period.id,
          entityId:    period.entityId,
          date:        form.date,
          description: form.description,
          amount:      parseFloat(form.amount),
          txnType:     form.txnType,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      toast.success("Entry saved — refresh to see updated balances");
      setShowForm(false);
      setForm({ date: new Date().toISOString().split("T")[0], description: "", amount: "", txnType: allowedTypes[0], receipt: null });
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

  return (
    <div className="max-w-4xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display text-ink-white">Petty Cash</h1>
          <p className="text-sm text-ink-muted mt-1">
            {period.periodStart} → {period.periodEnd} · {period.entityName}
            {period.isClosed && <span className="ml-2 badge bg-surface-4 text-ink-faint">Closed</span>}
          </p>
        </div>
        {!period.isClosed && (
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

      {/* Fund Flow Diagram */}
      <div className="card p-5 mb-5">
        <div className="text-2xs text-ink-faint uppercase tracking-wider mb-4">Fund Flow</div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Step 1: Core BDT Account */}
          <div className="flex flex-col items-center gap-1.5 min-w-[90px]">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-accent-green/10 text-accent-green">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="text-2xs font-semibold text-ink-white text-center">Core BDT A/C</div>
            <div className="text-2xs text-ink-faint text-center">Company account</div>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-ink-faint flex-shrink-0" />

          {/* Step 2: Petty Cash Account */}
          <div className="flex flex-col items-center gap-1.5 min-w-[90px]">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-accent-blue/10 text-accent-blue">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="text-2xs font-semibold text-ink-white text-center">Petty Cash A/C</div>
            <div className="text-2xs text-ink-faint text-center">Dedicated bank a/c</div>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-ink-faint flex-shrink-0" />

          {/* Step 3: Two paths */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1 min-w-[80px]">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-500/10 text-purple-400">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="text-2xs font-semibold text-ink-white text-center">ATM Card</div>
                <div className="text-2xs text-ink-faint text-center">Direct POS pay</div>
              </div>
              <ArrowRight className="w-3 h-3 text-ink-faint" />
              <div className="flex flex-col items-center gap-1 min-w-[70px]">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-red-500/10 text-red-400">
                  <CircleDollarSign className="w-4 h-4" />
                </div>
                <div className="text-2xs font-semibold text-ink-white text-center">Expense</div>
                <div className="text-2xs text-ink-faint text-center">Card payment</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1 min-w-[80px]">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-yellow-500/10 text-yellow-400">
                  <Banknote className="w-4 h-4" />
                </div>
                <div className="text-2xs font-semibold text-ink-white text-center">ATM Cash</div>
                <div className="text-2xs text-ink-faint text-center">Withdrawn cash</div>
              </div>
              <ArrowRight className="w-3 h-3 text-ink-faint" />
              <div className="flex flex-col items-center gap-1 min-w-[70px]">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-red-500/10 text-red-400">
                  <CircleDollarSign className="w-4 h-4" />
                </div>
                <div className="text-2xs font-semibold text-ink-white text-center">Expense</div>
                <div className="text-2xs text-ink-faint text-center">Cash payment</div>
              </div>
            </div>
          </div>
        </div>
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
                  No entries yet.{!period.isClosed && " Click Record Expense to start."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
