"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Download, Trash2, Pencil, ChevronLeft, ChevronRight, X, Clock } from "lucide-react";
import { formatUSD, formatBDT } from "@/lib/utils";
import { EXPENSE_CATEGORIES, CATEGORY_KEYS } from "@/lib/expense-categories";
import type { UserRole } from "@/types";

const ALL_CATEGORIES = ["Income", ...CATEGORY_KEYS];

interface Entity { id: string; name: string; color: string }
interface JournalEntry {
  id: string; date: string; description: string; category: string | null;
  entityName: string; entityColor: string; type: string;
  amount: number; currency: string; status: string;
}
interface Pagination { total: number; page: number; pages: number; limit: number }

interface EditRecord {
  editedByEmail: string;
  editedByRole: string;
  editedAt: string;
  changes: Record<string, { from: unknown; to: unknown }>;
}
interface EntryDetail extends JournalEntry {
  usdAmount: number | null;
  createdAt: string;
  updatedAt: string;
  createdByEmail: string | null;
  editLog: EditRecord[];
}

function formatChangeValue(field: string, val: unknown): string {
  if (field === "amount") return formatBDT(Number(val));
  if (field === "date") return String(val);
  return String(val) || "—";
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function JournalsClient({ entities, userRole }: { entities: Entity[]; userRole: UserRole }) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, pages: 1, limit: 50 });
  const [loading, setLoading] = useState(false);

  const [filterEntity, setFilterEntity] = useState("consolidated");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [page, setPage] = useState(1);

  // Detail view state
  const [detail, setDetail] = useState<EntryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Edit modal state
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [editForm, setEditForm] = useState({ description: "", category: "", subcategory: "", date: "", amount: "" });
  const [saving, setSaving] = useState(false);

  const canDelete = userRole === "ADMIN";
  const canEdit = userRole === "ADMIN" || userRole === "ACCOUNTS_MANAGER";

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (filterEntity !== "consolidated") params.set("entityId", filterEntity);
    if (filterFrom) params.set("from", filterFrom);
    if (filterTo) params.set("to", filterTo);

    try {
      const res = await fetch(`/api/journals?${params}`);
      const json = await res.json();
      if (json.success) {
        setEntries(json.data);
        setPagination(json.pagination);
      }
    } finally {
      setLoading(false);
    }
  }, [page, filterEntity, filterFrom, filterTo]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  async function openDetail(id: string) {
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/journals?entryId=${id}`);
      const json = await res.json();
      if (json.success) setDetail(json.data);
    } finally {
      setDetailLoading(false);
    }
  }

  function exportCSV() {
    const headers = ["Date", "Entity", "Description", "Category", "Type", "Amount", "Currency", "Status"];
    const rows = entries.map((e) => [
      e.date, e.entityName, `"${e.description.replace(/"/g, '""')}"`,
      e.category || "", e.type, e.amount, e.currency, e.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `journals-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this journal entry? This cannot be undone.")) return;
    const res = await fetch(`/api/journals?id=${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success("Entry deleted");
    } else {
      toast.error(json.error || "Failed to delete");
    }
  }

  function openEdit(entry: JournalEntry) {
    setEditing(entry);
    const raw = entry.category || "";
    const sepIdx = raw.indexOf(" › ");
    const cat = sepIdx >= 0 ? raw.slice(0, sepIdx) : raw;
    const sub = sepIdx >= 0 ? raw.slice(sepIdx + 3) : "";
    setEditForm({ description: entry.description, category: cat, subcategory: sub, date: entry.date, amount: String(entry.amount) });
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const fullCategory = editForm.subcategory
        ? `${editForm.category} › ${editForm.subcategory}`
        : editForm.category;
      const parsedAmount = parseFloat(editForm.amount);
      const res = await fetch("/api/journals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          description: editForm.description,
          category: fullCategory,
          date: editForm.date,
          ...(parsedAmount > 0 ? { amount: parsedAmount } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setEntries((prev) => prev.map((en) =>
        en.id === editing.id
          ? { ...en, description: editForm.description, category: fullCategory, date: editForm.date, ...(parsedAmount > 0 ? { amount: parsedAmount } : {}) }
          : en
      ));
      toast.success("Entry updated");
      setEditing(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display text-ink-white">All Journals</h1>
          <p className="text-sm text-ink-muted mt-1">{pagination.total} total entries</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-2 border border-surface-border text-sm text-ink-secondary hover:text-ink-white hover:bg-surface-3">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="input-label">Entity</label>
          <select value={filterEntity} onChange={(e) => { setFilterEntity(e.target.value); setPage(1); }} className="input">
            <option value="consolidated">All Entities</option>
            {entities.map((en) => <option key={en.id} value={en.id}>{en.name}</option>)}
          </select>
        </div>
        <div>
          <label className="input-label">From</label>
          <input type="date" value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }} className="input" />
        </div>
        <div>
          <label className="input-label">To</label>
          <input type="date" value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setPage(1); }} className="input" />
        </div>
        {(filterFrom || filterTo || filterEntity !== "consolidated") && (
          <button
            onClick={() => { setFilterEntity("consolidated"); setFilterFrom(""); setFilterTo(""); setPage(1); }}
            className="flex items-center gap-1 text-xs text-ink-faint hover:text-ink-primary px-2 py-2"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                {["Date", "Entity", "Description", "Category", "Type", "Amount", "Status", ...(canEdit ? ["Actions"] : [])].map((h) => (
                  <th key={h} className="table-cell text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="table-cell text-center text-ink-faint py-10">Loading…</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={8} className="table-cell text-center text-ink-faint py-10">No journal entries found.</td></tr>
              ) : entries.map((en) => (
                <tr
                  key={en.id}
                  className="table-row cursor-pointer"
                  onClick={() => openDetail(en.id)}
                >
                  <td className="table-cell font-mono text-xs text-ink-secondary">{en.date}</td>
                  <td className="table-cell">
                    <span className="badge" style={{ background: `${en.entityColor}15`, color: en.entityColor, border: `1px solid ${en.entityColor}30` }}>
                      {en.entityName}
                    </span>
                  </td>
                  <td className="table-cell text-ink-white max-w-xs truncate">{en.description}</td>
                  <td className="table-cell text-xs text-ink-faint">{en.category || "—"}</td>
                  <td className="table-cell">
                    <span className={`badge text-xs ${en.type === "Income" ? "bg-accent-green/10 text-accent-green" : en.type === "Expense" ? "bg-accent-red/10 text-accent-red" : "bg-surface-4 text-ink-faint"}`}>
                      {en.type}
                    </span>
                  </td>
                  <td className={`table-cell font-mono text-sm font-semibold ${en.type === "Income" ? "text-accent-green" : "text-accent-red"}`}>
                    {en.type === "Income" ? "+" : "-"}
                    {en.currency === "BDT" ? formatBDT(en.amount) : formatUSD(en.amount)}
                  </td>
                  <td className="table-cell">
                    <span className={`badge text-2xs ${en.status === "FINALIZED" ? "bg-accent-green/10 text-accent-green" : "bg-surface-4 text-ink-faint"}`}>
                      {en.status}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="table-cell" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openEdit(en)} className="p-1.5 rounded hover:bg-accent-blue/10 text-ink-faint hover:text-accent-blue">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {canDelete && (
                          <button onClick={() => handleDelete(en.id)} className="p-1.5 rounded hover:bg-accent-red/10 text-ink-faint hover:text-accent-red">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-surface-border flex items-center justify-between">
            <span className="text-xs text-ink-faint">
              Page {pagination.page} of {pagination.pages} · {pagination.total} entries
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded hover:bg-surface-3 disabled:opacity-40 text-ink-secondary">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="p-1.5 rounded hover:bg-surface-3 disabled:opacity-40 text-ink-secondary">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {(detailLoading || detail) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-surface-1 border border-surface-border rounded-xl w-full max-w-lg p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-ink-white">Journal Entry Details</div>
              <button onClick={() => setDetail(null)} className="text-ink-faint hover:text-ink-primary"><X className="w-4 h-4" /></button>
            </div>

            {detailLoading ? (
              <div className="py-10 text-center text-ink-faint text-sm">Loading…</div>
            ) : detail ? (
              <>
                {/* Entry info grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-2xs text-ink-faint uppercase tracking-wide mb-1">Date</div>
                    <div className="text-sm font-mono text-ink-white">{detail.date}</div>
                  </div>
                  <div>
                    <div className="text-2xs text-ink-faint uppercase tracking-wide mb-1">Entity</div>
                    <span className="badge text-xs" style={{ background: `${detail.entityColor}15`, color: detail.entityColor, border: `1px solid ${detail.entityColor}30` }}>
                      {detail.entityName}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <div className="text-2xs text-ink-faint uppercase tracking-wide mb-1">Description</div>
                    <div className="text-sm text-ink-white">{detail.description}</div>
                  </div>
                  <div>
                    <div className="text-2xs text-ink-faint uppercase tracking-wide mb-1">Amount</div>
                    <div className={`text-sm font-mono font-semibold ${detail.type === "Income" ? "text-accent-green" : "text-accent-red"}`}>
                      {detail.type === "Income" ? "+" : "-"}{formatBDT(detail.amount)}
                      {detail.usdAmount && <span className="ml-1 text-xs text-ink-faint">(${detail.usdAmount.toLocaleString()} USD)</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xs text-ink-faint uppercase tracking-wide mb-1">Type</div>
                    <span className={`badge text-xs ${detail.type === "Income" ? "bg-accent-green/10 text-accent-green" : detail.type === "Expense" ? "bg-accent-red/10 text-accent-red" : "bg-surface-4 text-ink-faint"}`}>
                      {detail.type}
                    </span>
                  </div>
                  <div>
                    <div className="text-2xs text-ink-faint uppercase tracking-wide mb-1">Category</div>
                    <div className="text-sm text-ink-secondary">{detail.category || "—"}</div>
                  </div>
                  <div>
                    <div className="text-2xs text-ink-faint uppercase tracking-wide mb-1">Status</div>
                    <span className={`badge text-2xs ${detail.status === "FINALIZED" ? "bg-accent-green/10 text-accent-green" : "bg-surface-4 text-ink-faint"}`}>
                      {detail.status}
                    </span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-surface-border">
                    <div className="text-2xs text-ink-faint">
                      Created {fmtDateTime(detail.createdAt)}{detail.createdByEmail ? ` by ${detail.createdByEmail}` : ""}
                    </div>
                    {detail.updatedAt !== detail.createdAt && (
                      <div className="text-2xs text-ink-faint mt-0.5">Last modified {fmtDateTime(detail.updatedAt)}</div>
                    )}
                  </div>
                </div>

                {/* Change Log */}
                {detail.editLog.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-ink-secondary font-medium mb-3">
                      <Clock className="w-3.5 h-3.5" />
                      Change Log ({detail.editLog.length} edit{detail.editLog.length > 1 ? "s" : ""})
                    </div>
                    <div className="space-y-2.5">
                      {detail.editLog.map((edit, i) => (
                        <div key={i} className="rounded-lg bg-surface-2 border border-surface-border p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-ink-secondary">{edit.editedByEmail}</span>
                            <span className="text-2xs text-ink-faint">{fmtDateTime(edit.editedAt)}</span>
                          </div>
                          <div className="space-y-1">
                            {Object.entries(edit.changes).map(([field, change]) => (
                              <div key={field} className="text-2xs text-ink-faint">
                                <span className="text-ink-secondary capitalize">{field}:</span>{" "}
                                <span className="line-through opacity-60">{formatChangeValue(field, change.from)}</span>
                                <span className="mx-1 opacity-40">→</span>
                                <span className="text-ink-white">{formatChangeValue(field, change.to)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {canEdit && (
                  <div className="pt-1">
                    <button
                      onClick={() => {
                        const entry = entries.find((e) => e.id === detail.id);
                        if (entry) { setDetail(null); openEdit(entry); }
                      }}
                      className="w-full py-2 rounded-lg bg-accent-blue/10 border border-accent-blue/20 text-sm text-accent-blue hover:bg-accent-blue/20"
                    >
                      <Pencil className="w-3.5 h-3.5 inline mr-1.5" />
                      Edit This Entry
                    </button>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-1 border border-surface-border rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-ink-white">Edit Journal Entry</div>
              <button onClick={() => setEditing(null)} className="text-ink-faint hover:text-ink-primary"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="input-label">Date</label>
                <input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className="input" />
              </div>
              <div>
                <label className="input-label">Amount (BDT)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint text-sm">৳</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                    className="input pl-7"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="input-label">Description</label>
                <input type="text" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="input" required />
              </div>
              <div>
                <label className="input-label">Category</label>
                <select
                  value={editForm.category}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setEditForm({ ...editForm, category: cat, subcategory: EXPENSE_CATEGORIES[cat]?.[0] || "" });
                  }}
                  className="input"
                >
                  {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {(EXPENSE_CATEGORIES[editForm.category]?.length ?? 0) > 0 && (
                <div>
                  <label className="input-label">Subcategory</label>
                  <select
                    value={editForm.subcategory}
                    onChange={(e) => setEditForm({ ...editForm, subcategory: e.target.value })}
                    className="input"
                  >
                    <option value="">— None —</option>
                    {EXPENSE_CATEGORIES[editForm.category].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditing(null)} className="flex-1 py-2 rounded-lg border border-surface-border text-sm text-ink-secondary hover:bg-surface-2">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary text-sm">{saving ? "Saving…" : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
