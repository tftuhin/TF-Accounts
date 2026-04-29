import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "ACCOUNTS_MANAGER"].includes(session.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { payPeriod, date, notes } = await req.json();

    if (!payPeriod || !date)
      return NextResponse.json(
        { error: "payPeriod and date are required" },
        { status: 400 }
      );

    // Fetch all ACTIVE employees
    const activeEmployees = await prisma.employee.findMany({
      where: { status: "ACTIVE" },
    });

    if (activeEmployees.length === 0) {
      return NextResponse.json({
        success: true,
        data: { count: 0, message: "No active employees found" },
      });
    }

    // Create salary records for each active employee
    const salaryDate = new Date(date);
    const createdSalaries = await Promise.all(
      activeEmployees.map((emp) =>
        prisma.salary.create({
          data: {
            employeeId: emp.id,
            employeeName: emp.name,
            amount: emp.baseSalary,
            payPeriod,
            date: salaryDate,
            notes: notes || null,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      data: {
        count: createdSalaries.length,
        payPeriod,
        date: salaryDate.toISOString().split("T")[0],
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
