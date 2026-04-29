import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !["ADMIN", "ACCOUNTS_MANAGER"].includes(session.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { id } = await params;
    const { newSalary, effectiveDate, reason } = await req.json();

    if (!newSalary || !effectiveDate)
      return NextResponse.json(
        { error: "newSalary and effectiveDate are required" },
        { status: 400 }
      );

    // Fetch current employee to get previous salary
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee)
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    const previousSalary = Number(employee.baseSalary);
    const newSalaryNum = parseFloat(newSalary);

    // Create salary increment record
    const increment = await prisma.salaryIncrement.create({
      data: {
        employeeId: id,
        previousSalary: previousSalary,
        newSalary: newSalaryNum,
        effectiveDate: new Date(effectiveDate),
        reason: reason || null,
        createdById: session?.id || null,
      },
    });

    // Update employee's base salary
    await prisma.employee.update({
      where: { id },
      data: { baseSalary: newSalaryNum },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: increment.id,
        previousSalary,
        newSalary: newSalaryNum,
        effectiveDate: increment.effectiveDate.toISOString().split("T")[0],
        reason: increment.reason,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
