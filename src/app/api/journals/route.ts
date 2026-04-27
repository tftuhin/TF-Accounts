import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseServer } from "@/lib/supabase-server";

let editTableReady = false;
async function ensureEditTable() {
  if (editTableReady) return;
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS journal_entry_edits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
        edited_by_email TEXT NOT NULL,
        edited_by_role TEXT NOT NULL,
        edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        changes JSONB NOT NULL
      )`;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_jee_entry ON journal_entry_edits(journal_entry_id)`;
    editTableReady = true;
  } catch {
    // table may already exist or connection issue — continue
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === "ENTRY_MANAGER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);

  // Single entry detail view
  const entryId = searchParams.get("entryId");
  if (entryId) {
    await ensureEditTable();
    const entry = await prisma.journalEntry.findUnique({
      where: { id: entryId },
      include: {
        entity: { select: { name: true, color: true } },
        lines: {
          select: { pfAccount: true, entryType: true, amount: true, currency: true, usdAmount: true },
        },
      },
    });
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const incomeLines = entry.lines.filter((l) => l.pfAccount === "INCOME");
    const opexLines = entry.lines.filter((l) => l.pfAccount === "OPEX");
    const type = incomeLines.length > 0 ? "Income" : opexLines.length > 0 ? "Expense" : "Transfer";
    const primaryLine = incomeLines[0] || opexLines[0] || entry.lines[0];

    // Fetch edit history + creator email in parallel
    const [editRows, creatorProfile] = await Promise.all([
      prisma.$queryRaw<{ edited_by_email: string; edited_by_role: string; edited_at: Date; changes: unknown }[]>`
        SELECT edited_by_email, edited_by_role, edited_at, changes
        FROM journal_entry_edits
        WHERE journal_entry_id = ${entryId}::uuid
        ORDER BY edited_at DESC`.catch(() => [] as { edited_by_email: string; edited_by_role: string; edited_at: Date; changes: unknown }[]),
      supabaseServer
        ? supabaseServer.from("profiles").select("email").eq("id", entry.createdById).single().then(({ data }) => data)
        : null,
    ]);

    return NextResponse.json({
      success: true,
      data: {
        id: entry.id,
        date: entry.date.toISOString().split("T")[0],
        description: entry.description,
        category: entry.category,
        entityName: entry.entity.name,
        entityColor: entry.entity.color,
        type,
        amount: primaryLine ? Number(primaryLine.amount) : 0,
        usdAmount: primaryLine?.usdAmount ? Number(primaryLine.usdAmount) : null,
        currency: primaryLine?.currency ?? "BDT",
        status: entry.status,
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
        createdByEmail: creatorProfile?.email ?? null,
        editLog: editRows.map((r) => ({
          editedByEmail: r.edited_by_email,
          editedByRole: r.edited_by_role,
          editedAt: r.edited_at.toISOString(),
          changes: r.changes,
        })),
      },
    });
  }

  // List view
  const entityId = searchParams.get("entityId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = 50;

  const where: Record<string, unknown> = {
    ...(entityId && entityId !== "consolidated" ? { entityId } : {}),
    ...(from ? { date: { gte: new Date(from) } } : {}),
    ...(to ? { date: { ...(from ? { gte: new Date(from) } : {}), lte: new Date(to) } } : {}),
  };

  const [total, entries] = await Promise.all([
    prisma.journalEntry.count({ where }),
    prisma.journalEntry.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        entity: { select: { name: true, color: true } },
        lines: {
          take: 2,
          select: { pfAccount: true, entryType: true, amount: true, currency: true },
        },
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: entries.map((e) => {
      const incomeLines = e.lines.filter((l) => l.pfAccount === "INCOME");
      const opexLines = e.lines.filter((l) => l.pfAccount === "OPEX");
      const type = incomeLines.length > 0 ? "Income" : opexLines.length > 0 ? "Expense" : "Transfer";
      const primaryLine = incomeLines[0] || opexLines[0] || e.lines[0];
      return {
        id: e.id,
        date: e.date.toISOString().split("T")[0],
        description: e.description,
        category: e.category,
        entityName: e.entity.name,
        entityColor: e.entity.color,
        type,
        amount: primaryLine ? Number(primaryLine.amount) : 0,
        currency: primaryLine?.currency ?? "BDT",
        status: e.status,
      };
    }),
    pagination: { total, page, pages: Math.ceil(total / limit), limit },
  });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.journalEntry.delete({ where: { id } });
  revalidateTag("dashboard");
  revalidateTag("pf-balances");
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === "ENTRY_MANAGER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    await ensureEditTable();

    const { id, description, category, date, amount } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    // Read old values to compute change log
    const old = await prisma.journalEntry.findUnique({
      where: { id },
      include: { lines: { select: { amount: true }, take: 1 } },
    });
    if (!old) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    if (description != null && description !== old.description)
      changes.description = { from: old.description, to: description };
    if (date != null && date !== old.date.toISOString().split("T")[0])
      changes.date = { from: old.date.toISOString().split("T")[0], to: date };
    if (category != null && category !== (old.category ?? ""))
      changes.category = { from: old.category ?? "", to: category };
    if (amount != null && amount > 0) {
      const oldAmt = old.lines[0] ? Number(old.lines[0].amount) : 0;
      if (Math.abs(amount - oldAmt) > 0.001)
        changes.amount = { from: oldAmt, to: amount };
    }

    const updateData: Record<string, unknown> = {};
    if (description) updateData.description = description;
    if (category) updateData.category = category;
    if (date) updateData.date = new Date(date);

    await Promise.all([
      Object.keys(updateData).length > 0
        ? prisma.journalEntry.update({ where: { id }, data: updateData })
        : Promise.resolve(),
      amount != null && amount > 0
        ? prisma.journalEntryLine.updateMany({ where: { journalEntryId: id }, data: { amount } })
        : Promise.resolve(),
    ]);

    // Record change log if anything changed
    if (Object.keys(changes).length > 0) {
      const userEmail = session.email ?? "unknown";
      const userRole = session.role;
      const changesJson = JSON.stringify(changes);
      await prisma.$executeRaw`
        INSERT INTO journal_entry_edits (journal_entry_id, edited_by_email, edited_by_role, changes)
        VALUES (${id}::uuid, ${userEmail}, ${userRole}, ${changesJson}::jsonb)`.catch(() => {});
    }

    revalidateTag("dashboard");
    revalidateTag("pf-balances");
    return NextResponse.json({ success: true, data: { id } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
