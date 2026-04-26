"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { FileText, BarChart3, Download, RefreshCw } from "lucide-react";
import { formatUSD, formatBDT } from "@/lib/utils";
import type { UserRole } from "@/types";

interface Entity { id: string; slug: string; name: string; type: string; color: string }

interface IncomeStatementData {
  entityName: string;
  from: string;
  to: string;
  income: { total: number; currency: string };
  expenses: { total: number; currency: string; byCategory: { category: string; amount: number }[] };
  grossProfit: number;
  netProfit: number;
}

interface BalanceSheetData {
  entityName: string;
  from: string | null;
  to: string;
  assets: { label: string; amount: number; currency: string }[];
  totalAssets: number;
  equity: number;
}

export function ReportsClient({ entities, userRole }: { entities: Entity[]; userRole: UserRole }) {
  const currentEntityId = useAppStore((s) => s.currentEntityId);
  const [tab, setTab] = useState<"income" | "balance">("income");
  const [loading, setLoading] = useState(false);

  // Date range state
  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const today = now.toISOString().split("T")[0];

  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [reportEntityId, setReportEntityId] = useState(
    currentEntityId !== "consolidated" ? currentEntityId : "consolidated"
  );

  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementData | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetData | null>(null);

  async function generateIncomeStatement() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from: dateFrom, to: dateTo });
      if (reportEntityId !== "consolidated") params.set("entityId", reportEntityId);
      const res = await fetch(`/api/reports/income-statement?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setIncomeStatement(json.data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }

  async function generateBalanceSheet() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from: dateFrom, to: dateTo });
      if (reportEntityId !== "consolidated") params.set("entityId", reportEntityId);
      const res = await fetch(`/api/reports/balance-sheet?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setBalanceSheet(json.data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }

  function exportReport() {
    const data = tab === "income" ? incomeStatement : balanceSheet;
    if (!data) return;
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tab}-report-${dateTo}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const selectedEntityName = reportEntityId === "consolidated"
    ? "Consolidated"
    : entities.find((e) => e.id === reportEntityId)?.name ?? "";

  return (
    <div className="max-w-3xl animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-display text-ink-white">Reports</h1>
        <p className="text-sm text-ink-muted mt-1">Income Statement · Balance Sheet</p>
      </div>

      {/* Report type tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("income")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
            tab === "income" ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue" : "bg-surface-2 border-surface-border text-ink-secondary hover:text-ink-primary"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Income Statement
        </button>
        <button
          onClick={() => setTab("balance")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
            tab === "balance" ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue" : "bg-surface-2 border-surface-border text-ink-secondary hover:text-ink-primary"
          }`}
        >
          <FileText className="w-4 h-4" />
          Balance Sheet
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Report Parameters</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="input-label">Entity</label>
            <select value={reportEntityId} onChange={(e) => setReportEntityId(e.target.value)} className="input">
              <option value="consolidated">Consolidated</option>
              {entities.map((en) => <option key={en.id} value={en.id}>{en.name}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input" />
          </div>
          <div>
            <label className="input-label">To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input" />
          </div>
          <div className="flex items-end">
            <button
              onClick={tab === "income" ? generateIncomeStatement : generateBalanceSheet}
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Generating…" : "Generate"}
            </button>
          </div>
        </div>
      </div>

      {/* Income Statement Result */}
      {tab === "income" && incomeStatement && (
        <div className="card overflow-hidden">
          <div className="card-header flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-ink-white">Income Statement</div>
              <div className="text-2xs text-ink-faint mt-0.5">
                {incomeStatement.entityName} · {incomeStatement.from} to {incomeStatement.to}
              </div>
            </div>
            <button onClick={exportReport} className="flex items-center gap-1.5 text-xs text-ink-secondary hover:text-ink-primary">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
          <div className="p-5 space-y-4">
            {/* Revenue */}
            <div>
              <div className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-2">Revenue</div>
              <div className="flex justify-between py-2 border-b border-surface-border">
                <span className="text-sm text-ink-white">Total Income</span>
                <span className="font-mono font-semibold text-accent-green">
                  {incomeStatement.income.currency === "BDT"
                    ? formatBDT(incomeStatement.income.total)
                    : formatUSD(incomeStatement.income.total)}
                </span>
              </div>
            </div>

            {/* Expenses */}
            <div>
              <div className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-2">Expenses</div>
              {incomeStatement.expenses.byCategory.map((cat) => (
                <div key={cat.category} className="flex justify-between py-1.5 text-sm">
                  <span className="text-ink-secondary">{cat.category || "Other"}</span>
                  <span className="font-mono text-accent-red">({formatUSD(cat.amount)})</span>
                </div>
              ))}
              <div className="flex justify-between py-2 border-t border-surface-border mt-1">
                <span className="text-sm text-ink-white font-medium">Total Expenses</span>
                <span className="font-mono font-semibold text-accent-red">({formatUSD(incomeStatement.expenses.total)})</span>
              </div>
            </div>

            {/* Profit */}
            <div className="border-t-2 border-surface-border-light pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-ink-secondary">Gross Profit</span>
                <span className={`font-mono font-semibold ${incomeStatement.grossProfit >= 0 ? "text-accent-green" : "text-accent-red"}`}>
                  {formatUSD(incomeStatement.grossProfit)}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span className="text-ink-white">Net Profit</span>
                <span className={`font-mono ${incomeStatement.netProfit >= 0 ? "text-accent-green" : "text-accent-red"}`}>
                  {formatUSD(incomeStatement.netProfit)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Balance Sheet Result */}
      {tab === "balance" && balanceSheet && (
        <div className="card overflow-hidden">
          <div className="card-header flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-ink-white">Balance Sheet</div>
              <div className="text-2xs text-ink-faint mt-0.5">
                {balanceSheet.entityName} · {balanceSheet.from ? `${balanceSheet.from} to ` : "As of "}{balanceSheet.to}
              </div>
            </div>
            <button onClick={exportReport} className="flex items-center gap-1.5 text-xs text-ink-secondary hover:text-ink-primary">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
          <div className="p-5 space-y-5">
            {/* Assets */}
            <div>
              <div className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-2">Assets</div>
              {balanceSheet.assets.map((asset) => (
                <div key={asset.label} className="flex justify-between py-1.5 text-sm">
                  <span className="text-ink-secondary">{asset.label}</span>
                  <span className="font-mono text-ink-white">
                    {asset.currency === "BDT" ? formatBDT(asset.amount) : formatUSD(asset.amount)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between py-2 border-t border-surface-border mt-1">
                <span className="text-sm font-semibold text-ink-white">Total Assets</span>
                <span className="font-mono font-semibold text-accent-blue">{formatUSD(balanceSheet.totalAssets)}</span>
              </div>
            </div>

            {/* Equity */}
            <div className="border-t-2 border-surface-border-light pt-3">
              <div className="flex justify-between text-base font-bold">
                <span className="text-ink-white">Total Equity</span>
                <span className={`font-mono ${balanceSheet.equity >= 0 ? "text-accent-green" : "text-accent-red"}`}>
                  {formatUSD(balanceSheet.equity)}
                </span>
              </div>
              <div className="text-2xs text-ink-faint mt-1">Equity = Total Income − Total Expenses (cumulative)</div>
            </div>
          </div>
        </div>
      )}

      {/* Placeholder when no report generated yet */}
      {((tab === "income" && !incomeStatement) || (tab === "balance" && !balanceSheet)) && !loading && (
        <div className="card p-10 text-center text-ink-faint">
          Set parameters above and click Generate to view the report.
        </div>
      )}
    </div>
  );
}
