/**
 * Seed ABC Trading Ltd demo data (3 months of comprehensive financial transactions)
 * Run with: npx tsx prisma/seed-abc-demo.ts
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL } },
});

// Use the admin user's ID (created by seed.ts)
const DEFAULT_USER_ID = "admin-user-id";

async function main() {
  try {
    console.log("🌱 Seeding ABC Trading demo data...");

    // Get or create admin user for createdBy references
    let userId: string | null = null;
    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });
    if (adminUser) {
      userId = adminUser.id;
    }
    // If no admin user exists, we'll use null (created_by is nullable)

    // Clear existing demo data
    console.log("  Clearing existing demo data...");
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
    console.log("  Creating entities...");
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

    // Create chart of accounts
    console.log("  Creating chart of accounts...");
    const coa_bank1 = await prisma.chartOfAccounts.create({
      data: {
        entityId: entity1.id,
        accountCode: "1001",
        accountName: "Dhaka Bank BDT",
        accountGroup: "asset",
      },
    });

    const coa_bank2 = await prisma.chartOfAccounts.create({
      data: {
        entityId: entity1.id,
        accountCode: "1002",
        accountName: "Standard Chartered USD",
        accountGroup: "asset",
      },
    });

    const coa_petty = await prisma.chartOfAccounts.create({
      data: {
        entityId: entity2.id,
        accountCode: "1003",
        accountName: "Petty Cash",
        accountGroup: "asset",
      },
    });

    const coa_salary = await prisma.chartOfAccounts.create({
      data: {
        entityId: entity1.id,
        accountCode: "4001",
        accountName: "Salaries & Wages",
        accountGroup: "expense",
      },
    });

    const coa_office_supplies = await prisma.chartOfAccounts.create({
      data: {
        entityId: entity2.id,
        accountCode: "4002",
        accountName: "Office Supplies",
        accountGroup: "expense",
      },
    });

    const coa_capital = await prisma.chartOfAccounts.create({
      data: {
        entityId: entity1.id,
        accountCode: "3001",
        accountName: "Owners Capital",
        accountGroup: "equity",
      },
    });

    const coa_revenue = await prisma.chartOfAccounts.create({
      data: {
        entityId: entity1.id,
        accountCode: "4000",
        accountName: "Service Revenue",
        accountGroup: "revenue",
        pfAccount: "INCOME",
      },
    });

    const coa_revenue_xyz = await prisma.chartOfAccounts.create({
      data: {
        entityId: entity2.id,
        accountCode: "4000",
        accountName: "Service Revenue",
        accountGroup: "revenue",
        pfAccount: "INCOME",
      },
    });

    const coa_bank_xyz = await prisma.chartOfAccounts.create({
      data: {
        entityId: entity2.id,
        accountCode: "1001",
        accountName: "Jamuna Bank BDT",
        accountGroup: "asset",
      },
    });

    // Create bank accounts
    console.log("  Creating bank accounts...");
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
    console.log("  Creating employees...");
    const emp1 = await prisma.employee.create({
      data: {
        name: "Md. Hassan",
        designation: "Operations Manager",
        department: "Operations",
        baseSalary: 50000,
        status: "ACTIVE",
        joinedAt: new Date("2023-01-15"),
        ...(userId && { createdById: userId }),
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
        ...(userId && { createdById: userId }),
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
        ...(userId && { createdById: userId }),
      },
    });

    // Create 12 months of data (May 2025 - Apr 2026)
    console.log("  Creating 12 months of transactions...");
    const months = [
      { month: "2025-05", start: new Date("2025-05-01"), end: new Date("2025-05-31") },
      { month: "2025-06", start: new Date("2025-06-01"), end: new Date("2025-06-30") },
      { month: "2025-07", start: new Date("2025-07-01"), end: new Date("2025-07-31") },
      { month: "2025-08", start: new Date("2025-08-01"), end: new Date("2025-08-31") },
      { month: "2025-09", start: new Date("2025-09-01"), end: new Date("2025-09-30") },
      { month: "2025-10", start: new Date("2025-10-01"), end: new Date("2025-10-31") },
      { month: "2025-11", start: new Date("2025-11-01"), end: new Date("2025-11-30") },
      { month: "2025-12", start: new Date("2025-12-01"), end: new Date("2025-12-31") },
      { month: "2026-01", start: new Date("2026-01-01"), end: new Date("2026-01-31") },
      { month: "2026-02", start: new Date("2026-02-01"), end: new Date("2026-02-28") },
      { month: "2026-03", start: new Date("2026-03-01"), end: new Date("2026-03-31") },
      { month: "2026-04", start: new Date("2026-04-01"), end: new Date("2026-04-30") },
    ];

    let salaryCount = 0;
    let salaryIncrementCount = 0;
    let incomeCount = 0;
    let pettyCashCount = 0;
    let fundTransferCount = 0;
    let bankStatementCount = 0;
    let drawingCount = 0;
    let journalCount = 0;

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
            ...(userId && { createdById: userId }),
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
            ...(userId && { createdById: userId }),
          },
        });
        salaryCount++;
      }

      // ── INCOME RECORDS (2 per month - one per entity) ──
      // ABC Trading income
      await prisma.salary.create({
        data: {
          employeeName: "ABC Trading Ltd",
          amount: 250000,
          adjustment: 25000,
          adjustmentNote: "Service revenue - Project A",
          payPeriod: month,
          date: new Date(end.getFullYear(), end.getMonth(), 10),
          createdById: userId,
        },
      });
      incomeCount++;

      // XYZ Services income
      await prisma.salary.create({
        data: {
          employeeName: "XYZ Services",
          amount: 150000,
          adjustment: 10000,
          adjustmentNote: "Consulting fees - Monthly retainer",
          payPeriod: month,
          date: new Date(end.getFullYear(), end.getMonth(), 15),
          createdById: userId,
        },
      });
      incomeCount++;

      // ── SALARY INCREMENTS (2 per year) ──
      if (month === "2025-06") {
        await prisma.salaryIncrement.create({
          data: {
            employeeId: emp1.id,
            previousSalary: 50000,
            newSalary: 52000,
            effectiveDate: start,
            reason: "Annual review",
            ...(userId && { createdById: userId }),
          },
        });
        salaryIncrementCount++;
      }
      if (month === "2025-12") {
        await prisma.salaryIncrement.create({
          data: {
            employeeId: emp2.id,
            previousSalary: 35000,
            newSalary: 37000,
            effectiveDate: mid,
            reason: "Promotion",
            ...(userId && { createdById: userId }),
          },
        });
        salaryIncrementCount++;
      }

      // ── PETTY CASH PERIODS & ENTRIES (2 of each expense type per month) ──
      const pettyCashPeriod = await prisma.pettyCashPeriod.create({
        data: {
          entityId: entity2.id,
          periodStart: start,
          periodEnd: new Date(start.getFullYear(), start.getMonth() + 1, 0),
          floatAmount: 15000,
          currency: "BDT",
        },
      });

      // Expense type categories (2 of each)
      const expenseCategories = [
        { desc: "Office supplies", amount: 1250 },
        { desc: "Printer cartridges", amount: 2450 },
        { desc: "Team lunch", amount: 3200 },
        { desc: "Office snacks", amount: 1800 },
        { desc: "Courier charges", amount: 850 },
        { desc: "Local delivery", amount: 600 },
        { desc: "Internet bill", amount: 1500 },
        { desc: "Electricity top-up", amount: 2000 },
        { desc: "Taxi/transport", amount: 950 },
        { desc: "Parking and fuel", amount: 1300 },
        { desc: "Office rent advance", amount: 5000 },
        { desc: "Maintenance supplies", amount: 2200 },
      ];

      let dayOffset = 1;
      for (const cat of expenseCategories) {
        await prisma.pettyCashEntry.create({
          data: {
            periodId: pettyCashPeriod.id,
            entityId: entity2.id,
            date: new Date(start.getFullYear(), start.getMonth(), Math.min(dayOffset, 28)),
            description: cat.desc,
            amount: cat.amount,
            currency: "BDT",
            txnType: "CASH_EXPENSE",
            ...(userId && { createdById: userId }),
          },
        });
        pettyCashCount++;
        dayOffset += 2;
      }

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
            ...(userId && { createdBy: userId }),
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
            ...(userId && { createdBy: userId }),
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
          ...(userId && { uploadedById: userId }),
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
          ...(userId && { uploadedById: userId }),
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
            ...(userId && { createdById: userId }),
            ...(userId && { approvedBy: userId }),
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
            ...(userId && { createdById: userId }),
            ...(userId && { approvedBy: userId }),
            approvedAt: new Date(),
          },
        });
        drawingCount++;
      }

      // ── CREATE JOURNAL ENTRIES ──
      // Income journal entries
      const abcIncomeTotal = 275000; // 250000 + 25000 adjustment
      const xyzIncomeTotal = 160000; // 150000 + 10000 adjustment

      // ABC Trading income
      const je_abc_income = await prisma.journalEntry.create({
        data: {
          entityId: entity1.id,
          date: new Date(end.getFullYear(), end.getMonth(), 10),
          description: `Service revenue - Project A (${month})`,
          reference: `INC-ABC-${month}`,
          status: "FINALIZED",
          createdByRole: "ENTRY_MANAGER",
          ...(userId && { createdById: userId }),
        },
      });

      await prisma.journalEntryLine.create({
        data: {
          journalEntryId: je_abc_income.id,
          accountId: coa_bank1.id,
          entityId: entity1.id,
          entryType: "DEBIT",
          amount: abcIncomeTotal,
          currency: "BDT",
        },
      });

      await prisma.journalEntryLine.create({
        data: {
          journalEntryId: je_abc_income.id,
          accountId: coa_revenue.id,
          entityId: entity1.id,
          entryType: "CREDIT",
          amount: abcIncomeTotal,
          currency: "BDT",
        },
      });
      journalCount++;

      // XYZ Services income
      const je_xyz_income = await prisma.journalEntry.create({
        data: {
          entityId: entity2.id,
          date: new Date(end.getFullYear(), end.getMonth(), 15),
          description: `Consulting fees - Monthly retainer (${month})`,
          reference: `INC-XYZ-${month}`,
          status: "FINALIZED",
          createdByRole: "ENTRY_MANAGER",
          ...(userId && { createdById: userId }),
        },
      });

      await prisma.journalEntryLine.create({
        data: {
          journalEntryId: je_xyz_income.id,
          accountId: coa_bank_xyz.id,
          entityId: entity2.id,
          entryType: "DEBIT",
          amount: xyzIncomeTotal,
          currency: "BDT",
        },
      });

      await prisma.journalEntryLine.create({
        data: {
          journalEntryId: je_xyz_income.id,
          accountId: coa_revenue_xyz.id,
          entityId: entity2.id,
          entryType: "CREDIT",
          amount: xyzIncomeTotal,
          currency: "BDT",
        },
      });
      journalCount++;

      // Salary expense journal entries
      for (const emp of [emp1, emp2, emp3]) {
        const totalSalary = await prisma.salary.aggregate({
          where: { employeeId: emp.id, payPeriod: month },
          _sum: { amount: true, adjustment: true },
        });

        if ((totalSalary._sum.amount || 0) > 0) {
          const totalAmount = (totalSalary._sum.amount || 0) + (totalSalary._sum.adjustment || 0);
          const je = await prisma.journalEntry.create({
            data: {
              entityId: entity1.id,
              date: end,
              description: `Salary payment - ${emp.name} (${month})`,
              reference: `SAL-${month}-${emp.id.substring(0, 8)}`,
              status: "FINALIZED",
              createdByRole: "ENTRY_MANAGER",
              ...(userId && { createdById: userId }),
            },
          });

          await prisma.journalEntryLine.create({
            data: {
              journalEntryId: je.id,
              accountId: coa_salary.id,
              entityId: entity1.id,
              entryType: "DEBIT",
              amount: totalAmount,
              currency: "BDT",
            },
          });

          await prisma.journalEntryLine.create({
            data: {
              journalEntryId: je.id,
              accountId: coa_bank1.id,
              entityId: entity1.id,
              entryType: "CREDIT",
              amount: totalAmount,
              currency: "BDT",
            },
          });
          journalCount++;
        }
      }

      // Petty cash expense journal entries
      const pettyCashEntries = await prisma.pettyCashEntry.findMany({
        where: { entityId: entity2.id, date: { gte: start, lte: end } },
      });

      const totalPettyCash = pettyCashEntries.reduce((sum, e) => sum + Number(e.amount), 0);
      if (totalPettyCash > 0) {
        const je = await prisma.journalEntry.create({
          data: {
            entityId: entity2.id,
            date: end,
            description: `Petty cash expenses (${month})`,
            reference: `PC-${month}`,
            status: "FINALIZED",
            createdByRole: "ENTRY_MANAGER",
            ...(userId && { createdById: userId }),
          },
        });

        await prisma.journalEntryLine.create({
          data: {
            journalEntryId: je.id,
            accountId: coa_office_supplies.id,
            entityId: entity2.id,
            entryType: "DEBIT",
            amount: totalPettyCash,
            currency: "BDT",
          },
        });

        await prisma.journalEntryLine.create({
          data: {
            journalEntryId: je.id,
            accountId: coa_petty.id,
            entityId: entity2.id,
            entryType: "CREDIT",
            amount: totalPettyCash,
            currency: "BDT",
          },
        });
        journalCount++;
      }

      // Fund transfer journal entries
      const transfers = await prisma.fundTransfer.findMany({
        where: { entityId: entity1.id, date: { gte: start, lte: end } },
      });

      for (const transfer of transfers) {
        const je = await prisma.journalEntry.create({
          data: {
            entityId: entity1.id,
            date: transfer.date,
            description: `Fund transfer - ${transfer.currencyFrom} to ${transfer.currencyTo}`,
            reference: transfer.reference || `FT-${month}`,
            status: "FINALIZED",
            createdByRole: "ENTRY_MANAGER",
            ...(userId && { createdById: userId }),
          },
        });

        // Debit receiving account
        await prisma.journalEntryLine.create({
          data: {
            journalEntryId: je.id,
            accountId: coa_bank2.id,
            entityId: entity1.id,
            entryType: "DEBIT",
            amount: transfer.amountTo,
            currency: transfer.currencyTo as any,
          },
        });

        // Credit sending account
        await prisma.journalEntryLine.create({
          data: {
            journalEntryId: je.id,
            accountId: coa_bank1.id,
            entityId: entity1.id,
            entryType: "CREDIT",
            amount: transfer.amountFrom,
            currency: transfer.currencyFrom as any,
          },
        });
        journalCount++;
      }

      // Owner drawing journal entries
      const drawings = await prisma.drawing.findMany({
        where: { entityId: entity1.id, date: { gte: start, lte: end } },
      });

      for (const drawing of drawings) {
        const je = await prisma.journalEntry.create({
          data: {
            entityId: entity1.id,
            date: drawing.date,
            description: `Owner drawing - ${drawing.sourceAccount}`,
            status: "FINALIZED",
            createdByRole: "ENTRY_MANAGER",
            ...(userId && { createdById: userId }),
          },
        });

        await prisma.journalEntryLine.create({
          data: {
            journalEntryId: je.id,
            accountId: coa_capital.id,
            entityId: entity1.id,
            entryType: "DEBIT",
            amount: drawing.amount,
            currency: drawing.currency as any,
          },
        });

        await prisma.journalEntryLine.create({
          data: {
            journalEntryId: je.id,
            accountId: coa_bank1.id,
            entityId: entity1.id,
            entryType: "CREDIT",
            amount: drawing.amount,
            currency: drawing.currency as any,
          },
        });
        journalCount++;
      }
    }

    console.log("✅ Demo data seeded successfully!");
    console.log(`   Entities: 2`);
    console.log(`   Employees: 3`);
    console.log(`   Months: 12`);
    console.log(`   Income Records: ${incomeCount}`);
    console.log(`   Salaries: ${salaryCount}`);
    console.log(`   Salary Increments: ${salaryIncrementCount}`);
    console.log(`   Petty Cash Entries: ${pettyCashCount}`);
    console.log(`   Fund Transfers: ${fundTransferCount}`);
    console.log(`   Bank Statement Items: ${bankStatementCount}`);
    console.log(`   Owner Drawings: ${drawingCount}`);
    console.log(`   Journal Entries: ${journalCount}`);
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
