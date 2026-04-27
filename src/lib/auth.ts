import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { decodeJwt } from "jose";
import { UserRole } from "@prisma/client";
import { supabaseServer } from "./supabase-server";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

// Cached for 5 minutes — avoids a Supabase DB round-trip on every page navigation.
// Tag "user-profiles" is revalidated by /api/users PATCH when a role changes.
const fetchProfile = unstable_cache(
  async (userId: string) => {
    if (!supabaseServer) return null;
    const { data } = await supabaseServer
      .from("profiles")
      .select("full_name, role")
      .eq("id", userId)
      .single();
    return data as { full_name: string; role: UserRole } | null;
  },
  ["user-profile"],
  { revalidate: 300, tags: ["user-profiles"] },
);

// Fast path: decode the Supabase auth JWT directly from cookies without creating
// a Supabase client. jose.jwtDecode skips signature verification (we trust our
// own cookie-only session) and is purely CPU-bound — no network round-trip.
// Falls back to the full Supabase client flow for new/expired sessions.
async function getUserIdFromCookie(): Promise<{ id: string; email: string } | null> {
  try {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return null;

    // Supabase SSR stores the session in sb-<project-ref>-auth-token
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    const tokenCookie =
      cookieStore.get(`sb-${projectRef}-auth-token`)?.value ??
      cookieStore.get("sb-access-token")?.value;

    if (!tokenCookie) return null;

    // The cookie value may be a JSON array (chunked) or a plain JWT
    let accessToken: string;
    try {
      const parsed = JSON.parse(decodeURIComponent(tokenCookie));
      accessToken = parsed.access_token ?? parsed[0] ?? tokenCookie;
    } catch {
      accessToken = tokenCookie;
    }

    const payload = decodeJwt(accessToken) as { sub?: string; email?: string; exp?: number };

    // Reject expired tokens — let Supabase client handle the refresh
    if (!payload.sub || !payload.exp || payload.exp * 1000 < Date.now()) return null;

    return { id: payload.sub, email: payload.email ?? "" };
  } catch {
    return null;
  }
}

export const getSession = cache(async function getSessionImpl(): Promise<SessionUser | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServer) return null;

  // Try the fast path first — decode JWT locally, no network needed
  const fromCookie = await getUserIdFromCookie();
  if (fromCookie) {
    const profile = await fetchProfile(fromCookie.id);
    if (profile) {
      return {
        id: fromCookie.id,
        email: fromCookie.email,
        fullName: profile.full_name,
        role: profile.role,
      };
    }
  }

  // Slow path: full Supabase client (handles token refresh, new users, etc.)
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

  const profile = await fetchProfile(session.user.id);

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
});

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
