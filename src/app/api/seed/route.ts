import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Get admin user for createdBy references
    const adminUser = await prisma.user.findUnique({
      where: { email: "admin@themefisher.com" },
    });

    if (!adminUser) {
      return NextResponse.json({ error: "Admin user not found. Please login first." }, { status: 400 });
    }

    // Clear existing demo data (order matters for foreign keys)
    await prisma.journalEntryLine.deleteMany({});
    await prisma.journalEntry.deleteMany({});
    await prisma.pettyCashEntry.deleteMany({});
    await prisma.pettyCashPeriod.deleteMany({});
    await prisma.salary.deleteMany({});
    await prisma.salaryIncrement.deleteMany({});
    await prisma.employee.deleteMany({});
    await prisma.bankStatementItem.deleteMany({});
    await prisma.bankStatement.deleteMany({});
    await prisma.fundTransfer.deleteMany({});
    await prisma.bankAccount.deleteMany({});
    await prisma.entity.deleteMany({});

    // Create entities
    const entity1 = await prisma.entity.create({
      data: {
        name: "ABC Trading Ltd",
        slug: "abc-trading",
        type: "PARENT",
        color: "#3b82f6",
      },
    });

    const entity2 = await prisma.entity.create({
      data: {
        name: "XYZ Services",
        slug: "xyz-services",
        type: "SUB_BRAND",
        color: "#8b5cf6",
      },
    });

    // Create bank accounts
    const bdtAccount1 = await prisma.bankAccount.create({
      data: {
        entityId: entity1.id,
        accountName: "Main BDT Account",
        accountType: "LOCAL_BDT",
        currency: "BDT",
        bankName: "Dhaka Bank",
      },
    });

    const usdAccount1 = await prisma.bankAccount.create({
      data: {
        entityId: entity1.id,
        accountName: "USD Operating Account",
        accountType: "FOREIGN_USD",
        currency: "USD",
        bankName: "Standard Chartered",
      },
    });

    await prisma.bankAccount.create({
      data: {
        entityId: entity2.id,
        accountName: "Business Account",
        accountType: "LOCAL_BDT",
        currency: "BDT",
        bankName: "Jamuna Bank",
      },
    });

    // Create employees
    const emp1 = await prisma.employee.create({
      data: {
        name: "Md. Hassan",
        designation: "Operations Manager",
        department: "Operations",
        baseSalary: 50000,
        status: "ACTIVE",
        joinedAt: new Date("2023-01-15"),
        createdById: adminUser.id,
      },
    });

    const emp2 = await prisma.employee.create({
      data: {
        name: "Ayesha Khan",
        designation: "Accountant",
        department: "Finance",
        baseSalary: 35000,
        status: "ACTIVE",
        joinedAt: new Date("2023-06-01"),
        createdById: adminUser.id,
      },
    });

    const emp3 = await prisma.employee.create({
      data: {
        name: "Rahman Ahmed",
        designation: "Sales Executive",
        department: "Sales",
        baseSalary: 40000,
        status: "RESIGNED",
        joinedAt: new Date("2022-03-10"),
        resignedAt: new Date("2026-03-31"),
        createdById: adminUser.id,
      },
    });

    // Create salary records
    const april2026 = "2026-04";
    const salaryDate = new Date("2026-04-30");

    await prisma.salary.create({
      data: {
        employeeId: emp1.id,
        employeeName: emp1.name,
        amount: 50000,
        adjustment: 5000,
        adjustmentNote: "Performance bonus",
        payPeriod: april2026,
        date: salaryDate,
        createdById: adminUser.id,
      },
    });

    await prisma.salary.create({
      data: {
        employeeId: emp2.id,
        employeeName: emp2.name,
        amount: 35000,
        payPeriod: april2026,
        date: salaryDate,
        createdById: adminUser.id,
      },
    });

    // Create salary increment record
    await prisma.salaryIncrement.create({
      data: {
        employeeId: emp1.id,
        previousSalary: 45000,
        newSalary: 50000,
        effectiveDate: new Date("2026-04-01"),
        reason: "Annual review and promotion",
        createdById: adminUser.id,
      },
    });

    // Create petty cash period
    const today = new Date();
    const pettyCashPeriod = await prisma.pettyCashPeriod.create({
      data: {
        entityId: entity2.id,
        periodStart: new Date(today.getFullYear(), today.getMonth(), 1),
        periodEnd: new Date(today.getFullYear(), today.getMonth() + 1, 0),
        floatAmount: 5000,
        currency: "BDT",
      },
    });

    // Create petty cash entries
    await prisma.pettyCashEntry.create({
      data: {
        periodId: pettyCashPeriod.id,
        entityId: entity2.id,
        date: new Date(today.getFullYear(), today.getMonth(), 8),
        description: "Courier charges",
        amount: 450,
        currency: "BDT",
        txnType: "CASH_EXPENSE",
        createdById: adminUser.id,
      },
    });

    await prisma.pettyCashEntry.create({
      data: {
        periodId: pettyCashPeriod.id,
        entityId: entity2.id,
        date: new Date(today.getFullYear(), today.getMonth(), 15),
        description: "Tea and refreshments",
        amount: 1200,
        currency: "BDT",
        txnType: "CASH_EXPENSE",
        createdById: adminUser.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Demo data seeded successfully",
      data: {
        entities: 2,
        bankAccounts: 3,
        employees: 3,
        salaries: 2,
        salaryIncrements: 1,
        pettyCashEntries: 2,
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to seed data" },
      { status: 500 }
    );
  }
}
