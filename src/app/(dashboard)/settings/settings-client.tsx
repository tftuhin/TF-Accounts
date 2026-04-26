"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Building2, Calendar, Wallet } from "lucide-react";

interface Entity { id: string; slug: string; name: string; type: string; color: string }

const ENTITY_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16",
];

const currentMonth = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  return { start: `${y}-${m}-01`, end: `${y}-${m}-${lastDay}` };
};

export function SettingsClient({ entities: initialEntities }: { entities: Entity[] }) {
  const [entities, setEntities] = useState<Entity[]>(initialEntities);

  // ── Entity form ──────────────────────────────────────────────
  const [entityForm, setEntityForm] = useState({
    name: "", slug: "", type: "SUB_BRAND", color: ENTITY_COLORS[0],
  });
  const [savingEntity, setSavingEntity] = useState(false);

  async function handleCreateEntity(e: React.FormEvent) {
    e.preventDefault();
    if (!entityForm.name || !entityForm.slug) { toast.error("Name and slug required"); return; }
    setSavingEntity(true);
    try {
      const res = await fetch("/api/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entityForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`Entity "${entityForm.name}" created`);
      setEntities((prev) => [...prev, { ...entityForm, id: json.data.id }]);
      setEntityForm({ name: "", slug: "", type: "SUB_BRAND", color: ENTITY_COLORS[0] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create entity");
    } finally {
      setSavingEntity(false);
    }
  }

  // ── Petty cash period form ────────────────────────────────────
  const defaultDates = currentMonth();
  const [periodForm, setPeriodForm] = useState({
    entityId:    entities[0]?.id || "",
    periodStart: defaultDates.start,
    periodEnd:   defaultDates.end,
  });
  const [savingPeriod, setSavingPeriod] = useState(false);

  async function handleCreatePeriod(e: React.FormEvent) {
    e.preventDefault();
    if (!periodForm.entityId) { toast.error("Select an entity"); return; }
    setSavingPeriod(true);
    try {
      const res = await fetch("/api/petty-cash/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(periodForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Petty cash period created — entry manager can now record expenses");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create period");
    } finally {
      setSavingPeriod(false);
    }
  }

  return (
    <div className="max-w-2xl animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-display text-ink-white">Settings</h1>
        <p className="text-sm text-ink-muted mt-1">Admin only · Configure entities and petty cash</p>
      </div>

      {/* ── Entities ─────────────────────────────────────────── */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-accent-blue" />
          <div className="text-sm font-semibold text-ink-white">Entities (Brands)</div>
        </div>
        <p className="text-2xs text-ink-faint -mt-2">
          Entities represent your brands or sub-brands. Create at least one before recording anything.
        </p>

        {/* Existing entities */}
        {entities.length > 0 && (
          <div className="space-y-1.5">
            {entities.map((en) => (
              <div key={en.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-2 border border-surface-border">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: en.color }} />
                <span className="text-sm text-ink-primary flex-1">{en.name}</span>
                <span className="text-2xs text-ink-faint font-mono">{en.slug}</span>
                <span className="badge bg-surface-4 text-ink-faint">{en.type === "PARENT" ? "Parent" : "Sub-brand"}</span>
              </div>
            ))}
          </div>
        )}

        {/* Create entity form */}
        <form onSubmit={handleCreateEntity} className="space-y-3 pt-2 border-t border-surface-border">
          <div className="text-xs font-semibold text-ink-secondary flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Entity
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Name</label>
              <input
                type="text"
                value={entityForm.name}
                onChange={(e) => {
                  const name = e.target.value;
                  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
                  setEntityForm({ ...entityForm, name, slug });
                }}
                placeholder="e.g., Teamosis BD"
                className="input"
              />
            </div>
            <div>
              <label className="input-label">Slug</label>
              <input
                type="text"
                value={entityForm.slug}
                onChange={(e) => setEntityForm({ ...entityForm, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                placeholder="teamosis-bd"
                className="input font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Type</label>
              <select value={entityForm.type} onChange={(e) => setEntityForm({ ...entityForm, type: e.target.value })} className="input">
                <option value="SUB_BRAND">Sub-brand</option>
                <option value="PARENT">Parent / Holding</option>
              </select>
            </div>
            <div>
              <label className="input-label">Color</label>
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {ENTITY_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEntityForm({ ...entityForm, color: c })}
                    className="w-6 h-6 rounded-md transition-transform hover:scale-110"
                    style={{
                      background: c,
                      outline: entityForm.color === c ? `2px solid ${c}` : "none",
                      outlineOffset: "2px",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <button type="submit" disabled={savingEntity} className="btn-primary w-full text-sm">
            {savingEntity ? "Creating…" : "Create Entity"}
          </button>
        </form>
      </div>

      {/* ── Petty Cash Period ────────────────────────────────── */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-accent-green" />
          <div className="text-sm font-semibold text-ink-white">Petty Cash Period</div>
        </div>
        <p className="text-2xs text-ink-faint -mt-2">
          Create a monthly period to activate petty cash tracking for the Entry Manager.
          Currency is always <strong className="text-ink-secondary">BDT</strong>.
          Fund the account by recording a <em>Fund Top-up</em> entry after creation.
        </p>

        {entities.length === 0 ? (
          <div className="px-4 py-3 rounded-lg bg-surface-2 border border-surface-border text-sm text-ink-muted text-center">
            Create an entity first before opening a petty cash period.
          </div>
        ) : (
          <form onSubmit={handleCreatePeriod} className="space-y-3">
            <div>
              <label className="input-label">Entity</label>
              <select
                value={periodForm.entityId}
                onChange={(e) => setPeriodForm({ ...periodForm, entityId: e.target.value })}
                className="input"
              >
                {entities.map((en) => (
                  <option key={en.id} value={en.id}>{en.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> Period Start
                </label>
                <input
                  type="date"
                  value={periodForm.periodStart}
                  onChange={(e) => setPeriodForm({ ...periodForm, periodStart: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="input-label flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> Period End
                </label>
                <input
                  type="date"
                  value={periodForm.periodEnd}
                  onChange={(e) => setPeriodForm({ ...periodForm, periodEnd: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <button type="submit" disabled={savingPeriod} className="btn-primary w-full text-sm">
              {savingPeriod ? "Creating…" : "Open Petty Cash Period"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
