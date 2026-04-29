"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Building2, Calendar, Wallet, CreditCard, Users, Trash2, Pencil, Check, X, Send, Zap } from "lucide-react";
import md5 from "blueimp-md5";

interface Ownership { id: string; entityId: string; ownerName: string; ownershipPct: number; effectiveFrom: string; effectiveTo: string | null }
interface Entity { id: string; slug: string; name: string; type: string; color: string; ownership?: Ownership[] }
interface BankAccount { id: string; entityId: string; entityName: string; entityColor: string; accountName: string; accountType: string; currency: string; bankName: string | null }
interface TeamMember { id: string; email: string; fullName: string; role: string; isActive: boolean; isPending?: boolean; invitedAt?: string }

const ENTITY_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16",
];

const ACCOUNT_TYPES = [
  { value: "FOREIGN_USD", label: "Foreign USD (Stripe, PayPal, Wise)" },
  { value: "LOCAL_USD",   label: "Local USD account" },
  { value: "LOCAL_BDT",   label: "Local BDT account" },
  { value: "PETTY_CASH",  label: "Petty Cash" },
];

const currentMonth = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  return { start: `${y}-${m}-01`, end: `${y}-${m}-${lastDay}` };
};

function gravatarUrl(email: string): string {
  const hash = md5(email.trim().toLowerCase());
  return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=64`;
}

export function SettingsClient({
  entities: initialEntities,
  bankAccounts: initialBankAccounts,
  teamMembers: initialTeamMembers,
}: {
  entities: Entity[];
  bankAccounts: BankAccount[];
  teamMembers: TeamMember[];
}) {
  const [entities, setEntities] = useState(initialEntities);
  const [bankAccounts, setBankAccounts] = useState(initialBankAccounts);
  const [teamMembers, setTeamMembers] = useState(initialTeamMembers);
  const [seeding, setSeeding] = useState(false);
  const [confirmSeed, setConfirmSeed] = useState(false);

  // ── Entity form ──────────────────────────────────────────────
  const [entityForm, setEntityForm] = useState({ name: "", slug: "", type: "SUB_BRAND", color: ENTITY_COLORS[0] });
  const [savingEntity, setSavingEntity] = useState(false);
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [editEntityForm, setEditEntityForm] = useState({ name: "", slug: "", color: "", type: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  function startEditEntity(en: Entity) {
    setEditingEntityId(en.id);
    setEditEntityForm({ name: en.name, slug: en.slug, color: en.color, type: en.type });
  }

  async function handleEditEntity(id: string) {
    setSavingEdit(true);
    try {
      const res = await fetch("/api/entities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...editEntityForm }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setEntities((prev) => prev.map((e) => e.id === id ? { ...e, ...editEntityForm } : e));
      setEditingEntityId(null);
      toast.success("Entity updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update entity");
    } finally {
      setSavingEdit(false);
    }
  }

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

  // ── Partnership management ──────────────────────────────────
  const todayStr = new Date().toISOString().split("T")[0];
  const [partnerForm, setPartnerForm] = useState<{ ownerName: string; ownershipPct: string; effectiveFrom: string; notes: string }>({ ownerName: "", ownershipPct: "", effectiveFrom: todayStr, notes: "" });
  const [savingPartner, setSavingPartner] = useState(false);
  const [expandedEntity, setExpandedEntity] = useState<string | null>(null);

  async function handleAddPartner(entityId: string) {
    if (!partnerForm.ownerName || !partnerForm.ownershipPct || !partnerForm.effectiveFrom) {
      toast.error("Name, %, and date required");
      return;
    }
    setSavingPartner(true);
    try {
      const res = await fetch("/api/ownership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId,
          ownerName: partnerForm.ownerName,
          ownershipPct: Number(partnerForm.ownershipPct),
          effectiveFrom: partnerForm.effectiveFrom,
          notes: partnerForm.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      // Reload ownership data for this entity
      const ownership = await fetch(`/api/ownership?entityId=${entityId}`)
        .then((r) => r.json())
        .then((data) => data.data);

      setEntities((prev) =>
        prev.map((e) => (e.id === entityId ? { ...e, ownership } : e))
      );
      toast.success(`Partner "${partnerForm.ownerName}" added`);
      setPartnerForm({ ownerName: "", ownershipPct: "", effectiveFrom: todayStr, notes: "" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add partner");
    } finally {
      setSavingPartner(false);
    }
  }

  async function handleRemovePartner(recordId: string, ownerName: string, entityId: string) {
    const exitDate = prompt(`Remove ${ownerName}? Enter exit date (YYYY-MM-DD):`, new Date().toISOString().split("T")[0]);
    if (!exitDate) return;

    setSavingPartner(true);
    try {
      const res = await fetch("/api/ownership", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: recordId, effectiveTo: exitDate }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      // Reload ownership
      const ownership = await fetch(`/api/ownership?entityId=${entityId}`)
        .then((r) => r.json())
        .then((data) => data.data);

      setEntities((prev) =>
        prev.map((e) => (e.id === entityId ? { ...e, ownership } : e))
      );
      toast.success(`Partner removed (effective ${exitDate})`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove partner");
    } finally {
      setSavingPartner(false);
    }
  }

  // ── Petty cash period ────────────────────────────────────────
  const defaultDates = currentMonth();
  const [periodForm, setPeriodForm] = useState({ entityId: entities[0]?.id || "", periodStart: defaultDates.start, periodEnd: defaultDates.end });
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
      toast.success("Petty cash period created");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create period");
    } finally {
      setSavingPeriod(false);
    }
  }

  // ── Bank account form ────────────────────────────────────────
  const [bankForm, setBankForm] = useState({ entityId: entities[0]?.id || "", accountName: "", accountType: "LOCAL_BDT", currency: "BDT", bankName: "", accountNumber: "" });
  const [savingBank, setSavingBank] = useState(false);

  function handleAccountTypeChange(accountType: string) {
    const currency = accountType === "FOREIGN_USD" || accountType === "LOCAL_USD" ? "USD" : "BDT";
    setBankForm((f) => ({ ...f, accountType, currency }));
  }

  async function handleCreateBankAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!bankForm.entityId || !bankForm.accountName) { toast.error("Entity and account name required"); return; }
    setSavingBank(true);
    try {
      const res = await fetch("/api/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bankForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const entity = entities.find((e) => e.id === bankForm.entityId);
      setBankAccounts((prev) => [...prev, {
        id: json.data.id,
        entityId: bankForm.entityId,
        entityName: entity?.name ?? "",
        entityColor: entity?.color ?? "#3B82F6",
        accountName: bankForm.accountName,
        accountType: bankForm.accountType,
        currency: bankForm.currency,
        bankName: bankForm.bankName || null,
      }]);
      toast.success(`Bank account "${bankForm.accountName}" created`);
      setBankForm((f) => ({ ...f, accountName: "", bankName: "", accountNumber: "" }));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create bank account");
    } finally {
      setSavingBank(false);
    }
  }

  async function handleDeleteBankAccount(id: string, name: string) {
    if (!confirm(`Remove "${name}"?`)) return;
    const res = await fetch(`/api/bank-accounts?id=${id}`, { method: "DELETE" });
    if ((await res.json()).success) {
      setBankAccounts((prev) => prev.filter((a) => a.id !== id));
      toast.success("Account removed");
    }
  }

  // ── Invite user ──────────────────────────────────────────────
  const [inviteForm, setInviteForm] = useState({ email: "", fullName: "", role: "ENTRY_MANAGER" });
  const [savingInvite, setSavingInvite] = useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteForm.email || !inviteForm.fullName) { toast.error("Email and name required"); return; }
    setSavingInvite(true);
    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`Invitation sent to ${inviteForm.email}`);
      setTeamMembers((prev) => [...prev, {
        id: json.data.id,
        email: inviteForm.email,
        fullName: inviteForm.fullName,
        role: inviteForm.role,
        isActive: true,
      }]);
      setInviteForm({ email: "", fullName: "", role: "ENTRY_MANAGER" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setSavingInvite(false);
    }
  }

  // ── Edit user role ──────────────────────────────────────────
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingMemberRole, setEditingMemberRole] = useState<string>("");
  const [savingMemberRole, setSavingMemberRole] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ id: string; email: string; fullName: string } | null>(null);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);

  function startEditMemberRole(memberId: string, currentRole: string) {
    setEditingMemberId(memberId);
    setEditingMemberRole(currentRole);
  }

  async function handleResendInvite(email: string) {
    setResendingInviteId(email);
    try {
      const res = await fetch("/api/users/invite/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`Invitation resent to ${email}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to resend invite");
    } finally {
      setResendingInviteId(null);
    }
  }

  function showDeleteConfirmation(id: string, email: string, fullName: string) {
    setDeleteConfirmModal({ id, email, fullName });
  }

  async function confirmDeleteMember() {
    if (!deleteConfirmModal) return;
    const { id, email } = deleteConfirmModal;
    setRemovingMemberId(id);
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setTeamMembers((prev) => prev.filter((m) => m.id !== id));
      toast.success(`${email} has been removed from the team`);
      setDeleteConfirmModal(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setRemovingMemberId(null);
    }
  }

  async function handleUpdateMemberRole(memberId: string) {
    setSavingMemberRole(true);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: memberId, role: editingMemberRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setTeamMembers((prev) =>
        prev.map((m) => m.id === memberId ? { ...m, role: editingMemberRole } : m)
      );
      toast.success("Role updated");
      setEditingMemberId(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setSavingMemberRole(false);
    }
  }

  async function handleSeedData() {
    if (!confirmSeed) {
      setConfirmSeed(true);
      return;
    }
    setSeeding(true);
    try {
      const res = await fetch("/api/seed", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("All seed data deleted successfully");
      setConfirmSeed(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete seed data");
    } finally {
      setSeeding(false);
    }
  }

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: "Admin",
    ACCOUNTS_MANAGER: "Accounts Manager",
    ENTRY_MANAGER: "Entry Manager",
  };

  return (
    <div className="max-w-2xl animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-display text-ink-white">Settings</h1>
        <p className="text-sm text-ink-muted mt-1">Admin only · Entities, bank accounts, petty cash, team</p>
      </div>

      {/* ── Entities ────────────────────────────────────────── */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-accent-blue" />
          <div className="text-sm font-semibold text-ink-white">Entities (Brands)</div>
        </div>

        {entities.length > 0 && (
          <div className="space-y-2">
            {entities.map((en) => (
              <div key={en.id} className="border border-surface-border rounded-lg overflow-hidden">
                {editingEntityId === en.id ? (
                  <div className="p-3 bg-surface-3 border border-accent-blue/30 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="input-label">Name</label>
                        <input
                          type="text" value={editEntityForm.name} className="input text-sm"
                          onChange={(e) => {
                            const name = e.target.value;
                            const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
                            setEditEntityForm((f) => ({ ...f, name, slug }));
                          }}
                        />
                      </div>
                      <div>
                        <label className="input-label">Slug</label>
                        <input type="text" value={editEntityForm.slug} className="input text-sm font-mono"
                          onChange={(e) => setEditEntityForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="input-label">Type</label>
                        <select value={editEntityForm.type} onChange={(e) => setEditEntityForm((f) => ({ ...f, type: e.target.value }))} className="input text-sm">
                          <option value="SUB_BRAND">Sub-brand</option>
                          <option value="PARENT">Parent / Holding</option>
                        </select>
                      </div>
                      <div>
                        <label className="input-label">Color</label>
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          {ENTITY_COLORS.map((c) => (
                            <button key={c} type="button" onClick={() => setEditEntityForm((f) => ({ ...f, color: c }))}
                              className="w-6 h-6 rounded-md transition-transform hover:scale-110"
                              style={{ background: c, outline: editEntityForm.color === c ? `2px solid ${c}` : "none", outlineOffset: "2px" }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingEntityId(null)} className="btn-secondary text-xs py-1.5">
                        <X className="w-3 h-3" /> Cancel
                      </button>
                      <button onClick={() => handleEditEntity(en.id)} disabled={savingEdit} className="btn-primary text-xs py-1.5">
                        <Check className="w-3 h-3" /> {savingEdit ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 px-3 py-2 bg-surface-2 group cursor-pointer hover:bg-surface-3 transition-colors"
                      onClick={() => setExpandedEntity(expandedEntity === en.id ? null : en.id)}>
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: en.color }} />
                      <span className="text-sm text-ink-primary flex-1">{en.name}</span>
                      <span className="text-2xs text-ink-faint font-mono">{en.slug}</span>
                      <span className="badge bg-surface-4 text-ink-faint">{en.type === "PARENT" ? "Parent" : "Sub-brand"}</span>
                      <button onClick={(e) => { e.stopPropagation(); startEditEntity(en); }} className="opacity-0 group-hover:opacity-100 p-1 rounded text-ink-faint hover:text-accent-blue transition-all">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {expandedEntity === en.id && (
                      <div className="p-3 space-y-3 border-t border-surface-border bg-surface-1">
                        {/* Ownership timeline */}
                        {en.ownership && en.ownership.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-2xs font-semibold text-ink-faint uppercase tracking-wider">Ownership</div>
                            <div className="space-y-1">
                              {en.ownership.map((o) => (
                                <div key={o.id} className="flex items-center justify-between text-2xs px-2 py-1.5 rounded bg-surface-2 border border-surface-border">
                                  <div className="flex-1">
                                    <span className="font-semibold text-ink-primary">{o.ownerName}</span>
                                    <span className="text-ink-faint"> · {o.ownershipPct}%</span>
                                  </div>
                                  <div className="text-ink-faint text-right min-w-fit">
                                    {o.effectiveFrom.split("T")[0]}
                                    {o.effectiveTo ? ` → ${o.effectiveTo.split("T")[0]}` : " (active)"}
                                  </div>
                                  {o.ownerName !== "Teamosis" && !o.effectiveTo && (
                                    <button
                                      onClick={() => handleRemovePartner(o.id, o.ownerName, en.id)}
                                      disabled={savingPartner}
                                      className="ml-2 p-1 rounded text-ink-faint hover:text-accent-red hover:bg-accent-red/10 transition-colors"
                                      title="Remove partner">
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Add partner form */}
                        <div className="space-y-2 pt-2 border-t border-surface-border">
                          <div className="text-2xs font-semibold text-ink-faint uppercase tracking-wider">Add Partner</div>
                          <div className="grid grid-cols-4 gap-2">
                            <input
                              type="text" placeholder="Name" value={partnerForm.ownerName} className="input text-xs"
                              onChange={(e) => setPartnerForm((f) => ({ ...f, ownerName: e.target.value }))}
                            />
                            <input
                              type="number" placeholder="%" min="1" max="99" value={partnerForm.ownershipPct} className="input text-xs"
                              onChange={(e) => setPartnerForm((f) => ({ ...f, ownershipPct: e.target.value }))}
                            />
                            <input
                              type="date" value={partnerForm.effectiveFrom} className="input text-xs"
                              onChange={(e) => setPartnerForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
                            />
                            <button
                              onClick={() => handleAddPartner(en.id)}
                              disabled={savingPartner}
                              className="btn-primary text-xs py-1.5 h-9">
                              <Plus className="w-3 h-3" /> {savingPartner ? "…" : "Add"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleCreateEntity} className="space-y-3 pt-2 border-t border-surface-border">
          <div className="text-xs font-semibold text-ink-secondary flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Entity</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Name</label>
              <input
                type="text" value={entityForm.name}
                onChange={(e) => {
                  const name = e.target.value;
                  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
                  setEntityForm({ ...entityForm, name, slug });
                }}
                placeholder="e.g., Teamosis BD" className="input"
              />
            </div>
            <div>
              <label className="input-label">Slug</label>
              <input
                type="text" value={entityForm.slug}
                onChange={(e) => setEntityForm({ ...entityForm, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                placeholder="teamosis-bd" className="input font-mono"
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
                  <button key={c} type="button" onClick={() => setEntityForm({ ...entityForm, color: c })}
                    className="w-6 h-6 rounded-md transition-transform hover:scale-110"
                    style={{ background: c, outline: entityForm.color === c ? `2px solid ${c}` : "none", outlineOffset: "2px" }}
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

      {/* ── Bank Accounts ────────────────────────────────────── */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-accent-blue" />
          <div className="text-sm font-semibold text-ink-white">Bank Accounts</div>
        </div>

        {bankAccounts.length > 0 && (
          <div className="space-y-1.5">
            {bankAccounts.map((ba) => (
              <div key={ba.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-2 border border-surface-border">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ba.entityColor }} />
                <span className="text-sm text-ink-primary flex-1">{ba.accountName}</span>
                <span className="text-2xs text-ink-faint">{ba.entityName}</span>
                <span className="badge bg-surface-4 text-ink-faint">{ba.currency}</span>
                <button onClick={() => handleDeleteBankAccount(ba.id, ba.accountName)} className="text-ink-faint hover:text-accent-red">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {entities.length === 0 ? (
          <div className="text-sm text-ink-muted text-center py-3">Create an entity first.</div>
        ) : (
          <form onSubmit={handleCreateBankAccount} className="space-y-3 pt-2 border-t border-surface-border">
            <div className="text-xs font-semibold text-ink-secondary flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Bank Account</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Entity</label>
                <select value={bankForm.entityId} onChange={(e) => setBankForm({ ...bankForm, entityId: e.target.value })} className="input">
                  {entities.map((en) => <option key={en.id} value={en.id}>{en.name}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">Account Name</label>
                <input type="text" value={bankForm.accountName} onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })} placeholder="e.g., DBBL BDT Account" className="input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Account Type</label>
                <select value={bankForm.accountType} onChange={(e) => handleAccountTypeChange(e.target.value)} className="input">
                  {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">Bank Name</label>
                <input type="text" value={bankForm.bankName} onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })} placeholder="DBBL, Stripe…" className="input" />
              </div>
            </div>
            <button type="submit" disabled={savingBank} className="btn-primary w-full text-sm">
              {savingBank ? "Creating…" : `Create ${bankForm.currency} Account`}
            </button>
          </form>
        )}
      </div>

      {/* ── Petty Cash Period ────────────────────────────────── */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-accent-green" />
          <div className="text-sm font-semibold text-ink-white">Petty Cash Period</div>
        </div>
        <p className="text-2xs text-ink-faint -mt-2">Open a monthly period to activate petty cash tracking. Currency is always BDT.</p>

        {entities.length === 0 ? (
          <div className="text-sm text-ink-muted text-center py-3">Create an entity first.</div>
        ) : (
          <form onSubmit={handleCreatePeriod} className="space-y-3">
            <div>
              <label className="input-label">Entity</label>
              <select value={periodForm.entityId} onChange={(e) => setPeriodForm({ ...periodForm, entityId: e.target.value })} className="input">
                {entities.map((en) => <option key={en.id} value={en.id}>{en.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Period Start</label>
                <input type="date" value={periodForm.periodStart} onChange={(e) => setPeriodForm({ ...periodForm, periodStart: e.target.value })} className="input" />
              </div>
              <div>
                <label className="input-label">Period End</label>
                <input type="date" value={periodForm.periodEnd} onChange={(e) => setPeriodForm({ ...periodForm, periodEnd: e.target.value })} className="input" />
              </div>
            </div>
            <button type="submit" disabled={savingPeriod} className="btn-primary w-full text-sm">
              {savingPeriod ? "Creating…" : "Open Petty Cash Period"}
            </button>
          </form>
        )}
      </div>

      {/* ── Team / Invite ─────────────────────────────────────── */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-accent-blue" />
          <div className="text-sm font-semibold text-ink-white">Team Members</div>
        </div>

        {teamMembers.length > 0 && (
          <div className="space-y-4">
            {/* Active Members */}
            {teamMembers.filter((m) => !m.isPending).length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-ink-secondary">Active Members</div>
                {teamMembers.filter((m) => !m.isPending).map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-2 border border-surface-border">
                    <img src={gravatarUrl(m.email)} alt={m.fullName} className="w-7 h-7 rounded-md flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-ink-white">{m.fullName}</div>
                      <div className="text-2xs text-ink-faint">{m.email}</div>
                    </div>
                    {editingMemberId === m.id ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          value={editingMemberRole}
                          onChange={(e) => setEditingMemberRole(e.target.value)}
                          className="text-2xs px-2 py-1 bg-surface-3 border border-surface-border rounded"
                        >
                          <option value="ENTRY_MANAGER">Entry Manager</option>
                          <option value="ACCOUNTS_MANAGER">Accounts Manager</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                        <button
                          onClick={() => handleUpdateMemberRole(m.id)}
                          disabled={savingMemberRole}
                          className="p-1 text-accent-green hover:bg-accent-green/10 rounded transition"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingMemberId(null)}
                          disabled={savingMemberRole}
                          className="p-1 text-accent-red hover:bg-accent-red/10 rounded transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={`badge text-2xs ${m.role === "ADMIN" ? "bg-accent-red/10 text-accent-red" : m.role === "ACCOUNTS_MANAGER" ? "bg-accent-blue/10 text-accent-blue" : "bg-surface-4 text-ink-faint"}`}>
                          {ROLE_LABELS[m.role] || m.role}
                        </span>
                        <button
                          onClick={() => startEditMemberRole(m.id, m.role)}
                          className="p-1 text-ink-faint hover:text-accent-blue hover:bg-accent-blue/10 rounded transition"
                          title="Edit role"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => showDeleteConfirmation(m.id, m.email, m.fullName)}
                          disabled={removingMemberId === m.id}
                          className="p-1 rounded transition text-ink-faint hover:text-accent-red hover:bg-accent-red/10"
                          title="Remove member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Pending Invitations */}
            {teamMembers.filter((m) => m.isPending).length > 0 && (
              <div className="space-y-1.5 border-t border-surface-border pt-3">
                <div className="text-xs font-semibold text-ink-secondary">Pending Invitations</div>
                {teamMembers.filter((m) => m.isPending).map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-2 border border-surface-border opacity-75">
                    <img src={gravatarUrl(m.email)} alt={m.fullName} className="w-7 h-7 rounded-md flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-ink-white">{m.fullName}</div>
                      <div className="text-2xs text-ink-faint">{m.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge text-2xs bg-accent-amber/10 text-accent-amber">Pending</span>
                      <button
                        onClick={() => handleResendInvite(m.email)}
                        disabled={resendingInviteId === m.email}
                        className="p-1 text-ink-faint hover:text-accent-blue hover:bg-accent-blue/10 rounded transition"
                        title="Resend invitation"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => showDeleteConfirmation(m.id, m.email, m.fullName)}
                        disabled={removingMemberId === m.id}
                        className="p-1 rounded transition text-ink-faint hover:text-accent-red hover:bg-accent-red/10"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleInvite} className="space-y-3 pt-2 border-t border-surface-border">
          <div className="text-xs font-semibold text-ink-secondary flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Invite Team Member</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Full Name</label>
              <input type="text" value={inviteForm.fullName} onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })} placeholder="Rafiqul Islam" className="input" />
            </div>
            <div>
              <label className="input-label">Email</label>
              <input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="rafiq@teamosis.com" className="input" />
            </div>
          </div>
          <div>
            <label className="input-label">Role</label>
            <select value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })} className="input">
              <option value="ENTRY_MANAGER">Entry Manager — petty cash only</option>
              <option value="ACCOUNTS_MANAGER">Accounts Manager — full access, no delete</option>
              <option value="ADMIN">Admin — full access</option>
            </select>
          </div>
          <button type="submit" disabled={savingInvite} className="btn-primary w-full text-sm">
            {savingInvite ? "Sending…" : "Send Invite Email"}
          </button>
        </form>
      </div>

      {/* ── Clear Seed Data (Admin Only) ────────────────────────── */}
      <div className="card p-6 space-y-4 border-accent-red/20 bg-accent-red/5">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent-red" />
          <div className="text-sm font-semibold text-ink-white">Seed Data Management</div>
        </div>
        <p className="text-sm text-ink-muted">Remove all demo data from the database (entities, employees, transactions).</p>
        <button
          onClick={handleSeedData}
          disabled={seeding}
          className={`w-full text-sm font-medium px-4 py-2 rounded-lg transition ${
            confirmSeed
              ? "bg-accent-red/20 border border-accent-red text-accent-red hover:bg-accent-red/30"
              : "btn-secondary"
          }`}
        >
          {seeding ? "Deleting…" : confirmSeed ? "Click again to confirm — all seed data will be deleted" : "Delete All Seed Data"}
        </button>
      </div>

      {/* ── Delete Team Member Confirmation Modal ──────────────── */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-surface-primary to-surface-secondary rounded-xl shadow-2xl max-w-md w-full p-8 space-y-6 border border-accent-red/40">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-accent-red/25 flex items-center justify-center flex-shrink-0 border border-accent-red/50">
                <Trash2 className="w-6 h-6 text-accent-red" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-ink-white">Remove Team Member?</h3>
                <p className="text-sm text-ink-secondary mt-2">
                  You're about to remove <span className="font-semibold text-accent-red">{deleteConfirmModal.fullName}</span>
                  <br />
                  <span className="text-xs text-ink-muted">{deleteConfirmModal.email}</span>
                </p>
              </div>
            </div>

            {/* Warning Section */}
            <div className="bg-accent-red/20 border-2 border-accent-red/60 rounded-lg p-4 space-y-3">
              <p className="font-bold text-accent-red flex items-center gap-2">
                <span className="text-lg">⚠️</span> This action is permanent
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2 text-ink-white">
                  <span className="text-accent-red font-bold">•</span>
                  <span>They will immediately lose access to all data</span>
                </li>
                <li className="flex gap-2 text-ink-white">
                  <span className="text-accent-red font-bold">•</span>
                  <span>All their records will be permanently deleted</span>
                </li>
                <li className="flex gap-2 text-ink-white">
                  <span className="text-accent-red font-bold">•</span>
                  <span>This cannot be undone</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmModal(null)}
                disabled={removingMemberId === deleteConfirmModal.id}
                className="flex-1 px-4 py-3 rounded-lg bg-surface-secondary border border-surface-border text-ink-primary hover:bg-surface-tertiary transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteMember}
                disabled={removingMemberId === deleteConfirmModal.id}
                className="flex-1 px-4 py-3 rounded-lg bg-accent-red text-white hover:bg-red-600 transition font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {removingMemberId === deleteConfirmModal.id ? "Removing…" : "Remove Member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
