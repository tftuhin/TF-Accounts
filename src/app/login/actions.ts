"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function loginAction(email: string, password: string) {
  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: "Supabase not configured" };
  }

  try {
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

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error("Login error:", error);
      if (error.message.includes("Invalid login credentials")) {
        return { error: "Invalid email or password" };
      }
      if (error.message.includes("Email not confirmed")) {
        return { error: "Please verify your email before logging in" };
      }
      return { error: error.message || "Login failed" };
    }

    if (!data.session) {
      console.error("No session created after login");
      return { error: "Login failed - unable to create session" };
    }

    console.log("Login successful, session created for:", email);
    return { success: true };
  } catch (err) {
    console.error("Login action error:", err);
    return { error: err instanceof Error ? err.message : "Login failed" };
  }
}
