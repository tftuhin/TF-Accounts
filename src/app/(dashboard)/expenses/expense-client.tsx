"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { Upload, X, Split } from "lucide-react";
import type { UserRole } from "@/types";

interface Entity {
  id: string;
  slug: string;
  name: string;
  type: string;
  color: string;
}

const CATEGORIES = [
  "Hosting & Infrastructure", "Salaries & Contractors", "Marketing & Ads",
  "Tools & Software", "Office & Misc", "Freelancer", "Travel", "Support", "Domain & SSL",
];

export function ExpenseClient({ entities, userRole }: { entities: Entity[]; userRole: UserRole }) {
  const currentEntityId = useAppStore((s) => s.currentEntityId);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    category: CATEGORIES[0],
    entityId: currentEntityId === "consolidated" ? entities[0]?.id : currentEntityId,
    receipt: null as File | null,
    splitEnabled: false,
    splits: Object.fromEntries(
      entities.filter((e) => e.type === "SUB_BRAND").map((e) => [e.id, 0])
    ) as Record<string, number>,
  });

  const subBrands = entities.filter((e) => e.type === "SUB_BRAND");
  const splitTotal = Object.values(form.splits).reduce((s, v) => s + v, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description || !form.amount) {
      toast.error("Fill in all required fields");
      return;
    }
    if (form.splitEnabled && splitTotal !== 100) {
      toast.error(`Split percentages must total 100% (currently ${splitTotal}%)`);
      return;
    }

    // In production: POST to /api/transactions
    toast.success("Expense recorded", {
      description: `${form.description} — $${form.amount} to ${CATEGORIES.find(c => c === form.category)}`,
    });
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2000);
  }

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-display text-ink-white">Record Expense</h1>
        <p className="text-sm text-ink-muted mt-1">
          Double-entry: Debits OPEX, Credits Cash/Bank · Receipt is optional
        </p>
      </div>

      {submitted && (
        <div className="mb-5 px-4 py-3 rounded-lg bg-accent-green/10 border border-accent-green/20 text-accent-green text-sm animate-slide-down">
          ✓ Transaction recorded. Journal entry created.
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        {/* Date & Entity */}
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
            <label className="input-label">Entity</label>
            <select
              value={form.entityId}
              onChange={(e) => setForm({ ...form, entityId: e.target.value })}
              className="input"
            >
              {entities.map((ent) => (
                <option key={ent.id} value={ent.id}>{ent.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="input-label">Description *</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="e.g., DigitalOcean Hosting — April"
            className="input"
            required
          />
        </div>

        {/* Amount & Category */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="input-label">Amount (USD) *</label>
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
          <div>
            <label className="input-label">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="input"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Receipt Upload (Optional) */}
        <div>
          <label className="input-label">
            Receipt / Invoice <span className="text-ink-faint">(optional)</span>
          </label>
          <label className="block cursor-pointer">
            <div className={`p-5 border-2 border-dashed rounded-lg text-center transition-colors
              ${form.receipt ? "border-accent-green/30 bg-accent-green/5" : "border-surface-border-light hover:border-accent-blue/30 bg-surface-2"}`}
            >
              {form.receipt ? (
                <div className="flex items-center justify-center gap-2 text-accent-green text-sm">
                  <Upload className="w-4 h-4" />
                  {form.receipt.name}
                  <button
                    type="button"
                    onClick={(ev) => { ev.preventDefault(); setForm({ ...form, receipt: null }); }}
                    className="ml-2 p-1 hover:bg-accent-red/10 rounded"
                  >
                    <X className="w-3 h-3 text-accent-red" />
                  </button>
                </div>
              ) : (
                <div className="text-sm text-ink-muted">
                  <Upload className="w-5 h-5 mx-auto mb-1 text-ink-faint" />
                  Click to upload (PDF / Image)
                </div>
              )}
            </div>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => setForm({ ...form, receipt: e.target.files?.[0] || null })}
            />
          </label>
        </div>

        {/* Split Transaction */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, splitEnabled: !form.splitEnabled })}
              className={`relative w-9 h-5 rounded-full transition-colors ${form.splitEnabled ? "bg-accent-blue" : "bg-surface-4"}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.splitEnabled ? "left-4" : "left-0.5"}`} />
            </button>
            <span className="text-sm text-ink-secondary flex items-center gap-1.5">
              <Split className="w-3.5 h-3.5" /> Split across sub-brands
            </span>
          </div>

          {form.splitEnabled && (
            <div className="grid grid-cols-3 gap-3 p-4 bg-surface-2 rounded-lg border border-surface-border">
              {subBrands.map((sb) => (
                <div key={sb.id}>
                  <div className="text-xs font-semibold mb-1.5" style={{ color: sb.color }}>{sb.name}</div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={form.splits[sb.id] || 0}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          splits: { ...form.splits, [sb.id]: parseInt(e.target.value) || 0 },
                        })
                      }
                      className="input w-16 text-center py-1.5 text-xs"
                    />
                    <span className="text-xs text-ink-faint">%</span>
                  </div>
                  {form.amount && (
                    <div className="text-xs text-ink-faint font-mono mt-1">
                      = ${((parseFloat(form.amount) || 0) * (form.splits[sb.id] || 0) / 100).toFixed(2)}
                    </div>
                  )}
                </div>
              ))}
              <div className="col-span-3 mt-2">
                <div className={`text-xs font-medium ${splitTotal === 100 ? "text-accent-green" : "text-accent-red"}`}>
                  {splitTotal === 100 ? "✓ " : "⚠ "}Total: {splitTotal}%{splitTotal !== 100 && " — Must equal 100%"}
                </div>
              </div>
            </div>
          )}
        </div>

        <button type="submit" className="btn-primary w-full">
          Record Expense Entry
        </button>
      </form>
    </div>
  );
}
