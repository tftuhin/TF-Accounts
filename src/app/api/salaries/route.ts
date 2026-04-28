import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "ACCOUNTS_MANAGER"].includes(session.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const salaries = await prisma.salary.findMany({
      orderBy: { date: "desc" },
      select: {
        id: true,
        employeeName: true,
        amount: true,
        date: true,
        month: true,
        notes: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: salaries.map((s) => ({
        id: s.id,
        employeeName: s.employeeName,
        amount: Number(s.amount),
        date: s.date.toISOString().split("T")[0],
        month: s.month || "",
        notes: s.notes || "",
      })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "ACCOUNTS_MANAGER"].includes(session.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { employeeName, amount, date, month, notes } = await req.json();

    if (!employeeName || !amount || !date)
      return NextResponse.json(
        { error: "employeeName, amount, and date are required" },
        { status: 400 }
      );

    const salary = await prisma.salary.create({
      data: {
        employeeName,
        amount: parseFloat(amount),
        date: new Date(date),
        month: month || null,
        notes: notes || null,
        createdById: session.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: salary.id,
        employeeName: salary.employeeName,
        amount: Number(salary.amount),
        date: salary.date.toISOString().split("T")[0],
        month: salary.month || "",
        notes: salary.notes || "",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
