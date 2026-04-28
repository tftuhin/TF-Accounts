"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Calendar, DollarSign, User, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";
import { formatBDT } from "@/lib/utils";

interface Employee {
  id: string;
  name: string;
  designation: string | null;
  department: string | null;
  baseSalary: number;
  status: "ACTIVE" | "RESIGNED" | "ON_LEAVE";
  joinedAt: string | null;
  notes: string | null;
  incrementCount: number;
}

interface Salary {
  id: string;
  employeeId: string | null;
  employeeName: string | null;
  amount: number;
  adjustment: number | null;
  adjustmentNote: string | null;
  payPeriod: string | null;
  date: string;
  month: string;
  notes: string | null;
}

export function SalaryClient({ userRole }: { userRole: string }) {
  const [tab, setTab] = useState<"employees" | "payments">("employees");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Employee form state
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({
    name: "",
    designation: "",
    department: "",
    baseSalary: "",
    joinedAt: new Date().toISOString().split("T")[0],
  });

  // Salary form state
  const [showAddSalary, setShowAddSalary] = useState(false);
  const [salaryForm, setSalaryForm] = useState({
    employeeId: "",
    amount: "",
    adjustment: "",
    adjustmentType: "bonus" as "bonus" | "deduction",
    adjustmentNote: "",
    date: new Date().toISOString().split("T")[0],
    payPeriod: "",
  });

  // Batch salary state
  const [showBatch, setShowBatch] = useState(false);
  const [batchForm, setBatchForm] = useState({
    payPeriod: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // Filter state
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  const isAdmin = userRole === "ADMIN" || userRole === "ACCOUNTS_MANAGER";

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [empRes, salRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/salaries"),
      ]);
      const empData = await empRes.json();
      const salData = await salRes.json();
      if (empData.success) setEmployees(empData.data || []);
      if (salData.success) setSalaries(salData.data || []);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeForm.name || !employeeForm.baseSalary) {
      toast.error("Name and base salary are required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: employeeForm.name,
          designation: employeeForm.designation || null,
          department: employeeForm.department || null,
          baseSalary: parseFloat(employeeForm.baseSalary),
          joinedAt: employeeForm.joinedAt || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Employee added");
        setEmployees((prev) => [...prev, json.data]);
        setEmployeeForm({
          name: "",
          designation: "",
          department: "",
          baseSalary: "",
          joinedAt: new Date().toISOString().split("T")[0],
        });
        setShowAddEmployee(false);
      } else {
        toast.error(json.error || "Failed to add employee");
      }
    } catch (err) {
      toast.error("Error adding employee");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateEmployeeStatus(id: string, status: "ACTIVE" | "RESIGNED" | "ON_LEAVE") {
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        setEmployees((prev) =>
          prev.map((e) => (e.id === id ? { ...e, status } : e))
        );
        toast.success(`Employee marked as ${status.toLowerCase()}`);
      } else {
        toast.error(json.error || "Failed to update status");
      }
    } catch (err) {
      toast.error("Error updating employee");
    }
  }

  async function handleAddSalary(e: React.FormEvent) {
    e.preventDefault();
    if (!salaryForm.employeeId || !salaryForm.amount) {
      toast.error("Employee and amount are required");
      return;
    }

    setSaving(true);
    try {
      const adjustmentValue = salaryForm.adjustment
        ? parseFloat(salaryForm.adjustment) * (salaryForm.adjustmentType === "deduction" ? -1 : 1)
        : null;

      const res = await fetch("/api/salaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: salaryForm.employeeId,
          amount: parseFloat(salaryForm.amount),
          adjustment: adjustmentValue,
          adjustmentNote: salaryForm.adjustmentNote || null,
          date: salaryForm.date,
          payPeriod: salaryForm.payPeriod || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Salary recorded");
        setSalaries((prev) => [json.data, ...prev]);
        setSalaryForm({
          employeeId: "",
          amount: "",
          adjustment: "",
          adjustmentType: "bonus",
          adjustmentNote: "",
          date: new Date().toISOString().split("T")[0],
          payPeriod: "",
        });
        setShowAddSalary(false);
      } else {
        toast.error(json.error || "Failed to record salary");
      }
    } catch (err) {
      toast.error("Error recording salary");
    } finally {
      setSaving(false);
    }
  }

  async function handleBatchSalary(e: React.FormEvent) {
    e.preventDefault();
    if (!batchForm.payPeriod || !batchForm.date) {
      toast.error("Pay period and date are required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/salaries/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payPeriod: batchForm.payPeriod,
          date: batchForm.date,
          notes: batchForm.notes || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Batch salary created for ${json.data.count} employees`);
        setBatchForm({
          payPeriod: "",
          date: new Date().toISOString().split("T")[0],
          notes: "",
        });
        setShowBatch(false);
        fetchData();
      } else {
        toast.error(json.error || "Failed to create batch salary");
      }
    } catch (err) {
      toast.error("Error creating batch salary");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSalary(id: string) {
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

  const activeEmployees = employees.filter((e) => e.status === "ACTIVE");
  const totalPaid = salaries.reduce((sum, s) => sum + s.amount, 0);
  const filteredSalaries = salaries.filter((s) => {
    if (filterEmployee && s.employeeId !== filterEmployee) return false;
    if (filterMonth && !s.date.startsWith(filterMonth)) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink-white">Salary Management</h1>
        {isAdmin && (
          <div className="flex gap-2">
            {tab === "employees" && (
              <button
                onClick={() => setShowAddEmployee(!showAddEmployee)}
                className="btn-primary text-sm gap-2 flex items-center"
              >
                <Plus className="w-4 h-4" />
                Add Employee
              </button>
            )}
            {tab === "payments" && (
              <button
                onClick={() => setShowBatch(!showBatch)}
                className="btn-primary text-sm gap-2 flex items-center"
              >
                <TrendingUp className="w-4 h-4" />
                Initiate Batch Salary
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("employees")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "employees"
              ? "bg-accent-blue/10 text-accent-blue border border-accent-blue/15"
              : "text-ink-secondary border border-transparent hover:text-ink-primary"
          }`}
        >
          Employees
        </button>
        <button
          onClick={() => setTab("payments")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "payments"
              ? "bg-accent-blue/10 text-accent-blue border border-accent-blue/15"
              : "text-ink-secondary border border-transparent hover:text-ink-primary"
          }`}
        >
          Payments
        </button>
      </div>

      {/* EMPLOYEES TAB */}
      {tab === "employees" && (
        <div className="space-y-4">
          {/* Add Employee Form */}
          {showAddEmployee && isAdmin && (
            <form onSubmit={handleAddEmployee} className="card p-5 space-y-4 animate-slide-down">
              <div className="text-sm font-semibold text-ink-white">Add New Employee</div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={employeeForm.name}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                  className="input col-span-2"
                />
                <input
                  type="text"
                  placeholder="Designation (e.g., Developer)"
                  value={employeeForm.designation}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, designation: e.target.value })}
                  className="input"
                />
                <input
                  type="text"
                  placeholder="Department"
                  value={employeeForm.department}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })}
                  className="input"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Base Salary (BDT)"
                  value={employeeForm.baseSalary}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, baseSalary: e.target.value })}
                  className="input font-mono"
                />
                <input
                  type="date"
                  value={employeeForm.joinedAt}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, joinedAt: e.target.value })}
                  className="input"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? "Adding..." : "Add Employee"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddEmployee(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Employees Grid */}
          {loading ? (
            <div className="text-center text-ink-faint py-8">Loading...</div>
          ) : employees.length === 0 ? (
            <div className="card p-10 text-center text-ink-faint">No employees yet</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {employees.map((emp) => (
                <div key={emp.id} className="card p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold text-ink-white">{emp.name}</div>
                      {emp.designation && (
                        <div className="text-2xs text-ink-faint">{emp.designation}</div>
                      )}
                    </div>
                    <span
                      className={`text-2xs font-semibold px-2 py-1 rounded ${
                        emp.status === "ACTIVE"
                          ? "bg-accent-green/15 text-accent-green"
                          : emp.status === "RESIGNED"
                          ? "bg-accent-red/15 text-accent-red"
                          : "bg-accent-yellow/15 text-accent-yellow"
                      }`}
                    >
                      {emp.status}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-surface-border space-y-2">
                    <div className="text-sm">
                      <div className="text-ink-faint text-2xs">Base Salary</div>
                      <div className="font-semibold text-accent-green">৳ {formatBDT(emp.baseSalary)}/mo</div>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex gap-2 pt-2 border-t border-surface-border">
                      {emp.status === "ACTIVE" && (
                        <button
                          onClick={() => handleUpdateEmployeeStatus(emp.id, "RESIGNED")}
                          className="text-2xs px-2 py-1 rounded bg-accent-red/10 text-accent-red hover:bg-accent-red/20 transition flex-1"
                        >
                          Mark Resigned
                        </button>
                      )}
                      {emp.status === "RESIGNED" && (
                        <button
                          onClick={() => handleUpdateEmployeeStatus(emp.id, "ACTIVE")}
                          className="text-2xs px-2 py-1 rounded bg-accent-green/10 text-accent-green hover:bg-accent-green/20 transition flex-1"
                        >
                          Mark Active
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PAYMENTS TAB */}
      {tab === "payments" && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-4">
              <div className="text-2xs text-ink-faint uppercase tracking-wider">Total Paid</div>
              <div className="text-2xl font-bold text-ink-white mt-2">
                ৳ {formatBDT(totalPaid)}
              </div>
            </div>
            <div className="card p-4">
              <div className="text-2xs text-ink-faint uppercase tracking-wider">Records</div>
              <div className="text-2xl font-bold text-ink-white mt-2">{salaries.length}</div>
            </div>
            <div className="card p-4">
              <div className="text-2xs text-ink-faint uppercase tracking-wider">Active Employees</div>
              <div className="text-2xl font-bold text-ink-white mt-2">{activeEmployees.length}</div>
            </div>
          </div>

          {/* Batch Salary Form */}
          {showBatch && isAdmin && (
            <form onSubmit={handleBatchSalary} className="card p-5 space-y-4 animate-slide-down">
              <div className="text-sm font-semibold text-ink-white">Initiate Batch Salary</div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="month"
                  value={batchForm.payPeriod}
                  onChange={(e) => setBatchForm({ ...batchForm, payPeriod: e.target.value })}
                  className="input"
                />
                <input
                  type="date"
                  value={batchForm.date}
                  onChange={(e) => setBatchForm({ ...batchForm, date: e.target.value })}
                  className="input"
                />
                <textarea
                  placeholder="Notes (optional)"
                  value={batchForm.notes}
                  onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })}
                  className="input col-span-2"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? "Creating..." : `Create for ${activeEmployees.length} employees`}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBatch(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="input text-sm"
            >
              <option value="">All Employees</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="input text-sm"
            />
          </div>

          {/* Salary List */}
          {loading ? (
            <div className="text-center text-ink-faint py-8">Loading...</div>
          ) : filteredSalaries.length === 0 ? (
            <div className="card p-10 text-center text-ink-faint">No salary records</div>
          ) : (
            <div className="space-y-2">
              {filteredSalaries.map((salary) => (
                <div key={salary.id} className="card p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-accent-blue/15 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-accent-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink-white">{salary.employeeName}</div>
                    <div className="text-2xs text-ink-faint flex items-center gap-2 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {new Date(salary.date).toLocaleDateString()}
                      {salary.payPeriod && ` • ${salary.payPeriod}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-ink-white">
                      ৳ {formatBDT(salary.amount)}
                    </div>
                    {salary.adjustment && (
                      <div
                        className={`text-2xs font-semibold ${
                          salary.adjustment > 0 ? "text-accent-green" : "text-accent-red"
                        }`}
                      >
                        {salary.adjustment > 0 ? "+" : ""}৳ {formatBDT(Math.abs(salary.adjustment))}
                      </div>
                    )}
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteSalary(salary.id)}
                      className="p-1.5 text-ink-faint hover:text-accent-red hover:bg-accent-red/10 rounded transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
