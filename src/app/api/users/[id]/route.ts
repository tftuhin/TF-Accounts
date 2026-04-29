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

    // Delete from database first (handles cascading deletes via Prisma)
    const deletedUser = await prisma.user.delete({
      where: { id },
    }).catch((err) => {
      console.error("Prisma delete error:", err);
      throw err;
    });

    console.log(`User deleted from database: ${deletedUser.id}`);

    // Then delete from Supabase auth
    const { error: authError } = await supabaseServer.auth.admin.deleteUser(id);
    if (authError) {
      console.warn(`Warning: Could not delete user from Supabase auth: ${authError.message}`);
      // Don't throw - user is already deleted from database
    }

    return NextResponse.json({ success: true, message: "Team member removed successfully" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("Delete user error:", msg, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
