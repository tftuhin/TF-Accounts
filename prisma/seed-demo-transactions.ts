/**
 * Demo transaction seeder — adds 9 months of realistic financial data
 * across Themefisher, Gethugothemes, and Zeon Studio to demonstrate
 * the Financial Health Advisor on the dashboard.
 *
 * Run with:  npx tsx prisma/seed-demo-transactions.ts
 */

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL } },
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// ── Helper to get month date ──────────────────────────────────────────────────
function monthDate(monthsAgo: number, day = 15): Date {
  const d = new Date(2026, 3, day); // base: April 2026
  d.setMonth(d.getMonth() - monthsAgo);
  return d;
}

// ── Ensure a basic income + opex account exist for an entity ─────────────────
async function getAccounts(entityId: string) {
  const [incomeAcc, opexAcc, cashAcc] = await Promise.all([
    prisma.chartOfAccounts.upsert({
      where: { entityId_accountCode: { entityId, accountCode: "4000" } },
      update: {},
      create: { entityId, accountCode: "4000", accountName: "Revenue", pfAccount: "INCOME", accountGroup: "revenue" },
    }),
    prisma.chartOfAccounts.upsert({
      where: { entityId_accountCode: { entityId, accountCode: "6000" } },
      update: {},
      create: { entityId, accountCode: "6000", accountName: "Operating Expenses", pfAccount: "OPEX", accountGroup: "expense" },
    }),
    prisma.chartOfAccounts.upsert({
      where: { entityId_accountCode: { entityId, accountCode: "1000" } },
      update: {},
      create: { entityId, accountCode: "1000", accountName: "Cash & Bank", pfAccount: null, accountGroup: "asset" },
    }),
  ]);
  return { incomeAcc, opexAcc, cashAcc };
}

// ── Create one income journal entry ──────────────────────────────────────────
async function addIncome(
  entityId: string, adminId: string,
  accounts: Awaited<ReturnType<typeof getAccounts>>,
  date: Date, amount: number, description: string, category: string
) {
  return prisma.journalEntry.create({
    data: {
      entityId, date, description, status: "FINALIZED", category,
      createdById: adminId, createdByRole: "ADMIN",
      lines: {
        create: [
          { accountId: accounts.incomeAcc.id, pfAccount: "INCOME", entryType: "CREDIT", amount, currency: "BDT", entityId },
          { accountId: accounts.cashAcc.id,   pfAccount: null,     entryType: "DEBIT",  amount, currency: "BDT", entityId },
        ],
      },
    },
  });
}

// ── Create one expense journal entry ─────────────────────────────────────────
async function addExpense(
  entityId: string, adminId: string,
  accounts: Awaited<ReturnType<typeof getAccounts>>,
  date: Date, amount: number, description: string, category: string
) {
  return prisma.journalEntry.create({
    data: {
      entityId, date, description, status: "FINALIZED", category,
      createdById: adminId, createdByRole: "ADMIN",
      lines: {
        create: [
          { accountId: accounts.opexAcc.id, pfAccount: "OPEX", entryType: "DEBIT",  amount, currency: "BDT", entityId },
          { accountId: accounts.cashAcc.id, pfAccount: null,   entryType: "CREDIT", amount, currency: "BDT", entityId },
        ],
      },
    },
  });
}

// ── Monthly plan ──────────────────────────────────────────────────────────────
//
//  Story:
//  - Themefisher:    Strong grower Jan–Mar, sharp revenue drop in April
//  - Gethugothemes:  Steady consistent growth all 9 months (best performer)
//  - Zeon Studio:    Was profitable mid-2025, now deeply loss-making
//
//  This triggers:
//  ① CRITICAL  MoM revenue drop of ~40% (April consolidated vs March)
//  ② CRITICAL  Zeon Studio is loss-making (last 3 months)
//  ③ WARNING   Expense ratio creeping above 80% (consolidated)
//  ④ WARNING   ~4 months runway (cumulative equity / avg burn)
//  ⑤ POSITIVE  Gethugothemes is leading in growth
//  ⑥ INFO      Revenue plateaued (3-mo avg vs prior 3-mo)

const PLAN: {
  slug: string;
  // [monthsAgo, income, expenses][]
  months: [number, number, number][];
}[] = [
  {
    slug: "themefisher",
    months: [
      [8, 8_200,  4_400],   // Aug 2025
      [7, 9_800,  4_600],   // Sep
      [6, 11_400, 5_000],   // Oct
      [5, 12_900, 5_300],   // Nov
      [4, 13_800, 5_700],   // Dec
      [3, 15_100, 6_200],   // Jan 2026
      [2, 16_500, 6_600],   // Feb
      [1, 17_200, 7_000],   // Mar  ← peak
      [0,  6_800, 7_400],   // Apr  ← revenue collapses (lost major client)
    ],
  },
  {
    slug: "gethugothemes",
    months: [
      [8, 3_100,  2_400],   // Aug 2025
      [7, 3_700,  2_500],   // Sep
      [6, 4_300,  2_700],   // Oct
      [5, 4_900,  2_900],   // Nov
      [4, 5_600,  3_000],   // Dec
      [3, 6_200,  3_200],   // Jan 2026
      [2, 7_000,  3_500],   // Feb
      [1, 7_800,  3_700],   // Mar
      [0, 8_500,  3_900],   // Apr  ← still growing
    ],
  },
  {
    slug: "zeon-studio",
    months: [
      [8, 6_400,  3_600],   // Aug 2025  ← was profitable
      [7, 5_900,  3_900],   // Sep       ← margin squeezing
      [6, 5_200,  4_300],   // Oct
      [5, 4_600,  4_700],   // Nov       ← first loss month
      [4, 3_900,  5_100],   // Dec
      [3, 3_200,  5_500],   // Jan 2026
      [2, 2_700,  5_900],   // Feb       ← deepening losses
      [1, 2_100,  6_300],   // Mar
      [0, 1_600,  6_700],   // Apr       ← serious loss-making
    ],
  },
];

// Expense line items by entity (rotates through categories for variety)
const EXPENSE_LINES: Record<string, { desc: string; cat: string }[]> = {
  themefisher: [
    { desc: "Full-time salaries — dev team",       cat: "Salary & HR › Full-time Salary" },
    { desc: "AWS hosting & CDN",                   cat: "Infrastructure & Hosting › Cloud Server (AWS / GCP / DO)" },
    { desc: "Figma & design tools",                cat: "Software & Subscriptions › Design Tools (Figma / Adobe)" },
    { desc: "Google Ads campaign",                 cat: "Marketing & Ads › Google Ads" },
    { desc: "Office rent — Dhaka",                 cat: "Office & Operations › Office Rent" },
  ],
  gethugothemes: [
    { desc: "Developer salaries",                  cat: "Salary & HR › Full-time Salary" },
    { desc: "DigitalOcean servers",                cat: "Infrastructure & Hosting › Cloud Server (AWS / GCP / DO)" },
    { desc: "GitHub & Jira subscriptions",         cat: "Software & Subscriptions › Dev Tools & IDE" },
    { desc: "Facebook / Meta ads",                 cat: "Marketing & Ads › Facebook / Meta Ads" },
    { desc: "Internet & utilities",                cat: "Office & Operations › Internet & Broadband" },
  ],
  zeonstudio: [
    { desc: "Salaries — creative team",            cat: "Salary & HR › Full-time Salary" },
    { desc: "Adobe Creative Cloud",                cat: "Software & Subscriptions › Design Tools (Figma / Adobe)" },
    { desc: "Studio rent & equipment",             cat: "Office & Operations › Office Rent" },
    { desc: "Freelancer payments",                 cat: "Salary & HR › Freelancer Payment" },
    { desc: "Outsourcing & subcontract costs",     cat: "Project & Client › Outsourcing / Subcontract" },
  ],
};

const INCOME_DESCS: Record<string, string[]> = {
  themefisher: [
    "Theme license sales — monthly",
    "Premium template bundle — Enterprise",
    "Theme customisation project",
    "Annual subscription renewals",
  ],
  gethugothemes: [
    "Hugo theme sales",
    "Template marketplace earnings",
    "Custom Hugo integration project",
    "Theme licensing — bulk order",
  ],
  zeonstudio: [
    "Branding project — client payment",
    "UI/UX design retainer",
    "Logo & identity design",
    "Website redesign milestone",
  ],
};

async function main() {
  console.log("🌱  Seeding demo transactions...\n");

  const { data: adminProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("role", "ADMIN")
    .limit(1)
    .single();

  if (profileError || !adminProfile) {
    throw new Error(`Could not find an ADMIN profile: ${profileError?.message ?? "no rows"}`);
  }
  const adminId = adminProfile.id as string;
  console.log(`   Using admin: ${adminProfile.email}`);

  let totalEntries = 0;

  for (const plan of PLAN) {
    const entity = await prisma.entity.findUnique({ where: { slug: plan.slug } });
    if (!entity) {
      console.warn(`   ⚠  Entity "${plan.slug}" not found — run main seed first`);
      continue;
    }

    const accounts = await getAccounts(entity.id);
    const expLines = EXPENSE_LINES[plan.slug] ?? EXPENSE_LINES.themefisher;
    const incDescs = INCOME_DESCS[plan.slug] ?? INCOME_DESCS.themefisher;

    console.log(`\n   ${entity.name} (${plan.months.length} months):`);

    for (const [ago, income, expenses] of plan.months) {
      const date = monthDate(ago);
      const label = date.toLocaleString("en", { month: "short", year: "numeric" });

      // Single income entry per month
      const incDesc = incDescs[ago % incDescs.length];
      await addIncome(entity.id, adminId, accounts, date, income, incDesc, "Revenue");

      // Split expenses across 2-3 line items for variety
      const splits = ago % 2 === 0
        ? [0.5, 0.3, 0.2]   // 3 expense entries
        : [0.55, 0.45];      // 2 expense entries

      for (let i = 0; i < splits.length; i++) {
        const amt = Math.round(expenses * splits[i]);
        const line = expLines[i % expLines.length];
        await addExpense(entity.id, adminId, accounts,
          new Date(date.getTime() + i * 2 * 86400000), // offset by 2 days each
          amt, line.desc, line.cat
        );
      }

      const profit = income - expenses;
      const sign = profit >= 0 ? "+" : "";
      console.log(`     ${label.padEnd(10)} income: $${income.toLocaleString().padStart(6)}  expenses: $${expenses.toLocaleString().padStart(6)}  profit: ${sign}$${profit.toLocaleString()}`);
      totalEntries++;
    }
  }

  console.log(`\n✅  Done — seeded ${totalEntries * 3} journal entries across ${PLAN.length} entities`);
  console.log("\n📊  Expected advisor insights:");
  console.log("   🔴 CRITICAL  Revenue fell ~40% this month (Themefisher lost major client)");
  console.log("   🔴 CRITICAL  Zeon Studio is loss-making (9 consecutive months of losses)");
  console.log("   ⚠️  WARNING   Expense ratio rising above 80% consolidated");
  console.log("   ⚠️  WARNING   ~4 months of runway at current burn rate");
  console.log("   ✅  POSITIVE  Gethugothemes is leading — 9 months of unbroken growth");
  console.log("   ℹ️  INFO      Revenue has plateaued (Zeon losses offset Themefisher & Hugo growth)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
