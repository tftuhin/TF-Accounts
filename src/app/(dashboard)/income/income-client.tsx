"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { TrendingUp, Plus } from "lucide-react";
import { formatUSD, formatBDT } from "@/lib/utils";
import type { UserRole } from "@/types";

interface Entity { id: string; slug: string; name: string; type: string; color: string }
interface BankAccount { id: string; accountName: string; accountType: string; currency: string; bankName: string | null; entityId: string }

interface IncomeEntry {
  id: string; date: string; description: string; entityName: string; entityColor: string;
  amount: number; currency: string;
}

export function IncomeClient({
  entities, bankAccounts, userRole,
}: { entities: Entity[]; bankAccounts: BankAccount[]; userRole: UserRole }) {
  const currentEntityId = useAppStore((s) => s.currentEntityId);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const defaultEntity = currentEntityId !== "consolidated"
    ? currentEntityId
    : entities[0]?.id || "";

  const [form, setForm] = useState({
    entityId: defaultEntity,
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    currency: "USD" as "USD" | "BDT",
    bankAccountId: "",
  });

  // Filter bank accounts by selected entity
  const relevantBankAccounts = bankAccounts.filter(
    (ba) => ba.entityId === form.entityId && ba.currency === form.currency
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.entityId || !form.description || !form.amount) {
      toast.error("Fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const entity = entities.find((e) => e.id === form.entityId);
      const newEntry: IncomeEntry = {
        id: json.data.id,
        date: form.date,
        description: form.description,
        entityName: entity?.name ?? "",
        entityColor: entity?.color ?? "#3B82F6",
        amount: parseFloat(form.amount),
        currency: form.currency,
      };
      setEntries((prev) => [newEntry, ...prev]);
      toast.success(`Income recorded: ${form.description}`);
      setForm((f) => ({ ...f, description: "", amount: "", bankAccountId: "" }));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to record income");
    } finally {
      setSaving(false);
    }
  }

  // Load recent income entries
  async function loadEntries() {
    if (loaded) return;
    const entityParam = currentEntityId !== "consolidated" ? `?entityId=${currentEntityId}` : "";
    const res = await fetch(`/api/income${entityParam}`);
    const json = await res.json();
    if (json.success) setEntries(json.data);
    setLoaded(true);
  }

  return (
    <div className="max-w-2xl animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-display text-ink-white">Record Income</h1>
        <p className="text-sm text-ink-muted mt-1">Add revenue received in USD or BDT</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-accent-green" />
          <span className="text-sm font-semibold text-ink-white">New Income Entry</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">Entity *</label>
            <select
              value={form.entityId}
              onChange={(e) => setForm({ ...form, entityId: e.target.value, bankAccountId: "" })}
              className="input"
            >
              {entities.map((en) => (
                <option key={en.id} value={en.id}>{en.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Date *</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input" required />
          </div>
        </div>

        <div>
          <label className="input-label">Description *</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="e.g., Stripe payout — April, ThemeForest sales..."
            className="input"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">Amount *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0.00"
              className="input font-mono"
              required
            />
          </div>
          <div>
            <label className="input-label">Currency</label>
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as "USD" | "BDT", bankAccountId: "" })} className="input">
              <option value="USD">USD</option>
              <option value="BDT">BDT</option>
            </select>
          </div>
        </div>

        {relevantBankAccounts.length > 0 && (
          <div>
            <label className="input-label">Bank Account <span className="text-ink-faint">(optional)</span></label>
            <select value={form.bankAccountId} onChange={(e) => setForm({ ...form, bankAccountId: e.target.value })} className="input">
              <option value="">— Not specified —</option>
              {relevantBankAccounts.map((ba) => (
                <option key={ba.id} value={ba.id}>{ba.accountName}{ba.bankName ? ` · ${ba.bankName}` : ""}</option>
              ))}
            </select>
          </div>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" />
          {saving ? "Recording…" : "Record Income"}
        </button>
      </form>

      {/* Recent entries */}
      <div className="table-container">
        <div className="card-header flex items-center justify-between">
          <span className="text-sm font-semibold text-ink-white">Recent Income</span>
          {!loaded && (
            <button onClick={loadEntries} className="text-xs text-accent-blue hover:underline">Load history</button>
          )}
        </div>
        {loaded && (
          <table className="w-full">
            <thead>
              <tr className="table-header">
                {["Date", "Description", "Entity", "Amount"].map((h) => (
                  <th key={h} className="table-cell text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((en) => (
                <tr key={en.id} className="table-row">
                  <td className="table-cell font-mono text-xs text-ink-secondary">{en.date}</td>
                  <td className="table-cell text-ink-white">{en.description}</td>
                  <td className="table-cell">
                    <span className="badge" style={{ background: `${en.entityColor}15`, color: en.entityColor, border: `1px solid ${en.entityColor}30` }}>
                      {en.entityName}
                    </span>
                  </td>
                  <td className="table-cell font-mono font-semibold text-accent-green">
                    +{en.currency === "BDT" ? formatBDT(en.amount) : formatUSD(en.amount)}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td colSpan={4} className="table-cell text-center text-ink-faint py-8">No income recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
