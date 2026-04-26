"use client";

import { useState, useMemo } from "react";
import { formatUSD, formatBDT, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowRight, Landmark, Building, RefreshCw } from "lucide-react";

interface BankAccount {
  id: string;
  accountName: string;
  accountType: string;
  currency: string;
  bankName: string | null;
  entityName: string;
}

interface Transfer {
  id: string;
  date: string;
  fromAccount: string;
  fromType: string;
  toAccount: string;
  toType: string;
  amountFrom: number;
  currencyFrom: string;
  amountTo: number;
  currencyTo: string;
  exchangeRate: number | null;
  entityName: string;
  reference: string | null;
  createdBy: string;
}

const ACCOUNT_TYPE_ICONS: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  FOREIGN_USD: { icon: <Landmark className="w-4 h-4" />, color: "#10B981", label: "Foreign USD" },
  LOCAL_USD:   { icon: <Building className="w-4 h-4" />, color: "#3B82F6", label: "BD USD" },
  LOCAL_BDT:   { icon: <Building className="w-4 h-4" />, color: "#8B5CF6", label: "BD BDT" },
  PETTY_CASH:  { icon: <Building className="w-4 h-4" />, color: "#F59E0B", label: "Petty Cash" },
};

export function FundTransferClient({
  bankAccounts,
  recentTransfers,
}: {
  bankAccounts: BankAccount[];
  recentTransfers: Transfer[];
}) {
  const defaultRate = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_USD_BDT_RATE || "121.50");

  const [form, setForm] = useState({
    fromAccountId: bankAccounts.find((a) => a.accountType === "FOREIGN_USD")?.id || "",
    toAccountId: bankAccounts.find((a) => a.accountType === "LOCAL_BDT")?.id || "",
    amount: "",
    exchangeRate: String(defaultRate),
    date: new Date().toISOString().split("T")[0],
    reference: "",
    note: "",
  });

  const fromAccount = bankAccounts.find((a) => a.id === form.fromAccountId);
  const toAccount = bankAccounts.find((a) => a.id === form.toAccountId);

  const needsExchange = fromAccount?.currency !== toAccount?.currency;
  const rate = parseFloat(form.exchangeRate) || defaultRate;
  const sourceAmount = parseFloat(form.amount) || 0;
  const destAmount = needsExchange ? sourceAmount * rate : sourceAmount;

  const foreignAccounts = bankAccounts.filter((a) => a.accountType === "FOREIGN_USD");
  const localAccounts = bankAccounts.filter((a) => ["LOCAL_USD", "LOCAL_BDT", "PETTY_CASH"].includes(a.accountType));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || !form.fromAccountId || !form.toAccountId) {
      toast.error("Fill all required fields");
      return;
    }
    if (form.fromAccountId === form.toAccountId) {
      toast.error("Source and destination must be different");
      return;
    }

    toast.success("Fund transfer recorded", {
      description: `${formatCurrency(sourceAmount, fromAccount?.currency as "USD" | "BDT")} → ${formatCurrency(destAmount, toAccount?.currency as "USD" | "BDT")}${needsExchange ? ` @ ৳${rate}/$1` : ""}`,
    });

    setForm({ ...form, amount: "", reference: "", note: "" });
  }

  return (
    <div className="max-w-4xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-display text-ink-white">Fund Transfers</h1>
        <p className="text-sm text-ink-muted mt-1">
          Move funds: Foreign USD → Bangladesh Bank Accounts (USD/BDT)
        </p>
      </div>

      {/* Transfer Form */}
      <form onSubmit={handleSubmit} className="card p-6 mb-6 space-y-5">
        <div className="text-sm font-semibold text-ink-white">New Transfer</div>

        {/* Source → Destination */}
        <div className="grid grid-cols-[1fr,40px,1fr] gap-3 items-end">
          <div>
            <label className="input-label">From Account</label>
            <select
              value={form.fromAccountId}
              onChange={(e) => setForm({ ...form, fromAccountId: e.target.value })}
              className="input"
            >
              <optgroup label="Foreign USD Accounts">
                {foreignAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.accountName} ({a.bankName})</option>
                ))}
              </optgroup>
              <optgroup label="Local Accounts">
                {localAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.accountName} ({a.currency})</option>
                ))}
              </optgroup>
            </select>
            {fromAccount && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <span
                  className="inline-flex items-center gap-1 text-2xs font-semibold px-2 py-0.5 rounded"
                  style={{
                    color: ACCOUNT_TYPE_ICONS[fromAccount.accountType]?.color,
                    background: `${ACCOUNT_TYPE_ICONS[fromAccount.accountType]?.color}15`,
                  }}
                >
                  {ACCOUNT_TYPE_ICONS[fromAccount.accountType]?.icon}
                  {ACCOUNT_TYPE_ICONS[fromAccount.accountType]?.label} · {fromAccount.currency}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center pb-6">
            <ArrowRight className="w-5 h-5 text-ink-faint" />
          </div>

          <div>
            <label className="input-label">To Account</label>
            <select
              value={form.toAccountId}
              onChange={(e) => setForm({ ...form, toAccountId: e.target.value })}
              className="input"
            >
              <optgroup label="Local Accounts">
                {localAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.accountName} ({a.currency})</option>
                ))}
              </optgroup>
              <optgroup label="Foreign USD Accounts">
                {foreignAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.accountName} ({a.bankName})</option>
                ))}
              </optgroup>
            </select>
            {toAccount && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <span
                  className="inline-flex items-center gap-1 text-2xs font-semibold px-2 py-0.5 rounded"
                  style={{
                    color: ACCOUNT_TYPE_ICONS[toAccount.accountType]?.color,
                    background: `${ACCOUNT_TYPE_ICONS[toAccount.accountType]?.color}15`,
                  }}
                >
                  {ACCOUNT_TYPE_ICONS[toAccount.accountType]?.icon}
                  {ACCOUNT_TYPE_ICONS[toAccount.accountType]?.label} · {toAccount.currency}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Amount & Exchange Rate */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="input-label">Amount ({fromAccount?.currency || "USD"})</label>
            <input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0.00"
              className="input font-mono"
              required
            />
          </div>
          {needsExchange && (
            <div>
              <label className="input-label">Exchange Rate (BDT per $1)</label>
              <input
                type="number"
                step="0.01"
                value={form.exchangeRate}
                onChange={(e) => setForm({ ...form, exchangeRate: e.target.value })}
                className="input font-mono"
              />
            </div>
          )}
          <div>
            <label className="input-label">Receiving Amount</label>
            <div className="input bg-surface-3 font-mono font-semibold text-ink-white flex items-center">
              {formatCurrency(destAmount, toAccount?.currency as "USD" | "BDT")}
            </div>
          </div>
        </div>

        {/* Conversion Preview */}
        {needsExchange && sourceAmount > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent-purple/5 border border-accent-purple/15">
            <RefreshCw className="w-4 h-4 text-accent-purple" />
            <span className="text-sm text-ink-secondary">
              <span className="font-mono font-semibold text-ink-white">{formatUSD(sourceAmount)}</span>
              {" → "}
              <span className="font-mono font-semibold text-ink-white">{formatBDT(destAmount)}</span>
              <span className="text-ink-faint ml-2">@ ৳{rate}/$1</span>
            </span>
          </div>
        )}

        {/* Reference & Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="input-label">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="input-label">Reference / Wire ID</label>
            <input
              type="text"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              placeholder="e.g., WIRE-20250426-001"
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="input-label">Note</label>
          <input
            type="text"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Optional note..."
            className="input"
          />
        </div>

        <button type="submit" className="btn-primary w-full">Record Transfer</button>
      </form>

      {/* Transfer History */}
      <div className="table-container">
        <div className="card-header">
          <span className="text-sm font-semibold text-ink-white">Transfer History</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                {["Date", "From", "To", "Amount", "Rate", "Received", "Ref"].map((h) => (
                  <th key={h} className="table-cell text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentTransfers.map((t) => (
                <tr key={t.id} className="table-row">
                  <td className="table-cell font-mono text-xs text-ink-secondary">{t.date}</td>
                  <td className="table-cell">
                    <div className="text-xs text-ink-white">{t.fromAccount}</div>
                    <div className="text-2xs" style={{ color: ACCOUNT_TYPE_ICONS[t.fromType]?.color }}>
                      {ACCOUNT_TYPE_ICONS[t.fromType]?.label}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="text-xs text-ink-white">{t.toAccount}</div>
                    <div className="text-2xs" style={{ color: ACCOUNT_TYPE_ICONS[t.toType]?.color }}>
                      {ACCOUNT_TYPE_ICONS[t.toType]?.label}
                    </div>
                  </td>
                  <td className="table-cell font-mono text-xs font-semibold text-accent-red">
                    -{formatCurrency(t.amountFrom, t.currencyFrom as "USD" | "BDT")}
                  </td>
                  <td className="table-cell font-mono text-2xs text-ink-faint">
                    {t.exchangeRate ? `৳${t.exchangeRate}` : "—"}
                  </td>
                  <td className="table-cell font-mono text-xs font-semibold text-accent-green">
                    +{formatCurrency(t.amountTo, t.currencyTo as "USD" | "BDT")}
                  </td>
                  <td className="table-cell text-2xs text-ink-faint">{t.reference || "—"}</td>
                </tr>
              ))}
              {recentTransfers.length === 0 && (
                <tr>
                  <td colSpan={7} className="table-cell text-center text-ink-faint py-10">
                    No transfers recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
