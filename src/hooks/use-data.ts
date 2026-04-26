import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse, EntitySummary, PfAccountBalance } from "@/types";

// ── Fetcher ─────────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Entities ────────────────────────────────────────────────

export function useEntities() {
  return useQuery({
    queryKey: ["entities"],
    queryFn: () => apiFetch<ApiResponse>("/api/entities"),
  });
}

// ── Dashboard ───────────────────────────────────────────────

export function usePfBalances(entityId: string) {
  return useQuery({
    queryKey: ["pf-balances", entityId],
    queryFn: () => apiFetch<ApiResponse<PfAccountBalance[]>>(`/api/entities/${entityId}/pf-balances`),
    enabled: !!entityId,
  });
}

export function useEntitySummaries() {
  return useQuery({
    queryKey: ["entity-summaries"],
    queryFn: () => apiFetch<ApiResponse<EntitySummary[]>>("/api/entities/summaries"),
  });
}

// ── Transactions ────────────────────────────────────────────

export function useTransactions(entityId: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: ["transactions", entityId, page],
    queryFn: () => apiFetch<ApiResponse>(`/api/transactions?entityId=${entityId}&page=${page}&limit=${limit}`),
    enabled: !!entityId,
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<ApiResponse>("/api/transactions", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["pf-balances"] });
      qc.invalidateQueries({ queryKey: ["entity-summaries"] });
    },
  });
}

// ── Drawings ────────────────────────────────────────────────

export function useDrawings(entityId: string) {
  return useQuery({
    queryKey: ["drawings", entityId],
    queryFn: () => apiFetch<ApiResponse>(`/api/drawings?entityId=${entityId}`),
    enabled: !!entityId,
  });
}

export function useCreateDrawing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<ApiResponse>("/api/drawings", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drawings"] });
      qc.invalidateQueries({ queryKey: ["pf-balances"] });
    },
  });
}

// ── Petty Cash ──────────────────────────────────────────────

export function usePettyCash(entityId: string) {
  return useQuery({
    queryKey: ["petty-cash", entityId],
    queryFn: () => apiFetch<ApiResponse>(`/api/petty-cash?entityId=${entityId}`),
    enabled: !!entityId,
  });
}

export function useCreatePettyCashEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<ApiResponse>("/api/petty-cash", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["petty-cash"] });
      qc.invalidateQueries({ queryKey: ["pf-balances"] });
    },
  });
}

// ── Fund Transfers ──────────────────────────────────────────

export function useFundTransfers(entityId: string) {
  return useQuery({
    queryKey: ["fund-transfers", entityId],
    queryFn: () => apiFetch<ApiResponse>(`/api/fund-transfers?entityId=${entityId}`),
    enabled: !!entityId,
  });
}

// ── Upload ──────────────────────────────────────────────────

export function useUploadFile() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
  });
}
