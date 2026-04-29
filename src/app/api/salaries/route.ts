import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "ACCOUNTS_MANAGER"].includes(session.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const payPeriod = searchParams.get("payPeriod");

    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (payPeriod) where.payPeriod = payPeriod;

    const salaries = await prisma.salary.findMany({
      where,
      orderBy: { date: "desc" },
      select: {
        id: true,
        employeeId: true,
        employeeName: true,
        amount: true,
        adjustment: true,
        adjustmentNote: true,
        payPeriod: true,
        date: true,
        month: true,
        notes: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: salaries.map((s) => ({
        id: s.id,
        employeeId: s.employeeId,
        employeeName: s.employeeName,
        amount: Number(s.amount),
        adjustment: s.adjustment ? Number(s.adjustment) : null,
        adjustmentNote: s.adjustmentNote,
        payPeriod: s.payPeriod,
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
    const { employeeId, employeeName, amount, adjustment, adjustmentNote, date, month, payPeriod, notes } = await req.json();

    if (!amount || !date)
      return NextResponse.json(
        { error: "amount and date are required" },
        { status: 400 }
      );

    if (!employeeId && !employeeName)
      return NextResponse.json(
        { error: "either employeeId or employeeName is required" },
        { status: 400 }
      );

    // If employeeId is provided, fetch employee name
    let finalEmployeeName = employeeName;
    if (employeeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { name: true },
      });
      if (employee) finalEmployeeName = employee.name;
    }

    const salary = await prisma.salary.create({
      data: {
        employeeId: employeeId || null,
        employeeName: finalEmployeeName,
        amount: parseFloat(amount),
        adjustment: adjustment ? parseFloat(adjustment) : null,
        adjustmentNote: adjustmentNote || null,
        date: new Date(date),
        month: month || null,
        payPeriod: payPeriod || null,
        notes: notes || null,
        ...(session.id ? { createdById: session.id } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: salary.id,
        employeeId: salary.employeeId,
        employeeName: salary.employeeName,
        amount: Number(salary.amount),
        adjustment: salary.adjustment ? Number(salary.adjustment) : null,
        adjustmentNote: salary.adjustmentNote,
        date: salary.date.toISOString().split("T")[0],
        month: salary.month || "",
        payPeriod: salary.payPeriod || "",
        notes: salary.notes || "",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
