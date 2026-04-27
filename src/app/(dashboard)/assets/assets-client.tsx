"use client";

import { useState } from "react";
import { ChevronDown, Package, Plus, Trash2 } from "lucide-react";
import { calcDepreciation, generateDepreciationSchedule } from "@/lib/asset-depreciation";

interface Entity {
  id: string;
  name: string;
  color: string;
  slug: string;
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

  const filteredAssets = assets.filter((a) => {
    const isActive = a.status === "ACTIVE";
    const matchesEntity = selectedEntity === "all" || a.entityId === selectedEntity;
    return isActive && matchesEntity;
  });

  const summaryData = filteredAssets.reduce(
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

  const handleDisposeAsset = async (id: string) => {
    if (!confirm("Dispose this asset?")) return;

    const disposalDate = prompt("Disposal date (YYYY-MM-DD):");
    if (!disposalDate) return;

    try {
      const res = await fetch("/api/assets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, disposalDate: new Date(disposalDate).toISOString() }),
      });

      if (!res.ok) throw new Error("Failed to dispose asset");

      setAssets(assets.map((a) => (a.id === id ? { ...a, status: "DISPOSED", disposalDate } : a)));
    } catch (err) {
      console.error(err);
      alert("Error disposing asset");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-ink">Fixed Assets</h1>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Add Asset
          </button>
        )}
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

      {/* Assets Table */}
      <div className="card border border-border overflow-hidden">
        {filteredAssets.length === 0 ? (
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
                {filteredAssets.map((asset) => {
                  const depreciation = calcDepreciation(
                    asset.purchaseCost,
                    asset.salvageValue,
                    asset.usefulLifeYears,
                    new Date(asset.purchaseDate)
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
                            <div
                              className="h-full bg-blue-500"
                              style={{ width: `${Math.min(100, depreciation.percentUsed)}%` }}
                            />
                          </div>
                          <span className="text-xs text-ink-faint w-8 text-right">
                            {Math.min(100, Math.round(depreciation.percentUsed))}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setExpandedAssetId(isExpanded ? null : asset.id)}
                            className="p-1 hover:bg-border rounded transition"
                          >
                            <ChevronDown
                              className="w-4 h-4 text-ink-faint transition"
                              style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                            />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDisposeAsset(asset.id)}
                              className="p-1 hover:bg-red-100 rounded transition"
                            >
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
            asset={filteredAssets.find((a) => a.id === expandedAssetId)!}
            onClose={() => setExpandedAssetId(null)}
          />
        )}
      </div>
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
