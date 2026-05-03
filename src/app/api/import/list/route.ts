import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Only admins can view imports" }, { status: 403 });

  try {
    const entries = await prisma.journalEntry.findMany({
      where: { importBatch: { not: null } },
      select: { importBatch: true, date: true, description: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    // Group by importBatch
    const grouped = new Map<string | null, typeof entries>();
    for (const entry of entries) {
      if (!grouped.has(entry.importBatch)) {
        grouped.set(entry.importBatch, []);
      }
      grouped.get(entry.importBatch)!.push(entry);
    }

    const importDetails = Array.from(grouped.entries()).map(([batch, batchEntries]) => ({
      importBatch: batch,
      count: batchEntries.length,
      latestEntry: batchEntries[0],
    }));

    return NextResponse.json({
      success: true,
      data: importDetails,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("List imports error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
