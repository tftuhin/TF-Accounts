"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";

interface BankAccount {
  id: string;
  accountName: string;
  accountType: string;
  currency: string;
  entityId: string;
  entityName: string;
}

interface ImportResult {
  success: boolean;
  created?: number;
  errors?: Array<{ row: number; error: string }>;
}

export function ImportClient({ bankAccounts }: { bankAccounts: BankAccount[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<"bank" | "petty-cash">("bank");
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const relevantBankAccounts = bankAccounts.filter(
    (ba) => ba.accountType !== "PETTY_CASH"
  );

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        toast.error("Please select a CSV file");
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.name.endsWith(".csv")) {
      setFile(droppedFile);
      setResult(null);
    } else {
      toast.error("Please drop a CSV file");
    }
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    if (source === "bank" && !bankAccountId) {
      toast.error("Please select a bank account");
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("source", source);
      if (bankAccountId) {
        formData.append("bankAccountId", bankAccountId);
      }

      const res = await fetch("/api/import/expenses", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Import failed");
      }

      setResult(json.data);
      if (json.data.created) {
        toast.success(`Successfully imported ${json.data.created} expenses`);
        setFile(null);
      }
      if (json.data.errors?.length) {
        toast.error(
          `Import completed with ${json.data.errors.length} errors`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import failed";
      toast.error(msg);
      setResult(null);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="max-w-3xl animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-display text-ink-white">Bulk CSV Import</h1>
        <p className="text-sm text-ink-muted mt-1">
          Import expenses from a CSV file
        </p>
      </div>

      <form onSubmit={handleImport} className="space-y-6">
        {/* Source Selection */}
        <div className="card p-6 space-y-4">
          <div className="text-sm font-semibold text-ink-white">
            Expense Source
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 rounded-lg border border-surface-border hover:border-accent-blue/30 cursor-pointer transition"
              style={{
                borderColor: source === "bank" ? "rgb(59, 130, 246)" : undefined,
                backgroundColor:
                  source === "bank" ? "rgba(59, 130, 246, 0.05)" : undefined,
              }}>
              <input
                type="radio"
                name="source"
                value="bank"
                checked={source === "bank"}
                onChange={(e) => {
                  setSource(e.target.value as "bank" | "petty-cash");
                  setBankAccountId("");
                }}
              />
              <div>
                <div className="text-sm font-medium text-ink-white">
                  Bank Account
                </div>
                <div className="text-2xs text-ink-faint">
                  Expenses from BDT or USD bank accounts
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg border border-surface-border hover:border-accent-blue/30 cursor-pointer transition"
              style={{
                borderColor:
                  source === "petty-cash" ? "rgb(59, 130, 246)" : undefined,
                backgroundColor:
                  source === "petty-cash"
                    ? "rgba(59, 130, 246, 0.05)"
                    : undefined,
              }}>
              <input
                type="radio"
                name="source"
                value="petty-cash"
                checked={source === "petty-cash"}
                onChange={(e) =>
                  setSource(e.target.value as "bank" | "petty-cash")
                }
              />
              <div>
                <div className="text-sm font-medium text-ink-white">
                  Petty Cash
                </div>
                <div className="text-2xs text-ink-faint">
                  Expenses from petty cash float
                </div>
              </div>
            </label>
          </div>

          {source === "bank" && (
            <div>
              <label className="input-label">Select Bank Account *</label>
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className="input"
              >
                <option value="">Choose an account...</option>
                {relevantBankAccounts.map((ba) => (
                  <option key={ba.id} value={ba.id}>
                    {ba.entityName} - {ba.accountName} ({ba.currency})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* File Upload */}
        <div
          className="card p-8 text-center border-2 border-dashed border-surface-border hover:border-accent-blue/30 transition cursor-pointer"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => document.getElementById("csv-upload")?.click()}
        >
          <Upload className="w-8 h-8 text-ink-faint mx-auto mb-3" />
          <div className="text-sm text-ink-secondary mb-1">
            {file ? file.name : "Drop CSV file here or click to browse"}
          </div>
          <div className="text-2xs text-ink-faint">
            Required columns: Date, Description, Amount, Category, Entity
          </div>
          <input
            type="file"
            accept=".csv"
            className="hidden"
            id="csv-upload"
            onChange={handleFileSelect}
          />
        </div>

        {/* Expected Format */}
        <div className="card p-5">
          <div className="text-sm font-semibold text-ink-white mb-3">
            Expected Format
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left px-3 py-2 text-ink-secondary">
                    Date
                  </th>
                  <th className="text-left px-3 py-2 text-ink-secondary">
                    Description
                  </th>
                  <th className="text-left px-3 py-2 text-ink-secondary">
                    Amount
                  </th>
                  <th className="text-left px-3 py-2 text-ink-secondary">
                    Category
                  </th>
                  <th className="text-left px-3 py-2 text-ink-secondary">
                    Entity
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-surface-border">
                  <td className="px-3 py-2 font-mono text-ink-secondary">
                    2025-04-01
                  </td>
                  <td className="px-3 py-2 text-ink-primary">
                    Office Supplies
                  </td>
                  <td className="px-3 py-2 font-mono text-accent-red">
                    -250.00
                  </td>
                  <td className="px-3 py-2 text-ink-secondary">Supplies</td>
                  <td className="px-3 py-2 text-ink-secondary">Themefisher</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Import Results */}
        {result && (
          <div
            className={`card p-4 border-l-4 ${
              result.errors && result.errors.length > 0
                ? "border-accent-amber bg-accent-amber/5"
                : "border-accent-green bg-accent-green/5"
            }`}
          >
            <div className="flex items-start gap-3">
              {result.errors && result.errors.length > 0 ? (
                <AlertCircle className="w-5 h-5 text-accent-amber flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-accent-green flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="text-sm font-medium text-ink-white mb-2">
                  Import Complete
                </div>
                {result.created ? (
                  <div className="text-sm text-ink-secondary mb-2">
                    ✓ Successfully imported {result.created} expense
                    {result.created !== 1 ? "s" : ""}
                  </div>
                ) : null}
                {result.errors && result.errors.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-sm text-accent-amber font-medium">
                      {result.errors.length} error
                      {result.errors.length !== 1 ? "s" : ""}:
                    </div>
                    <ul className="text-2xs text-ink-secondary space-y-0.5">
                      {result.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>
                          Row {err.row}: {err.error}
                        </li>
                      ))}
                      {result.errors.length > 5 && (
                        <li>... and {result.errors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!file || importing || (source === "bank" && !bankAccountId)}
          className="btn-primary w-full"
        >
          {importing ? "Importing..." : "Import Expenses"}
        </button>
      </form>
    </div>
  );
}
