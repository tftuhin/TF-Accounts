import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const adminUser = await prisma.user.findUnique({
      where: { email: "admin@themefisher.com" },
    });

    if (!adminUser) {
      return NextResponse.json({ error: "Admin user not found. Please login first." }, { status: 400 });
    }

    // Clear existing demo data
    await prisma.journalEntryLine.deleteMany({});
    await prisma.journalEntry.deleteMany({});
    await prisma.pettyCashEntry.deleteMany({});
    await prisma.pettyCashPeriod.deleteMany({});
    await prisma.drawing.deleteMany({});
    await prisma.fundTransfer.deleteMany({});
    await prisma.bankStatementItem.deleteMany({});
    await prisma.bankStatement.deleteMany({});
    await prisma.salary.deleteMany({});
    await prisma.salaryIncrement.deleteMany({});
    await prisma.ownershipRegistry.deleteMany({});
    await prisma.employee.deleteMany({});
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
        parentId: entity1.id,
        color: "#8b5cf6",
      },
    });

    // Create ownership for sub-brand (parent auto-created)
    await prisma.ownershipRegistry.create({
      data: {
        entityId: entity2.id,
        ownerName: entity1.name,
        ownershipPct: 100,
        effectiveFrom: new Date("2026-01-01"),
      },
    });

    // Add owner to parent entity
    await prisma.ownershipRegistry.create({
      data: {
        entityId: entity1.id,
        ownerName: "Rafiqul Islam",
        ownershipPct: 100,
        effectiveFrom: new Date("2026-01-01"),
      },
    });

    // Create bank accounts
    const bdtAccount1 = await prisma.bankAccount.create({
      data: {
        entityId: entity1.id,
        accountName: "ABC Main BDT Account",
        accountType: "LOCAL_BDT",
        currency: "BDT",
        bankName: "Dhaka Bank",
      },
    });

    const usdAccount1 = await prisma.bankAccount.create({
      data: {
        entityId: entity1.id,
        accountName: "ABC USD Operating",
        accountType: "FOREIGN_USD",
        currency: "USD",
        bankName: "Standard Chartered",
      },
    });

    const bdtAccount2 = await prisma.bankAccount.create({
      data: {
        entityId: entity2.id,
        accountName: "XYZ BDT Account",
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
        status: "ACTIVE",
        joinedAt: new Date("2022-03-10"),
        createdById: adminUser.id,
      },
    });

    // Create 3 months of data (Feb, Mar, Apr 2026)
    const months = [
      { month: "2026-02", start: new Date("2026-02-01"), end: new Date("2026-02-28") },
      { month: "2026-03", start: new Date("2026-03-01"), end: new Date("2026-03-31") },
      { month: "2026-04", start: new Date("2026-04-01"), end: new Date("2026-04-30") },
    ];

    let salaryCount = 0;
    let salaryIncrementCount = 0;
    let pettyCashCount = 0;
    let fundTransferCount = 0;
    let bankStatementCount = 0;
    let drawingCount = 0;

    for (const { month, start, end } of months) {
      const mid = new Date((start.getTime() + end.getTime()) / 2);

      // ── SALARIES (2 per employee per month = 6 salaries) ──
      for (const emp of [emp1, emp2, emp3]) {
        // Salary 1
        await prisma.salary.create({
          data: {
            employeeId: emp.id,
            employeeName: emp.name,
            amount: Number(emp.baseSalary),
            adjustment: Math.floor(Number(emp.baseSalary) * 0.05),
            adjustmentNote: "Monthly performance bonus",
            payPeriod: month,
            date: new Date(end.getFullYear(), end.getMonth(), 15),
            createdById: adminUser.id,
          },
        });
        salaryCount++;

        // Salary 2 (advance/partial)
        await prisma.salary.create({
          data: {
            employeeId: emp.id,
            employeeName: emp.name,
            amount: Math.floor(Number(emp.baseSalary) * 0.5),
            adjustmentNote: "Salary advance",
            payPeriod: month,
            date: new Date(end.getFullYear(), end.getMonth(), 1),
            createdById: adminUser.id,
          },
        });
        salaryCount++;
      }

      // ── SALARY INCREMENTS (2 per month) ──
      if (month === "2026-02") {
        await prisma.salaryIncrement.create({
          data: {
            employeeId: emp1.id,
            previousSalary: 50000,
            newSalary: 52000,
            effectiveDate: start,
            reason: "Annual review",
            createdById: adminUser.id,
          },
        });
        salaryIncrementCount++;
      }
      if (month === "2026-04") {
        await prisma.salaryIncrement.create({
          data: {
            employeeId: emp2.id,
            previousSalary: 35000,
            newSalary: 37000,
            effectiveDate: mid,
            reason: "Promotion",
            createdById: adminUser.id,
          },
        });
        salaryIncrementCount++;
      }

      // ── PETTY CASH PERIODS & ENTRIES (2 periods, 4 entries per month) ──
      const pettyCashPeriod = await prisma.pettyCashPeriod.create({
        data: {
          entityId: entity2.id,
          periodStart: start,
          periodEnd: new Date(start.getFullYear(), start.getMonth() + 1, 0),
          floatAmount: 5000,
          currency: "BDT",
        },
      });

      await prisma.pettyCashEntry.create({
        data: {
          periodId: pettyCashPeriod.id,
          entityId: entity2.id,
          date: new Date(start.getFullYear(), start.getMonth(), 5),
          description: "Office supplies and stationery",
          amount: 2450,
          currency: "BDT",
          txnType: "CASH_EXPENSE",
          createdById: adminUser.id,
        },
      });
      pettyCashCount++;

      await prisma.pettyCashEntry.create({
        data: {
          periodId: pettyCashPeriod.id,
          entityId: entity2.id,
          date: new Date(start.getFullYear(), start.getMonth(), 15),
          description: "Meals and refreshments",
          amount: 3200,
          currency: "BDT",
          txnType: "CASH_EXPENSE",
          createdById: adminUser.id,
        },
      });
      pettyCashCount++;

      // ── FUND TRANSFERS (2 per month) ──
      if (bdtAccount1 && usdAccount1) {
        // Transfer 1
        await prisma.fundTransfer.create({
          data: {
            entityId: entity1.id,
            fromAccountId: bdtAccount1.id,
            toAccountId: usdAccount1.id,
            amountFrom: 50000,
            currencyFrom: "BDT",
            amountTo: 410,
            currencyTo: "USD",
            exchangeRate: 121.95,
            date: new Date(start.getFullYear(), start.getMonth(), 7),
            reference: `FT-${month}-001`,
            note: "Monthly fund transfer",
            createdById: adminUser.id,
          },
        });
        fundTransferCount++;

        // Transfer 2
        await prisma.fundTransfer.create({
          data: {
            entityId: entity1.id,
            fromAccountId: usdAccount1.id,
            toAccountId: bdtAccount1.id,
            amountFrom: 200,
            currencyFrom: "USD",
            amountTo: 24390,
            currencyTo: "BDT",
            exchangeRate: 121.95,
            date: new Date(start.getFullYear(), start.getMonth(), 20),
            reference: `FT-${month}-002`,
            note: "Return transfer",
            createdById: adminUser.id,
          },
        });
        fundTransferCount++;
      }

      // ── BANK STATEMENTS (2 per month) ──
      const statement1 = await prisma.bankStatement.create({
        data: {
          entityId: entity1.id,
          statementDate: new Date(start.getFullYear(), start.getMonth(), 10),
          source: "Dhaka Bank",
          totalCredits: 150000,
          totalDebits: 120000,
          currency: "BDT",
          uploadedBy: adminUser.id,
        },
      });

      await prisma.bankStatementItem.create({
        data: {
          statementId: statement1.id,
          date: new Date(start.getFullYear(), start.getMonth(), 5),
          description: "Deposit from sales",
          amount: 75000,
          entryType: "DEBIT",
          status: "MATCHED",
        },
      });
      bankStatementCount++;

      await prisma.bankStatementItem.create({
        data: {
          statementId: statement1.id,
          date: new Date(start.getFullYear(), start.getMonth(), 10),
          description: "Salary payment",
          amount: 125000,
          entryType: "CREDIT",
          status: "UNMATCHED",
        },
      });
      bankStatementCount++;

      const statement2 = await prisma.bankStatement.create({
        data: {
          entityId: entity1.id,
          statementDate: new Date(start.getFullYear(), start.getMonth(), 25),
          source: "Standard Chartered",
          totalCredits: 2500,
          totalDebits: 1800,
          currency: "USD",
          uploadedBy: adminUser.id,
        },
      });

      await prisma.bankStatementItem.create({
        data: {
          statementId: statement2.id,
          date: new Date(start.getFullYear(), start.getMonth(), 15),
          description: "International payment",
          amount: 1500,
          entryType: "DEBIT",
          status: "MATCHED",
        },
      });
      bankStatementCount++;

      // ── DRAWINGS (2 per month - owner withdrawals) ──
      const ownership = await prisma.ownershipRegistry.findFirst({
        where: { entityId: entity1.id, effectiveTo: null },
      });

      if (ownership) {
        await prisma.drawing.create({
          data: {
            entityId: entity1.id,
            ownershipRegistryId: ownership.id,
            sourceAccount: "PROFIT",
            amount: 25000,
            currency: "BDT",
            date: new Date(start.getFullYear(), start.getMonth(), 10),
            status: "APPROVED",
            note: "Monthly profit distribution",
            createdById: adminUser.id,
            approvedBy: adminUser.id,
            approvedAt: new Date(),
          },
        });
        drawingCount++;

        await prisma.drawing.create({
          data: {
            entityId: entity1.id,
            ownershipRegistryId: ownership.id,
            sourceAccount: "OWNERS_COMP",
            amount: 15000,
            currency: "BDT",
            date: new Date(start.getFullYear(), start.getMonth(), 25),
            status: "APPROVED",
            note: "Owner compensation",
            createdById: adminUser.id,
            approvedBy: adminUser.id,
            approvedAt: new Date(),
          },
        });
        drawingCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: "3 months of comprehensive demo data seeded successfully",
      data: {
        entities: 2,
        employees: 3,
        months: 3,
        transactions: {
          salaries: salaryCount,
          salaryIncrements: salaryIncrementCount,
          pettyCashEntries: pettyCashCount,
          fundTransfers: fundTransferCount,
          bankStatementItems: bankStatementCount,
          ownerDrawings: drawingCount,
        },
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
