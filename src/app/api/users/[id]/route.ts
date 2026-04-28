import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";

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

    // Delete from Supabase auth
    const { error: authError } = await supabaseServer.auth.admin.deleteUser(id);
    if (authError) throw new Error(authError.message);

    // Delete from profiles table
    const { error: profileError } = await supabaseServer
      .from("profiles")
      .delete()
      .eq("id", id);

    if (profileError) throw new Error(profileError.message);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
