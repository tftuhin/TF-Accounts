"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function signupAction(email: string, password: string, fullName: string) {
  if (!email || !password || !fullName) {
    return { error: "Email, password, and full name are required" };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: "Supabase not configured" };
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        );
      },
    },
  });

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback`,
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        return { error: "Email already registered" };
      }
      return { error: error.message || "Failed to sign up" };
    }

    // Create profile in profiles table immediately
    if (data.user?.id) {
      try {
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: data.user.id,
            email,
            full_name: fullName,
            role: "ENTRY_MANAGER",
            is_active: true,
          })
          .select();

        if (profileError) {
          console.error("Profile creation error:", profileError);
          // Don't fail signup if profile creation fails, user can still sign in
        }
      } catch (err) {
        console.error("Error creating profile:", err);
      }
    }

    return { success: true };
  } catch (err) {
    console.error("Signup error:", err);
    return { error: err instanceof Error ? err.message : "Failed to sign up" };
  }
}

export async function getGoogleOAuthUrl() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: "Supabase not configured" };
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        );
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message || "Failed to start Google sign-up" };
  }

  return { url: data.url };
}
