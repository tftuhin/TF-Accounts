"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Calendar, DollarSign, User } from "lucide-react";

interface SalaryRecord {
  id: string;
  employeeName: string;
  amount: number;
  date: string;
  month: string;
  notes?: string;
}

export function SalaryClient({ userRole }: { userRole: string }) {
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employeeName: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    month: "",
    notes: "",
  });

  const isAdmin = userRole === "ADMIN" || userRole === "ACCOUNTS_MANAGER";

  useEffect(() => {
    fetchSalaries();
  }, []);

  async function fetchSalaries() {
    setLoading(true);
    try {
      const res = await fetch("/api/salaries");
      const json = await res.json();
      if (json.success) {
        setSalaries(json.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch salaries:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.employeeName || !form.amount || !form.date) {
      toast.error("Employee name, amount, and date are required");
      return;
    }

    setSaving(true);
    fetch("/api/salaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          toast.success("Salary recorded");
          setSalaries((prev) => [json.data, ...prev]);
          setForm({ employeeName: "", amount: "", date: new Date().toISOString().split("T")[0], month: "", notes: "" });
          setShowForm(false);
        } else {
          toast.error(json.error || "Failed to record salary");
        }
      })
      .catch((err) => toast.error("Error recording salary"))
      .finally(() => setSaving(false));
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this salary record?")) return;
    try {
      const res = await fetch(`/api/salaries/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setSalaries((prev) => prev.filter((s) => s.id !== id));
        toast.success("Salary deleted");
      }
    } catch (err) {
      toast.error("Failed to delete salary");
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink-white">Salary Payments</h1>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary text-sm gap-2 flex items-center"
          >
            <Plus className="w-4 h-4" />
            Record Salary
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-2xs text-ink-faint uppercase tracking-wider">Total Paid</div>
          <div className="text-2xl font-bold text-ink-white mt-2">
            ৳ {salaries.reduce((sum, s) => sum + parseFloat(s.amount || "0"), 0).toLocaleString("en-BD")}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-2xs text-ink-faint uppercase tracking-wider">Records</div>
          <div className="text-2xl font-bold text-ink-white mt-2">{salaries.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-2xs text-ink-faint uppercase tracking-wider">Average</div>
          <div className="text-2xl font-bold text-ink-white mt-2">
            ৳ {salaries.length > 0 ? (salaries.reduce((sum, s) => sum + parseFloat(s.amount || "0"), 0) / salaries.length).toLocaleString("en-BD", { maximumFractionDigits: 0 }) : "0"}
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && isAdmin && (
        <form onSubmit={handleSubmit} className="card p-5 space-y-4 animate-slide-down">
          <div className="text-sm font-semibold text-ink-white">Record Salary Payment</div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Employee Name</label>
              <input
                type="text"
                value={form.employeeName}
                onChange={(e) => setForm({ ...form, employeeName: e.target.value })}
                placeholder="John Doe"
                className="input"
              />
            </div>
            <div>
              <label className="input-label">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Amount (BDT)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                className="input font-mono"
              />
            </div>
            <div>
              <label className="input-label">Month (Optional)</label>
              <input
                type="month"
                value={form.month}
                onChange={(e) => setForm({ ...form, month: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="input-label">Notes (Optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="e.g., Monthly salary, bonus, etc."
              className="input"
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Recording..." : "Record Salary"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Salary List */}
      {loading ? (
        <div className="text-center text-ink-faint py-8">Loading...</div>
      ) : salaries.length === 0 ? (
        <div className="card p-10 text-center text-ink-faint">No salary records yet</div>
      ) : (
        <div className="space-y-2">
          {salaries.map((salary) => (
            <div key={salary.id} className="card p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent-blue/15 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-accent-blue" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-ink-white">{salary.employeeName}</div>
                <div className="text-2xs text-ink-faint flex items-center gap-2 mt-0.5">
                  <Calendar className="w-3 h-3" />
                  {new Date(salary.date).toLocaleDateString()}
                  {salary.month && ` • ${salary.month}`}
                  {salary.notes && ` • ${salary.notes}`}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-bold text-ink-white">
                    ৳ {parseFloat(salary.amount).toLocaleString("en-BD")}
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(salary.id)}
                    className="p-1.5 text-ink-faint hover:text-accent-red hover:bg-accent-red/10 rounded transition"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
