import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Only admins can delete imports" }, { status: 403 });

  try {
    const { importBatch } = await req.json();
    if (!importBatch)
      return NextResponse.json({ error: "importBatch required" }, { status: 400 });

    // Delete journal entries from this import
    const journalEntriesDeleted = await prisma.journalEntry.deleteMany({
      where: { importBatch },
    });

    console.log(
      `Deleted import batch ${importBatch}: ${journalEntriesDeleted.count} journal entries`
    );

    revalidateTag("dashboard");
    revalidateTag("pf-balances");

    return NextResponse.json({
      success: true,
      data: {
        journalEntriesDeleted: journalEntriesDeleted.count,
        totalDeleted: journalEntriesDeleted.count,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("Delete import error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
