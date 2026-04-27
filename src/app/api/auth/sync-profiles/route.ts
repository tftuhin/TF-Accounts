import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseServer) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  try {
    // Get all auth users from Supabase
    const { data: { users }, error: usersError } = await supabaseServer.auth.admin.listUsers();

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ success: true, synced: 0 });
    }

    // Get existing profiles
    const { data: existingProfiles } = await supabaseServer
      .from("profiles")
      .select("id");

    const existingIds = new Set(existingProfiles?.map((p) => p.id) || []);

    // Create profiles for users without them
    const usersToSync = users.filter((user) => !existingIds.has(user.id));

    if (usersToSync.length === 0) {
      return NextResponse.json({ success: true, synced: 0, message: "All users have profiles" });
    }

    const profilesData = usersToSync.map((user) => ({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
      role: "ENTRY_MANAGER",
      is_active: true,
    }));

    const { error: insertError } = await supabaseServer
      .from("profiles")
      .insert(profilesData);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, synced: usersToSync.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
