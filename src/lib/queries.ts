import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { supabaseServer } from "./supabase-server";

// All cache functions use unstable_cache (Next.js Data Cache — persists across requests,
// stale-while-revalidate: stale data is returned immediately while fresh fetch runs in
// the background so pages load instantly on repeat visits).
// Each function is tagged so the relevant API routes can call revalidateTag() on writes.

// ---------------------------------------------------------------------------
// Entities — sidebar, page dropdowns, entity selectors (60 s)
// ---------------------------------------------------------------------------
export const getActiveEntities = unstable_cache(
  () =>
    prisma.entity.findMany({
      orderBy: { type: "asc" },
      select: { id: true, slug: true, name: true, type: true, color: true, parentId: true },
    }),
  ["active-entities"],
  { revalidate: 60, tags: ["entities"] },
);

// ---------------------------------------------------------------------------
// Bank accounts — income, expenses, fund-transfers, settings (5 min)
// ---------------------------------------------------------------------------
export const getActiveBankAccounts = unstable_cache(
  () =>
    prisma.bankAccount.findMany({
      where: { isActive: true },
      orderBy: [{ entityId: "asc" }, { accountType: "asc" }],
      include: { entity: { select: { id: true, name: true, color: true } } },
    }),
  ["active-bank-accounts"],
  { revalidate: 300, tags: ["bank-accounts"] },
);

// ---------------------------------------------------------------------------
// Dashboard — last-12-month income/expense aggregation (30 s)
// Revalidated by any financial transaction write via tag "dashboard"
// ---------------------------------------------------------------------------
export const getDashboardRows = unstable_cache(
  async () => {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);
    return prisma.$queryRaw<{
      entity_id: string;
      pf_account: string;
      entry_type: string;
      month_key: string;
      total: number;
    }[]>`
      SELECT
        jel.entity_id,
        jel.pf_account,
        jel.entry_type,
        TO_CHAR(je.date, 'YYYY-MM') AS month_key,
        SUM(jel.amount)::float8       AS total
      FROM journal_entry_lines  jel
      JOIN journal_entries       je  ON je.id = jel.journal_entry_id
      WHERE je.status  = 'FINALIZED'
        AND je.date   >= ${startDate}
        AND jel.pf_account IN ('INCOME', 'OPEX')
      GROUP BY jel.entity_id, jel.pf_account, jel.entry_type,
               TO_CHAR(je.date, 'YYYY-MM')
    `;
  },
  ["dashboard-rows"],
  { revalidate: 30, tags: ["dashboard"] },
);

// ---------------------------------------------------------------------------
// Petty cash — current + previous period with all entries (30 s)
// Dates serialized to ISO strings and Decimals to numbers so the shape is
// stable whether the value came from a cache hit (JSON) or a fresh fetch.
// ---------------------------------------------------------------------------
export const getPettyCashPeriods = unstable_cache(
  async () => {
    const periods = await prisma.pettyCashPeriod.findMany({
      orderBy: { periodStart: "desc" },
      take: 2,
      include: {
        entity: { select: { name: true, slug: true } },
        entries: { orderBy: { date: "asc" } },
      },
    });
    return periods.map((p) => ({
      id: p.id,
      entityId: p.entityId,
      periodStart: p.periodStart.toISOString(),
      periodEnd: p.periodEnd.toISOString(),
      floatAmount: Number(p.floatAmount),
      currency: p.currency,
      isClosed: p.isClosed,
      entity: p.entity,
      entries: p.entries.map((e) => ({
        id: e.id,
        date: e.date.toISOString(),
        description: e.description,
        amount: Number(e.amount),
        txnType: e.txnType,
        receiptUrl: e.receiptUrl,
      })),
    }));
  },
  ["petty-cash-periods"],
  { revalidate: 30, tags: ["petty-cash"] },
);

// ---------------------------------------------------------------------------
// Drawings — recent drawing records (60 s)
// ---------------------------------------------------------------------------
export const getDrawingsList = unstable_cache(
  async () => {
    const drawings = await prisma.drawing.findMany({
      take: 50,
      orderBy: { date: "desc" },
      include: {
        entity: { select: { name: true, color: true } },
        ownershipRegistry: { select: { ownerName: true, ownershipPct: true } },
      },
    });
    return drawings.map((d) => ({
      id: d.id,
      entityId: d.entityId,
      date: d.date.toISOString(),
      entity: d.entity,
      ownershipRegistry: d.ownershipRegistry
        ? { ownerName: d.ownershipRegistry.ownerName, ownershipPct: Number(d.ownershipRegistry.ownershipPct) }
        : null,
      sourceAccount: d.sourceAccount,
      amount: Number(d.amount),
      currency: d.currency,
      status: d.status,
      accountBalanceAtDraw: d.accountBalanceAtDraw ? Number(d.accountBalanceAtDraw) : null,
      note: d.note,
    }));
  },
  ["drawings-list"],
  { revalidate: 60, tags: ["drawings"] },
);

// Active ownership partners — used in drawings form dropdown (5 min)
export const getActiveOwners = unstable_cache(
  async () => {
    const owners = await prisma.ownershipRegistry.findMany({
      where: { effectiveTo: null },
      include: { entity: { select: { name: true, id: true } } },
    });
    return owners.map((o) => ({
      id: o.id,
      entityId: o.entityId,
      ownerName: o.ownerName,
      ownershipPct: Number(o.ownershipPct),
      entity: o.entity,
    }));
  },
  ["active-owners"],
  { revalidate: 300, tags: ["ownership"] },
);

// PF-account balances — scans all PROFIT/OWNERS_COMP journal lines (60 s)
// This is the most expensive query on the drawings page; caching gives the biggest win.
export const getPfBalances = unstable_cache(
  async () => {
    const lines = await prisma.journalEntryLine.findMany({
      where: {
        pfAccount: { in: ["PROFIT", "OWNERS_COMP"] },
        journalEntry: { status: "FINALIZED" },
      },
      select: { pfAccount: true, entryType: true, amount: true, entityId: true },
    });
    return lines.map((l) => ({
      pfAccount: l.pfAccount,
      entryType: l.entryType,
      amount: Number(l.amount),
      entityId: l.entityId,
    }));
  },
  ["pf-balances"],
  { revalidate: 60, tags: ["pf-balances"] },
);

// ---------------------------------------------------------------------------
// Fund transfers — recent list (60 s)
// ---------------------------------------------------------------------------
export const getFundTransfersList = unstable_cache(
  async () => {
    const transfers = await prisma.fundTransfer.findMany({
      take: 20,
      orderBy: { date: "desc" },
      include: {
        fromAccount: { select: { accountName: true, accountType: true, currency: true } },
        toAccount: { select: { accountName: true, accountType: true, currency: true } },
        entity: { select: { name: true } },
      },
    });
    return transfers.map((t) => ({
      id: t.id,
      date: t.date.toISOString(),
      fromAccount: t.fromAccount,
      toAccount: t.toAccount,
      amountFrom: Number(t.amountFrom),
      currencyFrom: t.currencyFrom,
      amountTo: Number(t.amountTo),
      currencyTo: t.currencyTo,
      exchangeRate: t.exchangeRate ? Number(t.exchangeRate) : null,
      entityName: t.entity.name,
      reference: t.reference,
    }));
  },
  ["fund-transfers-list"],
  { revalidate: 60, tags: ["fund-transfers"] },
);

// ---------------------------------------------------------------------------
// Settings — all ownership records (single query replaces N+1 loop) (5 min)
// ---------------------------------------------------------------------------
export const getAllOwnership = unstable_cache(
  async () => {
    const rows = await prisma.ownershipRegistry.findMany({
      orderBy: [{ entityId: "asc" }, { effectiveFrom: "desc" }],
      select: {
        id: true,
        entityId: true,
        ownerName: true,
        ownershipPct: true,
        effectiveFrom: true,
        effectiveTo: true,
        notes: true,
      },
    });
    return rows.map((o) => ({
      id: o.id,
      entityId: o.entityId,
      ownerName: o.ownerName,
      ownershipPct: Number(o.ownershipPct),
      effectiveFrom: o.effectiveFrom.toISOString(),
      effectiveTo: o.effectiveTo ? o.effectiveTo.toISOString() : null,
      notes: o.notes,
    }));
  },
  ["all-ownership"],
  { revalidate: 300, tags: ["ownership"] },
);

// Settings — all user profiles from Supabase + pending invitations from Prisma
export const getTeamMembers = async () => {
  return getTeamMembersImpl();
};

const getTeamMembersImpl = unstable_cache(
  async () => {
    const [profiles, pendingInvitations] = await Promise.all([
      (async () => {
        if (!supabaseServer) return [];
        const { data } = await supabaseServer
          .from("profiles")
          .select("id, email, full_name, role, is_active")
          .order("created_at", { ascending: false });
        return (data ?? []).map((p) => ({
          id: p.id as string,
          email: p.email as string,
          fullName: p.full_name as string,
          role: p.role as string,
          isActive: p.is_active as boolean,
          isPending: false,
        }));
      })(),
      prisma.invitation.findMany({
        where: { acceptedAt: null },
        orderBy: { createdAt: "desc" },
      }).then((invites) =>
        invites.map((inv) => ({
          id: inv.id,
          email: inv.email,
          fullName: inv.email.split("@")[0],
          role: inv.role,
          isActive: true,
          isPending: true,
          invitedAt: inv.createdAt.toISOString(),
          expiresAt: inv.expiresAt.toISOString(),
        }))
      ),
    ]);

    return [...(profiles ?? []), ...(pendingInvitations ?? [])];
  },
  ["team-members"],
  { revalidate: false, tags: ["user-profiles"] },
);
