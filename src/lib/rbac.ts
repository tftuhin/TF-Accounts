import type { UserRole } from "@/types";

export function canAccess(role: UserRole, resource: string): boolean {
  const ACCESS_MAP: Record<string, UserRole[]> = {
    dashboard:      ["ADMIN", "ACCOUNTS_MANAGER"],
    income:         ["ADMIN", "ACCOUNTS_MANAGER"],
    expenses:       ["ADMIN", "ACCOUNTS_MANAGER"],
    petty_cash:     ["ADMIN", "ACCOUNTS_MANAGER", "ENTRY_MANAGER"],
    journals:       ["ADMIN", "ACCOUNTS_MANAGER"],
    drawings:       ["ADMIN", "ACCOUNTS_MANAGER"],
    reports:        ["ADMIN", "ACCOUNTS_MANAGER"],
    reconciliation: ["ADMIN", "ACCOUNTS_MANAGER"],
    import:         ["ADMIN"],
    settings:       ["ADMIN"],
    fund_transfers: ["ADMIN", "ACCOUNTS_MANAGER"],
  };
  return ACCESS_MAP[resource]?.includes(role) ?? false;
}

export function canDelete(role: UserRole): boolean {
  return role === "ADMIN";
}

export function canEdit(role: UserRole): boolean {
  return role === "ADMIN" || role === "ACCOUNTS_MANAGER";
}
