import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Only admins can delete imports" }, { status: 403 });

  try {
    const { hoursBack = 24 } = await req.json();
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    // Find all imports created after cutoff time
    const importBatches = await prisma.journalEntry.findMany({
      where: {
        importBatch: { not: null },
        createdAt: { gte: cutoffTime },
      },
      select: { importBatch: true },
      distinct: ["importBatch"],
    });

    let totalDeleted = 0;

    // Delete each import batch
    for (const batch of importBatches) {
      if (batch.importBatch) {
        const result = await prisma.journalEntry.deleteMany({
          where: { importBatch: batch.importBatch },
        });
        totalDeleted += result.count;
        console.log(`Deleted import batch ${batch.importBatch}: ${result.count} entries`);
      }
    }

    revalidateTag("dashboard");
    revalidateTag("pf-balances");
    revalidateTag("petty-cash");

    return NextResponse.json({
      success: true,
      data: {
        totalDeleted,
        batchesDeleted: importBatches.length,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("Delete recent imports error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
