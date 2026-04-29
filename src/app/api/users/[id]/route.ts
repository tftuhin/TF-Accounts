import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  if (!supabaseServer)
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    console.log(`Attempting to delete user: ${id}`);

    // Try to delete from database first (handles cascading deletes via Prisma)
    let deletedFromDb = false;
    try {
      const deletedUser = await prisma.user.delete({
        where: { id },
      });
      console.log(`User deleted from database: ${deletedUser.id}`);
      deletedFromDb = true;
    } catch (prismaErr: unknown) {
      const errorMsg = prismaErr instanceof Error ? prismaErr.message : String(prismaErr);
      // Check if it's a "not found" error
      if (errorMsg.includes("No record was found") || errorMsg.includes("not found")) {
        console.log(`User not found in database: ${id}, attempting to delete from auth only`);
      } else {
        console.error("Prisma delete error:", errorMsg);
        throw prismaErr;
      }
    }

    // Then delete from Supabase auth (delete regardless of database status)
    const { error: authError } = await supabaseServer.auth.admin.deleteUser(id);
    if (authError) {
      console.warn(`Warning: Could not delete user from Supabase auth: ${authError.message}`);
      // Don't throw - at least one deletion succeeded
    }

    const message = deletedFromDb
      ? "Team member removed successfully"
      : "Team member removed from authentication";

    return NextResponse.json({ success: true, message });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("Delete user error:", msg, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
