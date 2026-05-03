"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";

interface Entity {
  id: string;
  name: string;
}

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

export function ImportClient({
  entities,
  bankAccounts,
}: {
  entities: Entity[];
  bankAccounts: BankAccount[];
}) {
  const [file, setFile] = useState<File | null>(null);
  const [dataType, setDataType] = useState<"expense" | "income" | "withdraw">("expense");
  const [source, setSource] = useState<"bank" | "petty-cash">("bank");
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [defaultEntityId, setDefaultEntityId] = useState<string>(entities[0]?.id || "");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>("");
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
      setProgress(0);
      setStatus("");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.name.endsWith(".csv")) {
      setFile(droppedFile);
      setResult(null);
      setProgress(0);
      setStatus("");
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

    if ((dataType !== "expense" || source === "bank") && !bankAccountId) {
      toast.error("Please select a bank account");
      return;
    }

    if (!defaultEntityId) {
      toast.error("Please select a default entity");
      return;
    }

    setImporting(true);
    setProgress(10);
    setStatus("Parsing CSV file...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("dataType", dataType);
      formData.append("source", source);
      formData.append("defaultEntityId", defaultEntityId);
      if (bankAccountId) {
        formData.append("bankAccountId", bankAccountId);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 300000); // 5 minute timeout
      
      const res = await fetch("/api/import/expenses", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      setProgress(50);
      setStatus("Processing records...");

      let json;
      try {
        json = await res.json();
      } catch (parseErr) {
        const text = await res.text();
        throw new Error(`Invalid response: ${text.substring(0, 200)}`);
      }
      if (!res.ok) {
        throw new Error(json.error || json.message || "Import failed");
      }

      setProgress(90);
      setStatus("Finalizing import...");

      setResult(json.data);
      if (json.data.created) {
        toast.success(`Successfully imported ${json.data.created} records`);
        setFile(null);
      }
      if (json.data.errors?.length) {
        toast.error(
          `Import completed with ${json.data.errors.length} errors`
        );
      }
      setProgress(100);
      setStatus("Import complete!");
    } catch (err: unknown) {
      let msg = "Import failed";
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          msg = "Import request timed out (5 minutes)";
        } else {
          msg = err.message;
        }
      }
      toast.error(msg);
      setResult(null);
      setProgress(0);
      setStatus("");
    } finally {
      setImporting(false);
      setTimeout(() => {
        setProgress(0);
        setStatus("");
      }, 2000);
    }
  }

  return (
    <div className="max-w-3xl animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-display text-ink-white">Bulk CSV Import</h1>
        <p className="text-sm text-ink-muted mt-1">
          Import financial records from a CSV file
        </p>
      </div>

      <form onSubmit={handleImport} className="space-y-6">
        {/* Data Type Selection */}
        <div className="card p-6 space-y-4">
          <div className="text-sm font-semibold text-ink-white">
            Transaction Type *
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "income", label: "Income", color: "rgb(16, 185, 129)" },
              { value: "expense", label: "Expense", color: "rgb(239, 68, 68)" },
              { value: "withdraw", label: "Withdrawal", color: "rgb(245, 158, 11)" },
            ].map((type) => (
              <label
                key={type.value}
                className="flex items-center gap-3 p-3 rounded-lg border border-surface-border hover:border-accent-blue/30 cursor-pointer transition"
                style={{
                  borderColor:
                    dataType === type.value ? type.color : undefined,
                  backgroundColor:
                    dataType === type.value
                      ? `${type.color}15`
                      : undefined,
                }}
              >
                <input
                  type="radio"
                  name="dataType"
                  value={type.value}
                  checked={dataType === type.value as any}
                  onChange={(e) => {
                    const newType = e.target.value as "income" | "expense" | "withdraw";
                    setDataType(newType);
                    // For income/withdraw, always use bank source
                    if (newType !== "expense") {
                      setSource("bank");
                      setBankAccountId("");
                    }
                  }}
                />
                <div className="text-sm font-medium text-ink-white">
                  {type.label}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Default Entity Selection */}
        <div className="card p-6 space-y-4">
          <div className="text-sm font-semibold text-ink-white">
            Default Entity *
          </div>
          <p className="text-2xs text-ink-faint mb-3">
            Used when Entity column is missing or empty in your CSV
          </p>
          <select
            value={defaultEntityId}
            onChange={(e) => setDefaultEntityId(e.target.value)}
            className="input"
          >
            <option value="">Select default entity...</option>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        {/* Transaction Account Selection */}
        {dataType === "expense" ? (
          <div className="card p-6 space-y-4">
            <div className="text-sm font-semibold text-ink-white">
              Transaction Account
            </div>
            <div className="space-y-3">
              <label
                className="flex items-center gap-3 p-3 rounded-lg border border-surface-border hover:border-accent-blue/30 cursor-pointer transition"
                style={{
                  borderColor: source === "bank" ? "rgb(59, 130, 246)" : undefined,
                  backgroundColor:
                    source === "bank" ? "rgba(59, 130, 246, 0.05)" : undefined,
                }}
              >
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
                    BDT or USD bank accounts
                  </div>
                </div>
              </label>

              <label
                className="flex items-center gap-3 p-3 rounded-lg border border-surface-border hover:border-accent-blue/30 cursor-pointer transition"
                style={{
                  borderColor:
                    source === "petty-cash" ? "rgb(59, 130, 246)" : undefined,
                  backgroundColor:
                    source === "petty-cash"
                      ? "rgba(59, 130, 246, 0.05)"
                      : undefined,
                }}
              >
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
                    Petty cash float expenses
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
        ) : (
          <div className="card p-6 space-y-4">
            <div className="text-sm font-semibold text-ink-white">
              Transaction Account *
            </div>
            <select
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
              className="input"
            >
              <option value="">Choose a bank account...</option>
              {relevantBankAccounts.map((ba) => (
                <option key={ba.id} value={ba.id}>
                  {ba.entityName} - {ba.accountName} ({ba.currency})
                </option>
              ))}
            </select>
          </div>
        )}

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
            Required columns: Date, Description, Amount, Category | Optional: Entity
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
            CSV Format
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
                  <th className="text-left px-3 py-2 text-ink-faint text-opacity-60">
                    Entity (Optional)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-surface-border">
                  <td className="px-3 py-2 font-mono text-ink-secondary">
                    2025-05-01
                  </td>
                  <td className="px-3 py-2 text-ink-primary">
                    Office Supplies
                  </td>
                  <td className="px-3 py-2 font-mono text-accent-red">
                    250.00
                  </td>
                  <td className="px-3 py-2 text-ink-secondary">Supplies</td>
                  <td className="px-3 py-2 text-ink-faint text-opacity-60">
                    (uses default)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Progress Bar */}
        {importing && (
          <div className="card p-4 space-y-3 bg-surface-2 border border-accent-blue/20">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-ink-white">
                Importing...
              </div>
              <div className="text-2xs text-ink-faint">{progress}%</div>
            </div>
            <div className="w-full bg-surface-3 rounded-full h-2 overflow-hidden">
              <div
                className="bg-accent-blue h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-2xs text-ink-faint italic">{status}</div>
          </div>
        )}

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
                    ✓ Successfully imported {result.created} record
                    {result.created !== 1 ? "s" : ""}
                  </div>
                ) : null}
                {result.errors && result.errors.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-sm text-accent-amber font-medium">
                      {result.errors.length} error
                      {result.errors.length !== 1 ? "s" : ""}:
                    </div>
                    <ul className="text-2xs text-ink-secondary space-y-0.5 max-h-48 overflow-y-auto">
                      {result.errors.slice(0, 10).map((err, i) => (
                        <li key={i}>
                          Row {err.row}: {err.error}
                        </li>
                      ))}
                      {result.errors.length > 10 && (
                        <li>... and {result.errors.length - 10} more</li>
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
          disabled={
            !file ||
            importing ||
            (dataType !== "expense" || source === "bank") && !bankAccountId ||
            !defaultEntityId
          }
          className="btn-primary w-full"
        >
          {importing ? "Importing..." : "Import Records"}
        </button>
      </form>
    </div>
  );
}
