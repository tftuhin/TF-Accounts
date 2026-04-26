import { PrismaClient, EntityType, UserRole, Currency, BankAccountType, PfAccountType } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Users ─────────────────────────────────────────────────
  const adminPass = await hash("admin@teamosis2025", 12);
  const managerPass = await hash("manager@2025", 12);
  const entryPass = await hash("entry@2025", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@teamosis.com" },
    update: {},
    create: {
      email: "admin@teamosis.com",
      passwordHash: adminPass,
      fullName: "Mehedi Sharif",
      role: UserRole.ADMIN,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "accounts@teamosis.com" },
    update: {},
    create: {
      email: "accounts@teamosis.com",
      passwordHash: managerPass,
      fullName: "Accounts Manager",
      role: UserRole.ACCOUNTS_MANAGER,
    },
  });

  const entryUser = await prisma.user.upsert({
    where: { email: "entry@teamosis.com" },
    update: {},
    create: {
      email: "entry@teamosis.com",
      passwordHash: entryPass,
      fullName: "Entry Clerk",
      role: UserRole.ENTRY_MANAGER,
    },
  });

  // ── Entities ──────────────────────────────────────────────
  const teamosis = await prisma.entity.upsert({
    where: { slug: "teamosis" },
    update: {},
    create: { slug: "teamosis", name: "Teamosis", type: EntityType.PARENT, color: "#0F766E" },
  });

  const themefisher = await prisma.entity.upsert({
    where: { slug: "themefisher" },
    update: {},
    create: { slug: "themefisher", name: "Themefisher", type: EntityType.SUB_BRAND, parentId: teamosis.id, color: "#8B5CF6" },
  });

  const gethugothemes = await prisma.entity.upsert({
    where: { slug: "gethugothemes" },
    update: {},
    create: { slug: "gethugothemes", name: "Gethugothemes", type: EntityType.SUB_BRAND, parentId: teamosis.id, color: "#3B82F6" },
  });

  const zeonstudio = await prisma.entity.upsert({
    where: { slug: "zeonstudio" },
    update: {},
    create: { slug: "zeonstudio", name: "Zeon Studio", type: EntityType.SUB_BRAND, parentId: teamosis.id, color: "#EF4444" },
  });

  const allEntities = [teamosis, themefisher, gethugothemes, zeonstudio];

  // ── User Entity Access ────────────────────────────────────
  for (const entity of allEntities) {
    for (const user of [admin, manager, entryUser]) {
      await prisma.userEntityAccess.upsert({
        where: { userId_entityId: { userId: user.id, entityId: entity.id } },
        update: {},
        create: { userId: user.id, entityId: entity.id },
      });
    }
  }

  // ── Ownership Registry ────────────────────────────────────
  await prisma.ownershipRegistry.createMany({
    data: [
      { entityId: teamosis.id, ownerName: "Mehedi Sharif", ownershipPct: 50, effectiveFrom: new Date("2024-01-01") },
      { entityId: teamosis.id, ownerName: "Tuhin", ownershipPct: 50, effectiveFrom: new Date("2024-01-01") },
      { entityId: themefisher.id, ownerName: "Mehedi Sharif", ownershipPct: 60, effectiveFrom: new Date("2024-01-01") },
      { entityId: themefisher.id, ownerName: "Tuhin", ownershipPct: 40, effectiveFrom: new Date("2024-01-01") },
      { entityId: gethugothemes.id, ownerName: "Mehedi Sharif", ownershipPct: 55, effectiveFrom: new Date("2024-01-01") },
      { entityId: gethugothemes.id, ownerName: "Tuhin", ownershipPct: 45, effectiveFrom: new Date("2024-01-01") },
      { entityId: zeonstudio.id, ownerName: "Mehedi Sharif", ownershipPct: 50, effectiveFrom: new Date("2024-01-01") },
      { entityId: zeonstudio.id, ownerName: "Tuhin", ownershipPct: 50, effectiveFrom: new Date("2024-01-01") },
    ],
    skipDuplicates: true,
  });

  // ── PF Ratio Versions ─────────────────────────────────────
  for (const entity of allEntities) {
    await prisma.pfRatioVersion.upsert({
      where: { entityId_quarter: { entityId: entity.id, quarter: "Q1-2025" } },
      update: {},
      create: {
        entityId: entity.id, quarter: "Q1-2025",
        profitPct: 10, ownerCompPct: 55, taxPct: 15, opexPct: 20,
        effectiveFrom: new Date("2025-01-01"), isCurrent: false,
      },
    });
    await prisma.pfRatioVersion.upsert({
      where: { entityId_quarter: { entityId: entity.id, quarter: "Q2-2025" } },
      update: {},
      create: {
        entityId: entity.id, quarter: "Q2-2025",
        profitPct: 15, ownerCompPct: 50, taxPct: 15, opexPct: 20,
        effectiveFrom: new Date("2025-04-01"), isCurrent: true,
      },
    });
  }

  // ── Bank Accounts (Money Flow Topology) ───────────────────
  const bankAccountsData = [
    // Foreign USD accounts (income lands here)
    { entityId: teamosis.id, accountName: "Stripe USD", accountType: BankAccountType.FOREIGN_USD, currency: Currency.USD, bankName: "Stripe" },
    { entityId: teamosis.id, accountName: "PayPal USD", accountType: BankAccountType.FOREIGN_USD, currency: Currency.USD, bankName: "PayPal" },
    { entityId: teamosis.id, accountName: "Wise USD", accountType: BankAccountType.FOREIGN_USD, currency: Currency.USD, bankName: "Wise" },
    // Local Bangladesh accounts
    { entityId: teamosis.id, accountName: "DBBL USD Account", accountType: BankAccountType.LOCAL_USD, currency: Currency.USD, bankName: "Dutch Bangla Bank", accountNumber: "4521" },
    { entityId: teamosis.id, accountName: "DBBL BDT Account", accountType: BankAccountType.LOCAL_BDT, currency: Currency.BDT, bankName: "Dutch Bangla Bank", accountNumber: "7834" },
    { entityId: teamosis.id, accountName: "Bkash BDT", accountType: BankAccountType.LOCAL_BDT, currency: Currency.BDT, bankName: "bKash" },
    // Petty cash
    { entityId: teamosis.id, accountName: "Office Petty Cash", accountType: BankAccountType.PETTY_CASH, currency: Currency.BDT, bankName: "Cash Box" },
    { entityId: teamosis.id, accountName: "ATM Card - DBBL", accountType: BankAccountType.PETTY_CASH, currency: Currency.BDT, bankName: "Dutch Bangla Bank", accountNumber: "9012" },
  ];

  for (const ba of bankAccountsData) {
    await prisma.bankAccount.create({ data: ba });
  }

  // ── Chart of Accounts ─────────────────────────────────────
  const accountsTemplate = [
    { code: "1000", name: "Cash & Bank (USD)", pf: null, group: "asset" },
    { code: "1001", name: "Cash & Bank (BDT)", pf: null, group: "asset" },
    { code: "1010", name: "Accounts Receivable", pf: null, group: "asset" },
    { code: "1050", name: "Foreign USD Holding", pf: null, group: "asset" },
    { code: "1100", name: "Petty Cash (BDT)", pf: null, group: "asset" },
    { code: "2000", name: "Accounts Payable", pf: null, group: "liability" },
    { code: "3000", name: "Owner Equity", pf: null, group: "equity" },
    { code: "3100", name: "Owner Drawings", pf: null, group: "equity" },
    { code: "4000", name: "Revenue - Theme Sales", pf: PfAccountType.INCOME, group: "revenue" },
    { code: "4010", name: "Revenue - Custom Dev", pf: PfAccountType.INCOME, group: "revenue" },
    { code: "4020", name: "Revenue - Services", pf: PfAccountType.INCOME, group: "revenue" },
    { code: "5000", name: "PF - Profit Reserve", pf: PfAccountType.PROFIT, group: "equity" },
    { code: "5100", name: "PF - Owner Compensation", pf: PfAccountType.OWNERS_COMP, group: "equity" },
    { code: "5200", name: "PF - Tax Reserve", pf: PfAccountType.TAX, group: "liability" },
    { code: "6000", name: "OPEX - Hosting", pf: PfAccountType.OPEX, group: "expense" },
    { code: "6010", name: "OPEX - Salaries", pf: PfAccountType.OPEX, group: "expense" },
    { code: "6020", name: "OPEX - Marketing", pf: PfAccountType.OPEX, group: "expense" },
    { code: "6030", name: "OPEX - Tools & Software", pf: PfAccountType.OPEX, group: "expense" },
    { code: "6040", name: "OPEX - Office & Misc", pf: PfAccountType.OPEX, group: "expense" },
    { code: "6050", name: "OPEX - Petty Cash Float", pf: PfAccountType.OPEX, group: "expense" },
    { code: "7000", name: "Inter-Brand Receivable", pf: null, group: "asset" },
    { code: "7100", name: "Inter-Brand Payable", pf: null, group: "liability" },
    { code: "8000", name: "Exchange Gain/Loss", pf: null, group: "revenue" },
  ];

  for (const entity of allEntities) {
    for (const acc of accountsTemplate) {
      await prisma.chartOfAccounts.upsert({
        where: { entityId_accountCode: { entityId: entity.id, accountCode: acc.code } },
        update: {},
        create: {
          entityId: entity.id,
          accountCode: acc.code,
          accountName: acc.name,
          pfAccount: acc.pf,
          accountGroup: acc.group,
        },
      });
    }
  }

  // ── Petty Cash Period ─────────────────────────────────────
  await prisma.pettyCashPeriod.create({
    data: {
      entityId: teamosis.id,
      periodStart: new Date("2025-04-01"),
      periodEnd: new Date("2025-04-30"),
      floatAmount: 25000,  // BDT
      currency: Currency.BDT,
    },
  });

  console.log("✅ Seed complete!");
  console.log("\n📧 Login credentials:");
  console.log("   Admin:    admin@teamosis.com / admin@teamosis2025");
  console.log("   Manager:  accounts@teamosis.com / manager@2025");
  console.log("   Entry:    entry@teamosis.com / entry@2025");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
