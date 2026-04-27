import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { UserRole } from "@prisma/client";
import { supabaseServer } from "./supabase-server";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export async function getSession(): Promise<SessionUser | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServer) return null;

  const cookieStore = await cookies();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — middleware handles session refresh
        }
      },
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return null;

  const { data: profile } = await supabaseServer
    .from("profiles")
    .select("full_name, role")
    .eq("id", session.user.id)
    .single();

  // If profile doesn't exist, create one automatically
  if (!profile) {
    try {
      const fullName = session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User";
      const { data: newProfile, error: insertError } = await supabaseServer
        .from("profiles")
        .insert({
          id: session.user.id,
          email: session.user.email,
          full_name: fullName,
          role: "ENTRY_MANAGER",
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating profile on login:", insertError);
        return null;
      }

      return {
        id: session.user.id,
        email: session.user.email!,
        fullName: newProfile?.full_name || fullName,
        role: newProfile?.role || "ENTRY_MANAGER",
      };
    } catch (err) {
      console.error("Error in profile creation:", err);
      return null;
    }
  }

  return {
    id: session.user.id,
    email: session.user.email!,
    fullName: profile.full_name,
    role: profile.role,
  };
}

export async function createDemoUsers() {
  if (!supabaseServer) {
    throw new Error("Supabase not configured");
  }

  const demoUsers = [
    { email: "admin@teamosis.com", password: "admin@teamosis2025", fullName: "Admin User", role: "ADMIN" as const },
    { email: "accounts@teamosis.com", password: "manager@2025", fullName: "Accounts Manager", role: "ACCOUNTS_MANAGER" as const },
    { email: "entry@teamosis.com", password: "entry@2025", fullName: "Entry Manager", role: "ENTRY_MANAGER" as const },
  ];

  for (const user of demoUsers) {
    const { data: existing } = await supabaseServer
      .from("profiles")
      .select("id")
      .eq("email", user.email)
      .single();

    if (existing) continue;

    const { data: authUser, error: authError } = await supabaseServer.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
    });

    if (authError) {
      console.error(`Failed to create user ${user.email}:`, authError);
      continue;
    }

    await supabaseServer
      .from("profiles")
      .insert({
        id: authUser.user.id,
        email: user.email,
        full_name: user.fullName,
        role: user.role,
      });
  }
}
