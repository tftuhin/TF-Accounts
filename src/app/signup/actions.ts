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
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (error) {
      console.error("Signup auth error:", error);
      if (error.message.includes("already registered")) {
        return { error: "Email already registered" };
      }
      return { error: error.message || "Failed to sign up" };
    }

    // Create profile in profiles table immediately
    if (data.user?.id) {
      try {
        const { data: existingProfile, error: checkError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", data.user.id)
          .maybeSingle();

        if (checkError && checkError.code !== "PGRST116") {
          console.error("Profile check error:", checkError);
        }

        if (!existingProfile) {
          const { error: profileError } = await supabase
            .from("profiles")
            .insert({
              id: data.user.id,
              email,
              full_name: fullName,
              role: "ENTRY_MANAGER",
              is_active: true,
            })
            .select()
            .single();

          if (profileError) {
            console.error("Profile creation error:", profileError);
          }
        }
      } catch (err) {
        console.error("Profile creation error:", err);
      }
    }

    // Wait a moment for the user to be created in Supabase
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Auto-login after signup (skip email confirmation)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error("Auto-login error:", signInError);
      // If auto-login fails, still show success and let user login manually
      return { success: true };
    }

    return { success: true };
  } catch (err) {
    console.error("Signup error:", err);
    return { error: err instanceof Error ? err.message : "Failed to sign up" };
  }
}

export async function acceptInviteAction(code: string, password: string) {
  if (!code || !password) {
    return { error: "Code and password are required" };
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
    // Exchange the invite code for a session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      console.error("Exchange code error:", exchangeError);
      return { error: exchangeError.message || "Invalid or expired invitation link" };
    }

    // Update the user's password
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      console.error("Update password error:", updateError);
      return { error: updateError.message || "Failed to set password" };
    }

    return { success: true };
  } catch (err) {
    console.error("Accept invite error:", err);
    return { error: err instanceof Error ? err.message : "Failed to accept invitation" };
  }
}

