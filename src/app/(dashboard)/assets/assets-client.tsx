"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Package, Plus, Trash2 } from "lucide-react";
import { calcDepreciation, generateDepreciationSchedule } from "@/lib/asset-depreciation";

interface Entity {
  id: string;
  name: string;
  color: string;
  slug: string;
}

interface BankAccount {
  id: string;
  accountName: string;
  accountType: string;
  currency: string;
}

interface Asset {
  id: string;
  entityId: string;
  entityName: string;
  entityColor: string;
  name: string;
  description?: string | null;
  category: string;
  purchaseDate: string;
  purchaseCost: number;
  currency: string;
  usefulLifeYears: number;
  salvageValue: number;
  status: string;
  disposalDate?: string | null;
  disposalValue?: number | null;
}

const categoryLabels: Record<string, string> = {
  COMPUTER_ELECTRONICS: "Computer & Electronics",
  FURNITURE_FIXTURES: "Furniture & Fixtures",
  VEHICLES: "Vehicles",
  SOFTWARE_LICENSES: "Software Licenses",
  OFFICE_EQUIPMENT: "Office Equipment",
  LAND_BUILDING: "Land & Building",
  OTHER: "Other",
};

interface AssetsClientProps {
  entities: Entity[];
  initialAssets: Asset[];
  isAdmin: boolean;
}

export function AssetsClient({ entities, initialAssets, isAdmin }: AssetsClientProps) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [selectedEntity, setSelectedEntity] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  useEffect(() => {
    // Fetch bank accounts for disposal selection
    const fetchAccounts = async () => {
      try {
        const entityId = selectedEntity === "all" ? entities[0]?.id : selectedEntity;
        if (!entityId) return;

        const res = await fetch(`/api/bank-accounts?entityId=${entityId}`);
        if (res.ok) {
          const data = await res.json();
          setBankAccounts(data.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch bank accounts:", err);
      }
    };

    fetchAccounts();
  }, [selectedEntity, entities]);

  const [formData, setFormData] = useState({
    entityId: "",
    name: "",
    description: "",
    category: "COMPUTER_ELECTRONICS",
    purchaseDate: "",
    purchaseCost: "",
    currency: "BDT",
    usefulLifeYears: "5",
    salvageValue: "0",
  });

  const [disposeForm, setDisposeForm] = useState({
    assetId: "",
    disposalDate: "",
    disposalValue: "",
    accountId: "",
    description: "",
  });
  const [showDisposeForm, setShowDisposeForm] = useState(false);
  const [showDisposed, setShowDisposed] = useState(false);
  const [accrualInProgress, setAccrualInProgress] = useState(false);
  const [accrualMessage, setAccrualMessage] = useState("");

  const filteredAssets = assets.filter((a) => {
    const matchesStatus = a.status === "ACTIVE" || (showDisposed && a.status === "DISPOSED");
    const matchesEntity = selectedEntity === "all" || a.entityId === selectedEntity;
    return matchesStatus && matchesEntity;
  });

  const activeAssets = filteredAssets.filter((a) => a.status === "ACTIVE");
  const disposedAssets = filteredAssets.filter((a) => a.status === "DISPOSED");

  const summaryData = activeAssets.reduce(
    (acc, asset) => {
      const depreciation = calcDepreciation(
        asset.purchaseCost,
        asset.salvageValue,
        asset.usefulLifeYears,
        new Date(asset.purchaseDate)
      );
      return {
        totalCost: acc.totalCost + asset.purchaseCost,
        totalBookValue: acc.totalBookValue + depreciation.bookValue,
        monthlyDep: acc.monthlyDep + depreciation.monthlyDep,
      };
    },
    { totalCost: 0, totalBookValue: 0, monthlyDep: 0 }
  );

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.entityId) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          purchaseCost: parseFloat(formData.purchaseCost),
          salvageValue: parseFloat(formData.salvageValue),
          usefulLifeYears: parseInt(formData.usefulLifeYears),
          purchaseDate: new Date(formData.purchaseDate).toISOString(),
        }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        const errorMsg = responseData.error?.message || responseData.error || "Failed to create asset";
        throw new Error(errorMsg);
      }

      const { data: newAsset } = responseData;

      const entity = entities.find((e) => e.id === formData.entityId);
      setAssets([
        {
          ...newAsset,
          entityName: entity?.name || "",
          entityColor: entity?.color || "#3B82F6",
          description: formData.description || null,
          status: "ACTIVE",
          disposalDate: null,
          disposalValue: null,
        },
        ...assets,
      ]);

      setFormData({
        entityId: "",
        name: "",
        description: "",
        category: "COMPUTER_ELECTRONICS",
        purchaseDate: "",
        purchaseCost: "",
        currency: "BDT",
        usefulLifeYears: "5",
        salvageValue: "0",
      });
      setShowForm(false);
      alert("Asset created successfully!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error creating asset";
      console.error("Asset creation error:", errorMessage);
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisposeAsset = (id: string) => {
    const asset = assets.find((a) => a.id === id);
    if (!asset) return;

    const today = new Date().toISOString().split("T")[0];
    const dep = calcDepreciation(
      asset.purchaseCost, asset.salvageValue, asset.usefulLifeYears,
      new Date(asset.purchaseDate),
    );
    setDisposeForm({
      assetId: id,
      disposalDate: today,
      disposalValue: dep.bookValue.toFixed(0),
      accountId: bankAccounts[0]?.id || "",
      description: "",
    });
    setShowDisposeForm(true);
  };

  const handleSubmitDispose = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!disposeForm.disposalDate || !disposeForm.disposalValue || !disposeForm.accountId) {
      alert("Please fill all required fields");
      return;
    }

    const disposalValue = parseFloat(disposeForm.disposalValue);
    if (isNaN(disposalValue) || disposalValue < 0) {
      alert("Invalid disposal value");
      return;
    }

    const asset = assets.find((a) => a.id === disposeForm.assetId);
    if (!asset) return;

    const gain = disposalValue - asset.purchaseCost;
    const selectedAccount = bankAccounts.find((a) => a.id === disposeForm.accountId);

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/assets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: disposeForm.assetId,
          disposalDate: new Date(disposeForm.disposalDate).toISOString(),
          disposalValue,
          cashAccountId: disposeForm.accountId,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to dispose asset");
      }

      const result = await res.json();
      setAssets(assets.map((a) =>
        a.id === disposeForm.assetId
          ? { ...a, status: "DISPOSED", disposalDate: disposeForm.disposalDate, disposalValue }
          : a
      ));

      const { gain: apiGain } = result.data;
      alert(
        `Asset disposed successfully!\n\nAccount: ${selectedAccount?.accountName}\nProceeds: ৳${disposalValue.toFixed(0)}\n${apiGain >= 0 ? "Gain" : "Loss"} on disposal: ৳${Math.abs(apiGain).toFixed(0)}`
      );

      setShowDisposeForm(false);
      setDisposeForm({ assetId: "", disposalDate: "", disposalValue: "", accountId: "", description: "" });
    } catch (err) {
      console.error(err);
      alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccrueDepreciation = async () => {
    setAccrualInProgress(true);
    setAccrualMessage("");
    try {
      const entityId = selectedEntity === "all" ? undefined : selectedEntity;
      const res = await fetch("/api/assets/accrue-depreciation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to accrue depreciation");
      }

      const result = await res.json();
      if (result.success) {
        setAccrualMessage(
          `✓ ${result.message} (${result.entriesCreated} journal entries created)`
        );
      } else {
        setAccrualMessage(`✗ ${result.error}`);
      }
      setTimeout(() => setAccrualMessage(""), 5000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setAccrualMessage(`✗ Error: ${errorMsg}`);
      setTimeout(() => setAccrualMessage(""), 5000);
    } finally {
      setAccrualInProgress(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink">Fixed Assets</h1>
            {!isAdmin && <p className="text-xs text-ink-faint mt-1">Admin access required to create assets</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {accrualMessage && (
            <div className={`text-sm px-3 py-2 rounded-lg ${accrualMessage.startsWith("✓") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {accrualMessage}
            </div>
          )}
          <button
            onClick={handleAccrueDepreciation}
            disabled={!isAdmin || accrualInProgress}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              isAdmin
                ? "bg-amber-600 text-white hover:bg-amber-700 cursor-pointer disabled:opacity-50"
                : "bg-border text-ink-faint cursor-not-allowed opacity-50"
            }`}
          >
            {accrualInProgress ? "Accruing..." : "Accrue Depreciation"}
          </button>
          <button
            onClick={() => setShowDisposed((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-border bg-surface-2 text-ink-secondary hover:text-ink-primary hover:bg-surface-3 transition text-sm"
          >
            {showDisposed ? "Hide Disposed" : `Show Disposed${assets.filter(a => a.status === "DISPOSED").length ? ` (${assets.filter(a => a.status === "DISPOSED").length})` : ""}`}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            disabled={!isAdmin}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              isAdmin
                ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                : "bg-border text-ink-faint cursor-not-allowed opacity-50"
            }`}
          >
            <Plus className="w-4 h-4" />
            Add Asset
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 border border-border">
          <p className="text-xs text-ink-faint uppercase tracking-wide mb-1">Total Cost</p>
          <p className="text-2xl font-bold text-ink">
            {summaryData.totalCost.toLocaleString("en-BD", {
              style: "currency",
              currency: "BDT",
              minimumFractionDigits: 0,
            })}
          </p>
        </div>
        <div className="card p-4 border border-border">
          <p className="text-xs text-ink-faint uppercase tracking-wide mb-1">Total Book Value</p>
          <p className="text-2xl font-bold text-ink">
            {summaryData.totalBookValue.toLocaleString("en-BD", {
              style: "currency",
              currency: "BDT",
              minimumFractionDigits: 0,
            })}
          </p>
        </div>
        <div className="card p-4 border border-border">
          <p className="text-xs text-ink-faint uppercase tracking-wide mb-1">Monthly Depreciation</p>
          <p className="text-2xl font-bold text-ink">
            {summaryData.monthlyDep.toLocaleString("en-BD", {
              style: "currency",
              currency: "BDT",
              minimumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      {/* Add Asset Form */}
      {showForm && (
        <div className="card p-6 border border-border bg-bg">
          <h3 className="text-lg font-semibold text-ink mb-4">Create New Asset</h3>
          <form onSubmit={handleCreateAsset} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-ink">Entity *</label>
                <select
                  value={formData.entityId}
                  onChange={(e) => setFormData({ ...formData, entityId: e.target.value })}
                  className="w-full px-3 py-2 mt-1 border border-border rounded-lg text-ink bg-bg focus:outline-none"
                  required
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
                <label className="text-sm font-medium text-ink">Asset Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 mt-1 border border-border rounded-lg text-ink bg-bg focus:outline-none"
                  placeholder="e.g. Laptop"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="text-sm font-medium text-ink">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 mt-1 border border-border rounded-lg text-ink bg-bg focus:outline-none"
                  placeholder="Optional details"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-ink">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 mt-1 border border-border rounded-lg text-ink bg-bg focus:outline-none"
                  required
                >
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-ink">Purchase Date *</label>
                <input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  className="w-full px-3 py-2 mt-1 border border-border rounded-lg text-ink bg-bg focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-ink">Purchase Cost *</label>
                <input
                  type="number"
                  value={formData.purchaseCost}
                  onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
                  className="w-full px-3 py-2 mt-1 border border-border rounded-lg text-ink bg-bg focus:outline-none"
                  placeholder="0"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-ink">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-3 py-2 mt-1 border border-border rounded-lg text-ink bg-bg focus:outline-none"
                >
                  <option value="BDT">BDT</option>
                  <option value="USD">USD</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-ink">Useful Life (Years) *</label>
                <input
                  type="number"
                  value={formData.usefulLifeYears}
                  onChange={(e) => setFormData({ ...formData, usefulLifeYears: e.target.value })}
                  className="w-full px-3 py-2 mt-1 border border-border rounded-lg text-ink bg-bg focus:outline-none"
                  min="1"
                  max="50"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-ink">Salvage Value</label>
                <input
                  type="number"
                  value={formData.salvageValue}
                  onChange={(e) => setFormData({ ...formData, salvageValue: e.target.value })}
                  className="w-full px-3 py-2 mt-1 border border-border rounded-lg text-ink bg-bg focus:outline-none"
                  placeholder="0"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-border rounded-lg text-ink hover:bg-bg-alt transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isSubmitting ? "Creating..." : "Create Asset"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Entity Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedEntity("all")}
          className={`px-4 py-2 rounded-lg transition ${
            selectedEntity === "all" ? "bg-blue-600 text-white" : "bg-bg-alt text-ink hover:bg-border"
          }`}
        >
          All Entities
        </button>
        {entities.map((entity) => (
          <button
            key={entity.id}
            onClick={() => setSelectedEntity(entity.id)}
            className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
              selectedEntity === entity.id ? "bg-blue-600 text-white" : "bg-bg-alt text-ink hover:bg-border"
            }`}
          >
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entity.color }} />
            {entity.name}
          </button>
        ))}
      </div>

      {/* Active Assets Table */}
      <div className="card border border-border overflow-hidden">
        {activeAssets.length === 0 ? (
          <div className="p-10 text-center text-ink-faint">
            {selectedEntity === "all" ? "No active assets" : "No active assets for this entity"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-bg-alt">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ink-faint uppercase">Asset</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ink-faint uppercase">Entity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ink-faint uppercase">Purchase Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-ink-faint uppercase">Purchase Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ink-faint uppercase">Life</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-ink-faint uppercase">Book Value</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-ink-faint uppercase">Progress</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-ink-faint uppercase"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activeAssets.map((asset) => {
                  const depreciation = calcDepreciation(
                    asset.purchaseCost, asset.salvageValue,
                    asset.usefulLifeYears, new Date(asset.purchaseDate)
                  );
                  const isExpanded = expandedAssetId === asset.id;

                  return (
                    <tr key={asset.id} className="hover:bg-bg-alt transition">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-ink">{asset.name}</p>
                          <p className="text-xs text-ink-faint">{categoryLabels[asset.category]}</p>
                          {asset.description && <p className="text-xs text-ink-faint mt-1">{asset.description}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: asset.entityColor }} />
                          <span className="text-sm text-ink">{asset.entityName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-ink">{asset.purchaseDate}</td>
                      <td className="px-4 py-3 text-right text-sm text-ink font-medium">
                        {asset.purchaseCost.toLocaleString("en-BD", { minimumFractionDigits: 0 })} {asset.currency}
                      </td>
                      <td className="px-4 py-3 text-sm text-ink">{asset.usefulLifeYears} years</td>
                      <td className="px-4 py-3 text-right text-sm text-ink font-medium">
                        {depreciation.bookValue.toLocaleString("en-BD", { minimumFractionDigits: 0 })} {asset.currency}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-border rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, depreciation.percentUsed)}%` }} />
                          </div>
                          <span className="text-xs text-ink-faint w-8 text-right">
                            {Math.min(100, Math.round(depreciation.percentUsed))}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setExpandedAssetId(isExpanded ? null : asset.id)} className="p-1 hover:bg-border rounded transition">
                            <ChevronDown className="w-4 h-4 text-ink-faint transition" style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }} />
                          </button>
                          {isAdmin && (
                            <button onClick={() => handleDisposeAsset(asset.id)} className="p-1 hover:bg-red-100 rounded transition">
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Expanded Depreciation Schedule */}
        {expandedAssetId && (
          <DepreciationScheduleRow
            asset={activeAssets.find((a) => a.id === expandedAssetId)!}
            onClose={() => setExpandedAssetId(null)}
          />
        )}
      </div>

      {/* Disposed Assets Log */}
      {showDisposed && disposedAssets.length > 0 && (
        <div className="card border border-surface-border overflow-hidden">
          <div className="px-4 py-3 bg-surface-2 border-b border-surface-border flex items-center gap-2">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Disposed Assets</span>
            <span className="badge bg-accent-red/10 text-accent-red">{disposedAssets.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-border bg-surface-2">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ink-faint uppercase">Asset</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ink-faint uppercase">Entity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ink-faint uppercase">Purchase Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-ink-faint uppercase">Purchase Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ink-faint uppercase">Disposal Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-ink-faint uppercase">Disposal Value</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-ink-faint uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {disposedAssets.map((asset) => (
                  <tr key={asset.id} className="opacity-60">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-ink-secondary line-through">{asset.name}</p>
                        <p className="text-xs text-ink-faint">{categoryLabels[asset.category]}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: asset.entityColor }} />
                        <span className="text-sm text-ink-secondary">{asset.entityName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-secondary">{asset.purchaseDate}</td>
                    <td className="px-4 py-3 text-right text-sm text-ink-secondary font-mono">
                      ৳{asset.purchaseCost.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-secondary">{asset.disposalDate ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-sm font-mono text-ink-secondary">
                      {asset.disposalValue != null ? `৳${asset.disposalValue.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="badge bg-accent-red/10 text-accent-red">Disposed</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dispose Asset Form Modal */}
      {showDisposeForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-ink mb-4">Dispose Asset</h2>

            <form onSubmit={handleSubmitDispose} className="space-y-4">
              {/* Disposal Date */}
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Disposal Date *</label>
                <input
                  type="date"
                  value={disposeForm.disposalDate}
                  onChange={(e) =>
                    setDisposeForm({ ...disposeForm, disposalDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* Disposal Value */}
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Disposal Value *</label>
                <input
                  type="number"
                  step="0.01"
                  value={disposeForm.disposalValue}
                  onChange={(e) =>
                    setDisposeForm({ ...disposeForm, disposalValue: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Account Selection */}
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Where will proceeds go? *</label>
                <select
                  value={disposeForm.accountId}
                  onChange={(e) =>
                    setDisposeForm({ ...disposeForm, accountId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">Select Account...</option>
                  {bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName} ({acc.accountType === "PETTY_CASH" ? "Petty Cash" : "Bank"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Description</label>
                <textarea
                  value={disposeForm.description}
                  onChange={(e) =>
                    setDisposeForm({ ...disposeForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                  rows={3}
                  placeholder="e.g., Sold to buyer, condition good..."
                />
              </div>

              {/* Gain/Loss Preview */}
              {disposeForm.disposalValue && (() => {
                const a = assets.find((x) => x.id === disposeForm.assetId);
                if (!a) return null;
                const dep = calcDepreciation(
                  a.purchaseCost, a.salvageValue, a.usefulLifeYears,
                  new Date(a.purchaseDate),
                  new Date(disposeForm.disposalDate || new Date()),
                );
                const proceeds = parseFloat(disposeForm.disposalValue) || 0;
                const gl = proceeds - dep.bookValue;
                return (
                  <div className="p-3 bg-surface-2 rounded-lg border border-surface-border space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-muted">Purchase cost</span>
                      <span className="font-mono text-ink-primary">৳{a.purchaseCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-muted">Accumulated depreciation</span>
                      <span className="font-mono text-accent-amber">−৳{dep.accumulated.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-surface-border pt-1">
                      <span className="text-ink-secondary font-medium">Book value</span>
                      <span className="font-mono font-semibold text-ink-primary">৳{dep.bookValue.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-muted">Disposal proceeds</span>
                      <span className="font-mono text-ink-primary">৳{proceeds.toFixed(0)}</span>
                    </div>
                    <div className={`flex justify-between text-sm font-bold border-t border-surface-border pt-1 ${gl >= 0 ? "text-accent-green" : "text-accent-red"}`}>
                      <span>{gl >= 0 ? "Gain on disposal" : "Loss on disposal"}</span>
                      <span className="font-mono">৳{Math.abs(gl).toFixed(0)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowDisposeForm(false);
                    setDisposeForm({
                      assetId: "",
                      disposalDate: "",
                      disposalValue: "",
                      accountId: "",
                      description: "",
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-ink hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                >
                  {isSubmitting ? "Disposing..." : "Dispose"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DepreciationScheduleRow({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const schedule = generateDepreciationSchedule(asset.purchaseCost, asset.salvageValue, asset.usefulLifeYears, new Date(asset.purchaseDate));

  return (
    <div className="bg-bg-alt border-t border-border p-6">
      <div className="mb-4">
        <h4 className="font-semibold text-ink mb-4">Depreciation Schedule: {asset.name}</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-xs font-semibold text-ink-faint">Year</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-ink-faint">Annual Depreciation</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-ink-faint">Accumulated</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-ink-faint">Book Value</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-ink-faint">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {schedule.map((row) => (
                <tr key={row.year} className="hover:bg-white/50 transition">
                  <td className="px-3 py-2 text-ink font-medium">Year {row.year}</td>
                  <td className="px-3 py-2 text-right text-ink">
                    {row.annualDep.toLocaleString("en-BD", { minimumFractionDigits: 2 })} {asset.currency}
                  </td>
                  <td className="px-3 py-2 text-right text-ink">
                    {row.accumulated.toLocaleString("en-BD", { minimumFractionDigits: 2 })} {asset.currency}
                  </td>
                  <td className="px-3 py-2 text-right text-ink font-medium">
                    {row.bookValue.toLocaleString("en-BD", { minimumFractionDigits: 2 })} {asset.currency}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-20 h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-400"
                          style={{ width: `${(row.accumulated / (asset.purchaseCost - asset.salvageValue)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
