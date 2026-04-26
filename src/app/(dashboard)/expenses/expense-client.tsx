"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { Receipt, Wallet, Building2, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { UserRole } from "@/types";

interface Entity { id: string; slug: string; name: string; type: string; color: string }
interface BankAccount { id: string; accountName: string; accountType: string; currency: string; bankName: string | null; entityId: string }

type ExpenseType = "BDT_BANK" | "USD_BANK";

const CATEGORIES = [
  "Hosting & Infrastructure", "Salaries & Contractors", "Marketing & Ads",
  "Tools & Software", "Office & Misc", "Freelancer", "Travel", "Support", "Domain & SSL",
];

export function ExpenseClient({
  entities, bankAccounts, userRole,
}: { entities: Entity[]; bankAccounts: BankAccount[]; userRole: UserRole }) {
  const currentEntityId = useAppStore((s) => s.currentEntityId);
  const [tab, setTab] = useState<ExpenseType>("BDT_BANK");
  const [saving, setSaving] = useState(false);

  const defaultEntity = currentEntityId !== "consolidated" ? currentEntityId : entities[0]?.id || "";
  const [form, setForm] = useState({
    entityId: defaultEntity,
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    category: CATEGORIES[0],
    bankAccountId: "",
  });

  const currency = tab === "BDT_BANK" ? "BDT" : "USD";
  const relevantBankAccounts = bankAccounts.filter(
    (ba) => ba.entityId === form.entityId && ba.currency === currency
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.entityId || !form.description || !form.amount) {
      toast.error("Fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: form.entityId,
          date: form.date,
          description: form.description,
          amount: parseFloat(form.amount),
          currency,
          category: form.category,
          expenseType: tab,
          bankAccountId: form.bankAccountId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`Expense recorded: ${form.description}`);
      setForm((f) => ({ ...f, description: "", amount: "", bankAccountId: "" }));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to record expense");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-display text-ink-white">Record Expense</h1>
        <p className="text-sm text-ink-muted mt-1">Choose the expense channel below</p>
      </div>

      {/* Tab selector */}
      <div className="grid grid-cols-3 gap-2">
        {/* Petty Cash — link to petty cash page */}
        <Link href="/petty-cash"
          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-surface-border bg-surface-2 hover:border-accent-blue/30 hover:bg-surface-3 transition-all text-center group"
        >
          <Wallet className="w-5 h-5 text-accent-green group-hover:text-accent-blue" />
          <div>
            <div className="text-sm font-semibold text-ink-white">Petty Cash</div>
            <div className="text-2xs text-ink-faint mt-0.5">BDT cash expenses</div>
          </div>
          <ExternalLink className="w-3 h-3 text-ink-faint" />
        </Link>

        <button
          type="button"
          onClick={() => setTab("BDT_BANK")}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
            tab === "BDT_BANK"
              ? "border-accent-blue/40 bg-accent-blue/8 text-accent-blue"
              : "border-surface-border bg-surface-2 text-ink-secondary hover:border-accent-blue/20"
          }`}
        >
          <Building2 className="w-5 h-5" />
          <div>
            <div className="text-sm font-semibold">BDT Bank</div>
            <div className="text-2xs text-ink-faint mt-0.5">Local BDT account</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setTab("USD_BANK")}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
            tab === "USD_BANK"
              ? "border-accent-blue/40 bg-accent-blue/8 text-accent-blue"
              : "border-surface-border bg-surface-2 text-ink-secondary hover:border-accent-blue/20"
          }`}
        >
          <Receipt className="w-5 h-5" />
          <div>
            <div className="text-sm font-semibold">USD Bank</div>
            <div className="text-2xs text-ink-faint mt-0.5">Foreign USD account</div>
          </div>
        </button>
      </div>

      {/* Expense Form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div className="text-sm font-semibold text-ink-white">
          {tab === "BDT_BANK" ? "Local BDT Bank Expense" : "Foreign USD Bank Expense"}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">Entity *</label>
            <select
              value={form.entityId}
              onChange={(e) => setForm({ ...form, entityId: e.target.value, bankAccountId: "" })}
              className="input"
            >
              {entities.map((en) => <option key={en.id} value={en.id}>{en.name}</option>)}
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
            placeholder={tab === "BDT_BANK" ? "e.g., Office rent — April" : "e.g., DigitalOcean subscription"}
            className="input"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">Amount ({currency}) *</label>
            <input
              type="number" step="0.01" min="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0.00"
              className="input font-mono"
              required
            />
          </div>
          <div>
            <label className="input-label">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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

        {relevantBankAccounts.length === 0 && (
          <div className="text-2xs text-ink-faint bg-surface-2 rounded-lg px-3 py-2">
            No {currency} bank accounts for this entity.{" "}
            <Link href="/settings" className="text-accent-blue hover:underline">Add one in Settings →</Link>
          </div>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? "Recording…" : `Record ${currency} Expense`}
        </button>
      </form>
    </div>
  );
}
