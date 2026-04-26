import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  if (!supabaseServer)
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  try {
    const { email, fullName, role } = await req.json();

    if (!email || !fullName || !role)
      return NextResponse.json({ error: "email, fullName, role required" }, { status: 400 });

    const validRoles = ["ADMIN", "ACCOUNTS_MANAGER", "ENTRY_MANAGER"];
    if (!validRoles.includes(role))
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });

    // Create auth user with a temporary password — they'll receive invite email
    const { data: authData, error: authError } = await supabaseServer.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, role },
    });

    if (authError) throw new Error(authError.message);

    // Upsert profile
    await supabaseServer.from("profiles").upsert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role,
      is_active: true,
    });

    return NextResponse.json({ success: true, data: { id: authData.user.id, email } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  if (!supabaseServer)
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const { data: profiles, error } = await supabaseServer
    .from("profiles")
    .select("id, email, full_name, role, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    data: profiles?.map((p) => ({
      id: p.id,
      email: p.email,
      fullName: p.full_name,
      role: p.role,
      isActive: p.is_active,
    })) || [],
  });
}
