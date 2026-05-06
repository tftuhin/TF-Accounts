"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Upload, X, Loader2 } from "lucide-react";

interface ParsedAssetRow {
  name: string;
  description?: string;
  category: string;
  purchaseDate: string;
  purchaseCost: number;
  currency?: string;
  usefulLifeYears: number;
  salvageValue?: number;
}

interface Entity {
  id: string;
  name: string;
}

interface AssetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entities: Entity[];
}

const ASSET_CATEGORIES = [
  "COMPUTER_ELECTRONICS",
  "FURNITURE_FIXTURES",
  "VEHICLES",
  "SOFTWARE_LICENSES",
  "OFFICE_EQUIPMENT",
  "LAND_BUILDING",
  "OTHER",
];

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

function parseCSV(content: string): ParsedAssetRow[] {
  const lines = content.trim().split("\n").filter((l) => l.trim());
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines);
  const headers = lines[0].split(delimiter).map(parseValue);

  const rows: ParsedAssetRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(delimiter).map(parseValue);
    const row: any = {};

    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase();
      row[normalizedHeader] = values[index] || "";
    });

    if (!row.name || !row.category || !row.purchasedate || !row.purchasecost || !row.usefullifeyears) {
      continue;
    }

    const cost = parseFloat(row.purchasecost.toString());
    if (isNaN(cost)) {
      continue;
    }

    const years = parseInt(row.usefullifeyears.toString());
    if (isNaN(years) || years <= 0) {
      continue;
    }

    const salvage = row.salvagevalue ? parseFloat(row.salvagevalue.toString()) : 0;
    if (isNaN(salvage)) {
      continue;
    }

    rows.push({
      name: row.name,
      description: row.description || undefined,
      category: row.category.toString().toUpperCase(),
      purchaseDate: row.purchasedate,
      purchaseCost: cost,
      currency: row.currency ? row.currency.toString().toUpperCase() : undefined,
      usefulLifeYears: years,
      salvageValue: salvage || undefined,
    });
  }

  return rows;
}

function parseJSON(content: string): ParsedAssetRow[] {
  let data = JSON.parse(content);
  const entries = Array.isArray(data) ? data : data.entries || data.data || [];

  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("JSON must contain an array of asset entries");
  }

  const rows: ParsedAssetRow[] = entries.map((entry) => {
    const name = entry.name || entry.Name;
    const category = entry.category || entry.Category;
    const purchaseDate = entry.purchaseDate || entry.PurchaseDate;
    const purchaseCost = entry.purchaseCost || entry.PurchaseCost;
    const usefulLifeYears = entry.usefulLifeYears || entry.UsefulLifeYears;
    const description = entry.description || entry.Description;
    const salvageValue = entry.salvageValue || entry.SalvageValue;
    const currency = entry.currency || entry.Currency;

    const cost = parseFloat(purchaseCost?.toString() || "0");
    const years = parseInt(usefulLifeYears?.toString() || "0");
    const salvage = salvageValue ? parseFloat(salvageValue.toString()) : 0;

    return {
      name,
      description,
      category: category?.toString().toUpperCase(),
      purchaseDate,
      purchaseCost: cost,
      currency: currency?.toString().toUpperCase(),
      usefulLifeYears: years,
      salvageValue: salvage || undefined,
    };
  });

  return rows.filter((row) => row.name && row.category && row.purchaseDate && row.purchaseCost > 0 && row.usefulLifeYears > 0);
}

export function AssetImportModal({ isOpen, onClose, entities }: AssetImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedAssetRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      let rows: ParsedAssetRow[];

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
      toast.success(`Loaded ${rows.length} asset records`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to parse file";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit() {
    if (!entityId) {
      toast.error("Please select an entity");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (!file) throw new Error("File not found");
      formData.append("file", file);
      formData.append("entityId", entityId);

      const res = await fetch("/api/import/assets", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Import failed");
      }

      toast.success(`Successfully imported ${json.data.created} assets`);
      if (json.data.errors?.length) {
        toast.error(`${json.data.errors.length} records failed`);
      }
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
      <div className="bg-surface-1 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-border">
          <div>
            <h2 className="text-xl font-semibold text-ink-white">Bulk Asset Purchase</h2>
            <p className="text-sm text-ink-faint mt-1">Upload CSV or JSON file with asset purchases</p>
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
                onClick={() => document.getElementById("asset-upload")?.click()}
              >
                <Upload className="w-8 h-8 text-ink-faint mx-auto mb-3" />
                <div className="text-sm text-ink-secondary mb-1">
                  {file ? file.name : "Drop CSV or JSON file here"}
                </div>
                <div className="text-2xs text-ink-faint">
                  Required: Name, Category, PurchaseDate, PurchaseCost, UsefulLifeYears
                </div>
                <input
                  type="file"
                  accept=".csv,.json"
                  className="hidden"
                  id="asset-upload"
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
              <div className="card p-4 bg-surface-2 space-y-3">
                <div className="text-sm font-semibold text-ink-white">CSV Format Example:</div>
                <div className="text-2xs font-mono text-ink-secondary space-y-1">
                  <div>Name,Category,PurchaseDate,PurchaseCost,UsefulLifeYears,Currency,SalvageValue,Description</div>
                  <div>Dell Laptop,COMPUTER_ELECTRONICS,2026-01-15,150000,5,BDT,10000,Work laptop</div>
                  <div>Office Desk,FURNITURE_FIXTURES,2026-02-20,50000,10,BDT,5000,</div>
                </div>
                <div className="text-2xs text-ink-faint mt-3 space-y-1">
                  <div><strong>Category:</strong> COMPUTER_ELECTRONICS, FURNITURE_FIXTURES, VEHICLES, SOFTWARE_LICENSES, OFFICE_EQUIPMENT, LAND_BUILDING, OTHER</div>
                  <div><strong>Currency:</strong> Optional (defaults to BDT)</div>
                  <div><strong>SalvageValue:</strong> Optional (defaults to 0)</div>
                  <div><strong>Description:</strong> Optional</div>
                </div>
              </div>
            </div>
          ) : (
            // Data table
            <div className="space-y-4">
              <div className="text-sm text-ink-secondary">
                {parsedData.length} asset records loaded
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border">
                      <th className="text-left px-3 py-2 text-ink-secondary font-medium">Name</th>
                      <th className="text-left px-3 py-2 text-ink-secondary font-medium">Category</th>
                      <th className="text-left px-3 py-2 text-ink-secondary font-medium">Date</th>
                      <th className="text-right px-3 py-2 text-ink-secondary font-medium">Cost</th>
                      <th className="text-center px-3 py-2 text-ink-secondary font-medium">Life (Years)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.map((row, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-surface-border/50 hover:bg-surface-2/30 transition"
                      >
                        <td className="px-3 py-2 text-ink-white truncate">{row.name}</td>
                        <td className="px-3 py-2 text-2xs text-ink-secondary">{row.category}</td>
                        <td className="px-3 py-2 font-mono text-2xs text-ink-secondary">{row.purchaseDate}</td>
                        <td className="px-3 py-2 text-right font-mono text-accent-green">
                          {row.purchaseCost.toLocaleString()} {row.currency || "BDT"}
                        </td>
                        <td className="px-3 py-2 text-center text-2xs text-ink-secondary">{row.usefulLifeYears}</td>
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
                  `Import ${parsedData.length} Assets`
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
