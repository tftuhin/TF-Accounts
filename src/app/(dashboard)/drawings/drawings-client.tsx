"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { formatUSD, PF_CONFIG } from "@/lib/utils";
import type { UserRole } from "@/types";

interface DrawingRecord {
  id: string; date: string; entityName: string; entityColor: string; entityId: string;
  ownerName: string; ownershipPct: number; sourceAccount: string;
  amount: number; currency: string; status: string;
  balanceAtDraw: number | null; note: string | null;
}
interface Owner { id: string; ownerName: string; ownershipPct: number; entityId: string; entityName: string }
interface Entity { id: string; name: string; type: string; color: string }

interface DrawingsClientProps {
  drawings: DrawingRecord[];
  owners: Owner[];
  entities: Entity[];
  pfBalances: Record<string, Record<string, number>>;
  consolidatedBalances: { PROFIT: number; OWNERS_COMP: number };
}

export function DrawingsClient({ drawings, owners, entities, pfBalances, consolidatedBalances }: DrawingsClientProps) {
  const [warning, setWarning] = useState("");
  const [saving, setSaving] = useState(false);
  const [localDrawings, setLocalDrawings] = useState(drawings);

  const [form, setForm] = useState({
    entityId: entities[0]?.id || "",
    ownerId: owners[0]?.id || "",
    sourceAccount: "PROFIT",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    note: "",
  });

  // Get available balance for selected entity + account
  function getBalance(entityId: string, account: string): number {
    if (!entityId) return consolidatedBalances[account as "PROFIT" | "OWNERS_COMP"] || 0;
    const bal = pfBalances[entityId];
    if (!bal) return 0;
    return bal[account] || 0;
  }

  const selectedBalance = getBalance(form.entityId, form.sourceAccount);
  const filteredOwners = owners.filter((o) => !form.entityId || o.entityId === form.entityId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(form.amount);
    if (!amt || !form.ownerId || !form.entityId) {
      toast.error("Fill all required fields");
      return;
    }

    if (amt > selectedBalance) {
      setWarning(
        `Drawing of ${formatUSD(amt)} exceeds ${PF_CONFIG[form.sourceAccount as keyof typeof PF_CONFIG]?.label} balance of ${formatUSD(selectedBalance)}.`
      );
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/drawings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: amt }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const owner = owners.find((o) => o.id === form.ownerId);
      const entity = entities.find((en) => en.id === form.entityId);
      setLocalDrawings((prev) => [{
        id: json.data?.id || String(Date.now()),
        date: form.date,
        entityName: entity?.name || "",
        entityColor: entity?.color || "#3B82F6",
        entityId: form.entityId,
        ownerName: owner?.ownerName || "",
        ownershipPct: owner?.ownershipPct || 0,
        sourceAccount: form.sourceAccount,
        amount: amt,
        currency: "USD",
        status: "PENDING",
        balanceAtDraw: selectedBalance,
        note: form.note,
      }, ...prev]);

      toast.success(`Drawing of ${formatUSD(amt)} recorded`);
      setForm((f) => ({ ...f, amount: "", note: "" }));
      setWarning("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to record drawing");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-display text-ink-white">Owner Drawings</h1>
        <p className="text-sm text-ink-muted mt-1">Distribute from Profit or Owner's Comp</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 mb-6 space-y-4">
        <div className="text-sm font-semibold text-ink-white">New Distribution</div>

        {warning && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold">Cap Warning</div>
              <div className="text-xs mt-0.5">{warning}</div>
              <button
                type="button"
                onClick={() => { setWarning(""); toast.warning("Drawing forced through — flagged for review"); }}
                className="text-xs underline mt-1"
              >
                Force proceed anyway
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">Entity *</label>
            <select value={form.entityId} onChange={(e) => setForm({ ...form, entityId: e.target.value, ownerId: "" })} className="input">
              {entities.map((en) => <option key={en.id} value={en.id}>{en.name}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Owner *</label>
            <select value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })} className="input">
              <option value="">— Select owner —</option>
              {filteredOwners.map((o) => (
                <option key={o.id} value={o.id}>{o.ownerName} ({o.ownershipPct}%)</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="input-label">Source Account</label>
            <select value={form.sourceAccount} onChange={(e) => { setForm({ ...form, sourceAccount: e.target.value }); setWarning(""); }} className="input">
              <option value="PROFIT">Profit ({formatUSD(getBalance(form.entityId, "PROFIT"))})</option>
              <option value="OWNERS_COMP">Owner's Comp ({formatUSD(getBalance(form.entityId, "OWNERS_COMP"))})</option>
            </select>
          </div>
          <div>
            <label className="input-label">Amount (USD) *</label>
            <input
              type="number" step="0.01" value={form.amount}
              onChange={(e) => { setForm({ ...form, amount: e.target.value }); setWarning(""); }}
              placeholder="0.00" className="input font-mono" required
            />
          </div>
          <div>
            <label className="input-label">Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input" />
          </div>
          <div>
            <label className="input-label">Note</label>
            <input type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Optional…" className="input" />
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? "Recording…" : "Record Drawing"}
        </button>
      </form>

      {/* History */}
      <div className="table-container">
        <div className="card-header">
          <span className="text-sm font-semibold text-ink-white">Distribution History</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="table-header">
              {["Date", "Owner", "Entity", "Source", "Amount", "Status"].map((h) => (
                <th key={h} className="table-cell text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {localDrawings.map((d) => (
              <tr key={d.id} className="table-row">
                <td className="table-cell font-mono text-xs text-ink-secondary">{d.date}</td>
                <td className="table-cell text-ink-white text-sm">{d.ownerName}</td>
                <td className="table-cell">
                  <span className="badge" style={{ background: `${d.entityColor}15`, color: d.entityColor, border: `1px solid ${d.entityColor}30` }}>
                    {d.entityName}
                  </span>
                </td>
                <td className="table-cell">
                  <span className="text-xs font-medium" style={{ color: PF_CONFIG[d.sourceAccount as keyof typeof PF_CONFIG]?.color }}>
                    {PF_CONFIG[d.sourceAccount as keyof typeof PF_CONFIG]?.label}
                  </span>
                </td>
                <td className="table-cell font-mono font-semibold text-accent-red">-{formatUSD(d.amount)}</td>
                <td className="table-cell">
                  <span className={`badge ${d.status === "COMPLETED" ? "bg-accent-green/10 text-accent-green" : "bg-accent-amber/10 text-accent-amber"}`}>
                    {d.status === "COMPLETED" ? "✓ " : "○ "}{d.status.toLowerCase()}
                  </span>
                </td>
              </tr>
            ))}
            {localDrawings.length === 0 && (
              <tr><td colSpan={6} className="table-cell text-center text-ink-faint py-10">No drawings recorded.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
