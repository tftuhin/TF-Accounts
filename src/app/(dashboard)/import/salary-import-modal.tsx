"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Upload, X, Loader2 } from "lucide-react";

interface ParsedSalaryRow {
  employeeName: string;
  amount: number;
  adjustment?: number;
  adjustmentNote?: string;
  month?: string;
  notes?: string;
}

interface Entity {
  id: string;
  name: string;
}

interface SalaryImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entities: Entity[];
}

function detectDelimiter(lines: string[]): string {
  const delimiters = ["\t", ",", ";", "|"];
  const results = [];

  for (const delim of delimiters) {
    const counts: number[] = [];
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      counts.push(lines[i].split(delim).length);
    }
    const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;
    results.push({ delim, avgCount });
  }

  const tabResult = results.find(r => r.delim === "\t");
  if (tabResult && tabResult.avgCount >= 2 && tabResult.avgCount <= 6) {
    return "\t";
  }

  for (const result of results) {
    if (result.avgCount >= 2 && result.avgCount <= 6) {
      return result.delim;
    }
  }

  return ",";
}

function parseValue(value: string): string {
  return value.trim().replace(/^["'](.*)["']$/, "$1").trim();
}

function parseCSV(content: string): ParsedSalaryRow[] {
  const lines = content.trim().split("\n").filter((l) => l.trim());
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines);
  const headers = lines[0].split(delimiter).map(parseValue);

  const rows: ParsedSalaryRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(delimiter).map(parseValue);
    const row: any = {};

    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase();
      if (["employeename", "amount", "adjustment", "adjustmentnote", "month", "notes"].includes(normalizedHeader)) {
        row[normalizedHeader === "employeename" ? "employeeName" : normalizedHeader] = values[index] || "";
      }
    });

    if (!row.employeeName || !row.employeeName.trim()) {
      throw new Error(`Employee name missing at row ${i + 1}`);
    }

    const amountStr = row.amount.toString().trim().replace(/[^\d.,\-]/g, "").trim();
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount === 0) {
      throw new Error(`Invalid amount at row ${i + 1}: ${row.amount}`);
    }

    const adjustment = row.adjustment ? parseFloat(row.adjustment.toString()) : undefined;

    rows.push({
      employeeName: row.employeeName,
      amount: Math.abs(amount),
      adjustment: adjustment && !isNaN(adjustment) ? adjustment : undefined,
      adjustmentNote: row.adjustmentNote || undefined,
      month: row.month || undefined,
      notes: row.notes || undefined,
    });
  }

  return rows;
}

function parseJSON(content: string): ParsedSalaryRow[] {
  let data = JSON.parse(content);
  const entries = Array.isArray(data) ? data : data.entries || data.data || [];

  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("JSON must contain an array of salary entries");
  }

  const rows: ParsedSalaryRow[] = entries.map((entry, idx) => {
    const employeeName = entry.employeeName || entry.employee_name || entry.name;
    if (!employeeName) {
      throw new Error(`Employee name missing at row ${idx + 1}`);
    }

    const amountStr = (entry.amount || "").toString().trim();
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount === 0) {
      throw new Error(`Invalid amount at row ${idx + 1}: ${entry.amount}`);
    }

    const adjustment = entry.adjustment ? parseFloat(entry.adjustment.toString()) : undefined;

    return {
      employeeName: employeeName.toString().trim(),
      amount: Math.abs(amount),
      adjustment: adjustment && !isNaN(adjustment) ? adjustment : undefined,
      adjustmentNote: entry.adjustmentNote || entry.adjustment_note || undefined,
      month: entry.month || undefined,
      notes: entry.notes || undefined,
    };
  });

  return rows;
}

export function SalaryImportModal({ isOpen, onClose, entities }: SalaryImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedSalaryRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [payPeriod, setPayPeriod] = useState("");
  const [entityId, setEntityId] = useState(entities[0]?.id || "");

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv") && !selectedFile.name.endsWith(".json")) {
        toast.error("Please select a CSV or JSON file");
        return;
      }
      setFile(selectedFile);
      setParsedData([]);
    }
  }

  async function handleParse() {
    if (!file) {
      toast.error("No file selected");
      return;
    }

    setIsLoading(true);
    try {
      const content = await file.text();
      let rows: ParsedSalaryRow[];

      if (file.name.endsWith(".json")) {
        rows = parseJSON(content);
      } else {
        rows = parseCSV(content);
      }

      if (rows.length === 0) {
        toast.error("File is empty");
        return;
      }

      setParsedData(rows);
      toast.success(`Loaded ${rows.length} salary records`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to parse file";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit() {
    if (!date) {
      toast.error("Please select a payment date");
      return;
    }

    if (!entityId) {
      toast.error("Please select an entity");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (!file) throw new Error("File not found");
      formData.append("file", file);
      formData.append("date", date);
      formData.append("payPeriod", payPeriod);
      formData.append("entityId", entityId);

      const res = await fetch("/api/salaries/import", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Import failed");
      }

      toast.success(`Successfully imported ${json.data.created} salary records`);
      if (json.data.errors?.length) {
        toast.error(`${json.data.errors.length} records failed`);
      }
      setFile(null);
      setParsedData([]);
      setDate(new Date().toISOString().split("T")[0]);
      setPayPeriod("");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import failed";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-1 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-border">
          <div>
            <h2 className="text-xl font-semibold text-ink-white">Bulk Salary Import</h2>
            <p className="text-sm text-ink-faint mt-1">Upload CSV or JSON file with employee salaries</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 hover:bg-surface-2 rounded transition disabled:opacity-50"
          >
            <X className="w-5 h-5 text-ink-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {parsedData.length === 0 ? (
            // File upload section
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-surface-border rounded-lg p-8 text-center hover:border-accent-blue/30 transition cursor-pointer"
                onClick={() => document.getElementById("salary-upload")?.click()}
              >
                <Upload className="w-8 h-8 text-ink-faint mx-auto mb-3" />
                <div className="text-sm text-ink-secondary mb-1">
                  {file ? file.name : "Drop CSV or JSON file here"}
                </div>
                <div className="text-2xs text-ink-faint">
                  Required: Employee Name, Amount
                </div>
                <input
                  type="file"
                  accept=".csv,.json"
                  className="hidden"
                  id="salary-upload"
                  onChange={handleFileSelect}
                />
              </div>

              {file && (
                <button
                  onClick={handleParse}
                  disabled={isLoading}
                  className="btn-primary w-full"
                >
                  {isLoading ? "Parsing..." : "Parse File"}
                </button>
              )}

              {/* Format example */}
              <div className="card p-4 bg-surface-2">
                <div className="text-sm font-semibold text-ink-white mb-2">CSV Format Example:</div>
                <div className="text-2xs font-mono text-ink-secondary">
                  <div>Employee Name,Amount,Adjustment,Adjustment Note,Month,Notes</div>
                  <div>John Doe,50000,5000,Bonus,May 2026,May salary</div>
                  <div>Jane Smith,45000,0,,May 2026,May salary</div>
                </div>
              </div>
            </div>
          ) : (
            // Data table
            <div className="space-y-4">
              <div className="text-sm text-ink-secondary">
                {parsedData.length} salary records loaded
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border">
                      <th className="text-left px-3 py-2 text-ink-secondary font-medium">
                        Employee
                      </th>
                      <th className="text-right px-3 py-2 text-ink-secondary font-medium">
                        Amount
                      </th>
                      <th className="text-right px-3 py-2 text-ink-secondary font-medium">
                        Adjustment
                      </th>
                      <th className="text-left px-3 py-2 text-ink-secondary font-medium">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.map((row, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-surface-border/50 hover:bg-surface-2/30 transition"
                      >
                        <td className="px-3 py-2 text-ink-white">{row.employeeName}</td>
                        <td className="px-3 py-2 text-right font-mono text-accent-green">
                          {row.amount.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-ink-secondary">
                          {row.adjustment ? row.adjustment.toLocaleString() : "-"}
                        </td>
                        <td className="px-3 py-2 text-2xs text-ink-faint max-w-xs truncate">
                          {row.adjustmentNote || row.notes || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-surface-border p-6 space-y-3">
          {parsedData.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="input-label">Entity *</label>
                <select
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  className="input"
                >
                  <option value="">Select entity...</option>
                  {entities.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="input-label">Payment Date *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="input-label">Pay Period (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., 2026-05"
                  value={payPeriod}
                  onChange={(e) => setPayPeriod(e.target.value)}
                  className="input"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {parsedData.length > 0 && (
              <button
                onClick={() => {
                  setFile(null);
                  setParsedData([]);
                }}
                disabled={isSubmitting}
                className="px-4 py-2 rounded border border-surface-border text-ink-secondary hover:border-surface-border/50 transition disabled:opacity-50"
              >
                Back
              </button>
            )}
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded border border-surface-border text-ink-secondary hover:border-surface-border/50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            {parsedData.length > 0 && (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  `Import ${parsedData.length} Records`
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
