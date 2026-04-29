import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log("=== LOGIN API DEBUG ===");
  console.log("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl || "NOT SET");
  console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY exists:", !!supabaseAnonKey);
  console.log("All env vars:", Object.keys(process.env).filter(k => k.includes("SUPABASE")));
  console.log("=======================");

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({
      error: "Supabase not configured",
      debug: {
        urlSet: !!supabaseUrl,
        keySet: !!supabaseAnonKey,
        message: "Check Vercel environment variables - NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set"
      }
    }, { status: 500 });
  }

  try {
    let supabaseResponse = NextResponse.next({ request });

    console.log("Creating Supabase client...");
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

    console.log("Attempting sign in with password...");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error("Supabase auth error:", error);
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
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Login API error:", errorMessage, err);
    return NextResponse.json(
      { error: `Server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
