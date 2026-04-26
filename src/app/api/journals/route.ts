import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === "ENTRY_MANAGER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const entityId = searchParams.get("entityId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = 50;

  const where: any = {
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
        currency: primaryLine?.currency ?? "USD",
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
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === "ENTRY_MANAGER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { id, description, category, date } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const updated = await prisma.journalEntry.update({
      where: { id },
      data: {
        ...(description ? { description } : {}),
        ...(category ? { category } : {}),
        ...(date ? { date: new Date(date) } : {}),
      },
    });

    return NextResponse.json({ success: true, data: { id: updated.id } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
