"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { TrendingUp, Plus } from "lucide-react";
import { formatBDT } from "@/lib/utils";
import type { UserRole } from "@/types";

interface Entity { id: string; slug: string; name: string; type: string; color: string }
interface BankAccount { id: string; accountName: string; accountType: string; currency: string; bankName: string | null; entityId: string }

interface IncomeEntry {
  id: string; date: string; description: string; entityName: string; entityColor: string;
  amount: number;
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
    bankAccountId: "",
  });

  // Only BDT accounts for income
  const relevantBankAccounts = bankAccounts.filter(
    (ba) => ba.entityId === form.entityId && ba.currency === "BDT"
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
      setEntries((prev) => [{
        id: json.data.id,
        date: form.date,
        description: form.description,
        entityName: entity?.name ?? "",
        entityColor: entity?.color ?? "#3B82F6",
        amount: parseFloat(form.amount),
      }, ...prev]);
      toast.success(`Income recorded: ${form.description}`);
      setForm((f) => ({ ...f, description: "", amount: "", bankAccountId: "" }));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to record income");
    } finally {
      setSaving(false);
    }
  }

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
        <p className="text-sm text-ink-muted mt-1">All income is recorded in BDT</p>
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
            placeholder="e.g., ThemeForest payout — April, Client payment..."
            className="input"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">Amount (BDT) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint text-sm font-medium">৳</span>
              <input
                type="number"
                step="1"
                min="1"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0"
                className="input font-mono pl-7"
                required
              />
            </div>
          </div>
          <div>
            {relevantBankAccounts.length > 0 ? (
              <>
                <label className="input-label">Bank Account <span className="text-ink-faint">(optional)</span></label>
                <select value={form.bankAccountId} onChange={(e) => setForm({ ...form, bankAccountId: e.target.value })} className="input">
                  <option value="">— Not specified —</option>
                  {relevantBankAccounts.map((ba) => (
                    <option key={ba.id} value={ba.id}>{ba.accountName}{ba.bankName ? ` · ${ba.bankName}` : ""}</option>
                  ))}
                </select>
              </>
            ) : (
              <div className="flex items-center h-full pt-5">
                <div className="text-2xs text-ink-faint bg-surface-2 rounded-lg px-3 py-2.5 w-full border border-surface-border">
                  Income recorded to default cash account
                </div>
              </div>
            )}
          </div>
        </div>

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
                {["Date", "Description", "Entity", "Amount (BDT)"].map((h) => (
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
                    +{formatBDT(en.amount)}
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
