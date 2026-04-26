import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const entityId = searchParams.get("entityId");

  const accounts = await prisma.bankAccount.findMany({
    where: {
      isActive: true,
      ...(entityId && entityId !== "consolidated" ? { entityId } : {}),
    },
    orderBy: [{ entityId: "asc" }, { accountType: "asc" }],
    include: { entity: { select: { name: true, color: true } } },
  });

  return NextResponse.json({
    success: true,
    data: accounts.map((a) => ({
      id: a.id,
      entityId: a.entityId,
      entityName: a.entity.name,
      entityColor: a.entity.color,
      accountName: a.accountName,
      accountType: a.accountType,
      currency: a.currency,
      bankName: a.bankName,
      accountNumber: a.accountNumber,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { entityId, accountName, accountType, currency, bankName, accountNumber } = await req.json();

    if (!entityId || !accountName || !accountType)
      return NextResponse.json({ error: "entityId, accountName, accountType required" }, { status: 400 });

    const account = await prisma.bankAccount.create({
      data: {
        entityId,
        accountName,
        accountType,
        currency: currency || "USD",
        bankName: bankName || null,
        accountNumber: accountNumber || null,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, data: { id: account.id } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.bankAccount.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
