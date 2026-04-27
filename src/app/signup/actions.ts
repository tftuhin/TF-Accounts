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
        console.log("Creating profile for user:", data.user.id);

        const { data: existingProfile, error: checkError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", data.user.id)
          .maybeSingle();

        if (checkError && checkError.code !== "PGRST116") {
          console.error("Error checking profile:", checkError);
        }

        // Only insert if profile doesn't exist
        if (!existingProfile) {
          const { data: insertedProfile, error: profileError } = await supabase
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
          } else {
            console.log("Profile created successfully:", insertedProfile);
          }
        } else {
          console.log("Profile already exists");
        }
      } catch (err) {
        console.error("Error in profile creation:", err);
      }
    }

    return { success: true };
  } catch (err) {
    console.error("Signup error:", err);
    return { error: err instanceof Error ? err.message : "Failed to sign up" };
  }
}

