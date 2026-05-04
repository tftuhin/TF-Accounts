"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Upload, X, ChevronDown, Loader2 } from "lucide-react";

interface Entity {
  id: string;
  name: string;
}

interface BankAccount {
  id: string;
  accountName: string;
  currency: string;
  entityId: string;
  entityName: string;
}

interface ParsedIncomeRow {
  date: string;
  description: string;
  amount: number;
  currency: string;
  entity: string;
  entityId: string;
  selectedBankAccountId?: string;
}

interface IncomeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entities: Entity[];
  bankAccounts: BankAccount[];
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
  if (tabResult && tabResult.avgCount >= 4 && tabResult.avgCount <= 6) {
    return "\t";
  }

  for (const result of results) {
    if (result.avgCount >= 4 && result.avgCount <= 6) {
      return result.delim;
    }
  }

  return ",";
}

function parseValue(value: string): string {
  return value.trim().replace(/^["'](.*)["']$/, "$1").trim();
}

function parseCSV(content: string, entityMap: Map<string, string>): ParsedIncomeRow[] {
  const lines = content.trim().split("\n").filter((l) => l.trim());
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines);
  const headers = lines[0].split(delimiter).map(parseValue);

  const requiredColumns = ["date", "description", "amount"];
  const headerLower = headers.map((h) => h.toLowerCase());
  const missingColumns = requiredColumns.filter((col) => !headerLower.includes(col));

  if (missingColumns.length > 0) {
    throw new Error(
      `Missing required columns: ${missingColumns.join(", ")}. Found: ${headers.join(", ")}`
    );
  }

  const rows: ParsedIncomeRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(delimiter).map(parseValue);
    const row: any = {};

    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase();
      if (["date", "description", "amount", "currency", "entity"].includes(normalizedHeader)) {
        row[normalizedHeader] = values[index] || "";
      }
    });

    const date = new Date(row.date);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date at row ${i + 1}: ${row.date}`);
    }

    let amountStr = row.amount.toString().trim();
    amountStr = amountStr.replace(/[^\d.,\-]/g, "").trim();

    if (amountStr.includes(",") && amountStr.includes(".")) {
      const lastCommaIndex = amountStr.lastIndexOf(",");
      const lastDotIndex = amountStr.lastIndexOf(".");
      if (lastDotIndex > lastCommaIndex) {
        amountStr = amountStr.replace(/,/g, "");
      } else {
        amountStr = amountStr.replace(/\./g, "").replace(",", ".");
      }
    } else if (amountStr.includes(",")) {
      const commaCount = (amountStr.match(/,/g) || []).length;
      if (commaCount === 1) {
        const afterComma = amountStr.split(",")[1];
        if (afterComma && afterComma.length <= 2) {
          amountStr = amountStr.replace(",", ".");
        } else {
          amountStr = amountStr.replace(/,/g, "");
        }
      } else {
        amountStr = amountStr.replace(/,/g, "");
      }
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount === 0) {
      throw new Error(`Invalid amount at row ${i + 1}: ${row.amount}`);
    }

    let entityId = "";
    let entityName = row.entity || "(Default)";

    if (row.entity && row.entity.trim()) {
      const found = entityMap.get(row.entity.trim().toLowerCase());
      if (found) {
        entityId = found;
      }
    }

    rows.push({
      date: row.date,
      description: row.description,
      amount: Math.abs(amount),
      currency: row.currency || "BDT",
      entity: entityName,
      entityId,
    });
  }

  return rows;
}

function parseJSON(content: string, entityMap: Map<string, string>): ParsedIncomeRow[] {
  let data = JSON.parse(content);
  const entries = Array.isArray(data) ? data : data.entries || data.data || [];

  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("JSON must contain an array of entries");
  }

  const rows: ParsedIncomeRow[] = entries.map((entry, idx) => {
    const date = new Date(entry.date || entry.Date);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date at row ${idx + 1}`);
    }

    let amountStr = (entry.amount || entry.Amount || "").toString().trim();
    amountStr = amountStr.replace(/[^\d.,\-]/g, "").trim();

    if (amountStr.includes(",") && amountStr.includes(".")) {
      const lastCommaIndex = amountStr.lastIndexOf(",");
      const lastDotIndex = amountStr.lastIndexOf(".");
      if (lastDotIndex > lastCommaIndex) {
        amountStr = amountStr.replace(/,/g, "");
      } else {
        amountStr = amountStr.replace(/\./g, "").replace(",", ".");
      }
    } else if (amountStr.includes(",")) {
      const commaCount = (amountStr.match(/,/g) || []).length;
      if (commaCount === 1) {
        const afterComma = amountStr.split(",")[1];
        if (afterComma && afterComma.length <= 2) {
          amountStr = amountStr.replace(",", ".");
        } else {
          amountStr = amountStr.replace(/,/g, "");
        }
      } else {
        amountStr = amountStr.replace(/,/g, "");
      }
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount === 0) {
      throw new Error(`Invalid amount at row ${idx + 1}`);
    }

    const entityNameRaw = entry.entity || entry.Entity || entry.sub_brand || "(Default)";
    let entityId = "";

    if (entityNameRaw !== "(Default)") {
      const found = entityMap.get(entityNameRaw.toString().toLowerCase());
      if (found) {
        entityId = found;
      }
    }

    return {
      date: entry.date || entry.Date,
      description: entry.description || entry.Description,
      amount: Math.abs(amount),
      currency: entry.currency || entry.Currency || "BDT",
      entity: entityNameRaw,
      entityId,
    };
  });

  return rows;
}

export function IncomeImportModal({
  isOpen,
  onClose,
  entities,
  bankAccounts,
}: IncomeImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedIncomeRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  const entityMap = new Map(entities.map((e) => [e.name.toLowerCase(), e.id]));

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
      let rows: ParsedIncomeRow[];

      if (file.name.endsWith(".json")) {
        rows = parseJSON(content, entityMap);
      } else {
        rows = parseCSV(content, entityMap);
      }

      if (rows.length === 0) {
        toast.error("File is empty");
        return;
      }

      setParsedData(rows);
      toast.success(`Loaded ${rows.length} records`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to parse file";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }

  function updateAccountSelection(rowIndex: number, bankAccountId: string) {
    const updated = [...parsedData];
    updated[rowIndex].selectedBankAccountId = bankAccountId;
    setParsedData(updated);
  }

  async function handleSubmit() {
    const unselected = parsedData.filter((r) => !r.selectedBankAccountId);
    if (unselected.length > 0) {
      toast.error(`Please select bank accounts for all ${unselected.length} transactions`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/import/income-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: parsedData }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Import failed");
      }

      toast.success(`Successfully imported ${json.data.created} records`);
      setFile(null);
      setParsedData([]);
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
      <div className="bg-surface-1 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-border">
          <div>
            <h2 className="text-xl font-semibold text-ink-white">Income Import</h2>
            <p className="text-sm text-ink-faint mt-1">
              Upload and manually select accounts for income transactions
            </p>
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
                onClick={() => document.getElementById("income-upload")?.click()}
              >
                <Upload className="w-8 h-8 text-ink-faint mx-auto mb-3" />
                <div className="text-sm text-ink-secondary mb-1">
                  {file ? file.name : "Drop CSV or JSON file here"}
                </div>
                <div className="text-2xs text-ink-faint">
                  Required: Date, Description, Amount | Optional: Currency, Entity
                </div>
                <input
                  type="file"
                  accept=".csv,.json"
                  className="hidden"
                  id="income-upload"
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
            </div>
          ) : (
            // Data table with account selectors
            <div className="space-y-4">
              <div className="text-sm text-ink-secondary">
                {parsedData.length} records loaded. Select debit account for each transaction.
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border">
                      <th className="text-left px-3 py-2 text-ink-secondary font-medium">
                        Date
                      </th>
                      <th className="text-left px-3 py-2 text-ink-secondary font-medium">
                        Description
                      </th>
                      <th className="text-right px-3 py-2 text-ink-secondary font-medium">
                        Amount
                      </th>
                      <th className="text-left px-3 py-2 text-ink-secondary font-medium">
                        Entity
                      </th>
                      <th className="text-left px-3 py-2 text-ink-secondary font-medium">
                        Debit Account
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.map((row, idx) => {
                      const availableBankAccounts = bankAccounts.filter(
                        (a) => !row.entityId || a.entityId === row.entityId
                      );

                      return (
                        <tr
                          key={idx}
                          className="border-b border-surface-border/50 hover:bg-surface-2/30 transition"
                        >
                          <td className="px-3 py-2 text-ink-primary font-mono text-xs">
                            {new Date(row.date).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 text-ink-secondary text-xs max-w-xs truncate">
                            {row.description}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-accent-green">
                            {row.amount.toLocaleString()} {row.currency}
                          </td>
                          <td className="px-3 py-2 text-ink-secondary text-xs">
                            {row.entity}
                          </td>
                          <td className="px-3 py-2">
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  const newSet = new Set(expandedAccounts);
                                  if (newSet.has(String(idx))) {
                                    newSet.delete(String(idx));
                                  } else {
                                    newSet.add(String(idx));
                                  }
                                  setExpandedAccounts(newSet);
                                }}
                                className={`w-full px-2 py-1.5 rounded border text-xs flex items-center justify-between transition ${
                                  row.selectedBankAccountId
                                    ? "border-accent-blue/30 bg-accent-blue/5 text-ink-white"
                                    : "border-surface-border text-ink-secondary hover:border-accent-blue/30"
                                }`}
                              >
                                <span className="truncate text-left flex-1">
                                  {row.selectedBankAccountId
                                    ? bankAccounts.find((a) => a.id === row.selectedBankAccountId)
                                        ?.accountName || "Select..."
                                    : "Select bank account..."}
                                </span>
                                <ChevronDown className="w-3 h-3 flex-shrink-0 ml-1" />
                              </button>

                              {expandedAccounts.has(String(idx)) && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-surface-2 border border-surface-border rounded shadow-lg z-10 max-h-64 overflow-y-auto">
                                  {availableBankAccounts.length === 0 ? (
                                    <div className="px-3 py-2 text-2xs text-ink-faint">
                                      No bank accounts available for this entity
                                    </div>
                                  ) : (
                                    availableBankAccounts.map((account) => (
                                      <button
                                        key={account.id}
                                        type="button"
                                        onClick={() => {
                                          updateAccountSelection(idx, account.id);
                                          const newSet = new Set(expandedAccounts);
                                          newSet.delete(String(idx));
                                          setExpandedAccounts(newSet);
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs text-ink-secondary hover:bg-surface-3 transition flex flex-col"
                                      >
                                        <div className="font-medium text-ink-white">
                                          {account.accountName}
                                        </div>
                                        <div className="text-2xs text-ink-faint">
                                          {account.entityName} • {account.currency}
                                        </div>
                                      </button>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-surface-border p-6 flex gap-3">
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
              disabled={isSubmitting || parsedData.some((r) => !r.selectedBankAccountId)}
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
  );
}
