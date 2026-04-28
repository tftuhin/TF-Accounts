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
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/signup`,
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

  try {
    // Get all auth users to determine pending status
    const { data: authUsers, error: authError } = await supabaseServer.auth.admin.listUsers();
    if (authError) throw authError;

    // Get profiles
    const { data: profiles, error: profileError } = await supabaseServer
      .from("profiles")
      .select("id, email, full_name, role, is_active, created_at")
      .order("created_at", { ascending: false });

    if (profileError) throw profileError;

    // Map profiles with pending status from auth
    const authUserMap = new Map(authUsers.map((u: any) => [u.email, u]));

    return NextResponse.json({
      success: true,
      data: (profiles || []).map((p) => {
        const authUser = authUserMap.get(p.email) as any;
        const isPending = !!authUser?.invited_at && !authUser?.confirmed_at;
        return {
          id: p.id,
          email: p.email,
          fullName: p.full_name,
          role: p.role,
          isActive: p.is_active,
          isPending,
          invitedAt: authUser?.invited_at || null,
        };
      }),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
