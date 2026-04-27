import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseServer) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  try {
    const { userId, role } = await req.json();
    if (!userId || !role) {
      return NextResponse.json({ error: "userId and role required" }, { status: 400 });
    }

    const validRoles = ["ADMIN", "ACCOUNTS_MANAGER", "ENTRY_MANAGER"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from("profiles")
      .update({ role })
      .eq("id", userId);

    if (error) throw error;

    return NextResponse.json({ success: true, data: { userId, role } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
