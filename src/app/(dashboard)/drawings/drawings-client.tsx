"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { formatUSD, PF_CONFIG } from "@/lib/utils";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

interface DrawingRecord {
  id: string; date: string; entityName: string; entityColor: string;
  ownerName: string; ownershipPct: number; sourceAccount: string;
  amount: number; currency: string; status: string;
  balanceAtDraw: number | null; note: string | null;
}

interface Owner {
  id: string; ownerName: string; ownershipPct: number;
  entityId: string; entityName: string;
}

export function DrawingsClient({ drawings, owners }: { drawings: DrawingRecord[]; owners: Owner[] }) {
  const currentEntityId = useAppStore((s) => s.currentEntityId);
  const [warning, setWarning] = useState("");

  // Simulated balances (in production, fetched via API)
  const simulatedBalances = { PROFIT: 8500, OWNERS_COMP: 12000 };

  const [form, setForm] = useState({
    ownerId: owners[0]?.id || "",
    sourceAccount: "PROFIT" as string,
    amount: "",
    date: new Date().toISOString().split("T")[0],
    note: "",
  });

  const filteredDrawings = currentEntityId === "consolidated"
    ? drawings
    : drawings.filter((d) => {
        const owner = owners.find((o) => o.id === form.ownerId);
        return owner?.entityId === currentEntityId;
      });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(form.amount);
    if (!amt || !form.ownerId) {
      toast.error("Fill all required fields");
      return;
    }

    const balance = simulatedBalances[form.sourceAccount as keyof typeof simulatedBalances] || 0;
    if (amt > balance) {
      setWarning(
        `Drawing of ${formatUSD(amt)} exceeds ${PF_CONFIG[form.sourceAccount as keyof typeof PF_CONFIG]?.label || form.sourceAccount} balance of ${formatUSD(balance)}. This may destabilize your Profit First ratios.`
      );
      return;
    }

    const owner = owners.find((o) => o.id === form.ownerId);
    toast.success("Drawing recorded", {
      description: `${formatUSD(amt)} from ${PF_CONFIG[form.sourceAccount as keyof typeof PF_CONFIG]?.label} to ${owner?.ownerName}`,
    });
    setForm({ ...form, amount: "", note: "" });
    setWarning("");
  }

  return (
    <div className="max-w-3xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-display text-ink-white">Owner Drawings</h1>
        <p className="text-sm text-ink-muted mt-1">
          Distribute from Profit or Owner's Comp · Cap warnings enabled
        </p>
      </div>

      {/* New Drawing Form */}
      <form onSubmit={handleSubmit} className="card p-6 mb-6 space-y-4">
        <div className="text-sm font-semibold text-ink-white">New Distribution</div>

        {warning && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm animate-slide-down">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold">Cap Warning</div>
              <div className="text-xs mt-0.5">{warning}</div>
              <button
                type="button"
                onClick={() => { setWarning(""); toast.warning("Drawing forced through — flagged for review"); }}
                className="text-xs underline mt-1 hover:text-accent-red/80"
              >
                Force proceed anyway
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="input-label">Owner</label>
            <select value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })} className="input">
              {owners.map((o) => (
                <option key={o.id} value={o.id}>{o.ownerName} ({o.ownershipPct}%) — {o.entityName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Source Account</label>
            <select value={form.sourceAccount} onChange={(e) => setForm({ ...form, sourceAccount: e.target.value })} className="input">
              <option value="PROFIT">Profit ({formatUSD(simulatedBalances.PROFIT)} avail.)</option>
              <option value="OWNERS_COMP">Owner's Comp ({formatUSD(simulatedBalances.OWNERS_COMP)} avail.)</option>
            </select>
          </div>
          <div>
            <label className="input-label">Amount (USD)</label>
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
        </div>
        <div>
          <label className="input-label">Note</label>
          <input type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Q2 Owner Draw..." className="input" />
        </div>
        <button type="submit" className="btn-primary w-full">Record Drawing</button>
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
            {filteredDrawings.map((d) => (
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
            {filteredDrawings.length === 0 && (
              <tr><td colSpan={6} className="table-cell text-center text-ink-faint py-10">No drawings recorded.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
