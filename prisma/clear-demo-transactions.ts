/**
 * Removes all FINALIZED journal entries for demo entities so the seed can be re-run cleanly.
 * Run with: npx tsx prisma/clear-demo-transactions.ts
 */
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL } },
});

async function main() {
  const slugs = ["themefisher", "gethugothemes", "zeon-studio"];

  for (const slug of slugs) {
    const entity = await prisma.entity.findUnique({ where: { slug } });
    if (!entity) { console.log(`  skip: ${slug} not found`); continue; }

    const deleted = await prisma.journalEntry.deleteMany({
      where: { entityId: entity.id, status: "FINALIZED" },
    });
    console.log(`  ${entity.name}: deleted ${deleted.count} entries`);
  }

  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
