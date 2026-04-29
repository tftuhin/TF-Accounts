import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log("Supabase URL:", supabaseUrl);
  console.log("Supabase Key exists:", !!supabaseAnonKey);

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase configuration");
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  try {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error("Login error:", error);
      if (error.message.includes("Invalid login credentials")) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }
      if (error.message.includes("Email not confirmed")) {
        return NextResponse.json({ error: "Please verify your email before logging in" }, { status: 401 });
      }
      return NextResponse.json({ error: error.message || "Login failed" }, { status: 401 });
    }

    if (!data.session) {
      console.error("No session created after login");
      return NextResponse.json({ error: "Login failed - unable to create session" }, { status: 401 });
    }

    console.log("Login successful, session created for:", email);

    // Return response with cookies from supabaseResponse
    supabaseResponse = NextResponse.json({ success: true }, { headers: supabaseResponse.headers });

    return supabaseResponse;
  } catch (err) {
    console.error("Login API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Login failed" },
      { status: 500 }
    );
  }
}
