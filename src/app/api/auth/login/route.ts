import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error("Login error:", error.message);
      if (error.message.includes("Invalid login credentials")) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }
      if (error.message.includes("Email not confirmed")) {
        return NextResponse.json({ error: "Please verify your email before logging in" }, { status: 401 });
      }
      return NextResponse.json({ error: error.message || "Login failed" }, { status: 401 });
    }

    if (!data.session) {
      return NextResponse.json({ error: "Login failed - unable to create session" }, { status: 401 });
    }

    console.log("Login successful for:", email);

    const response = NextResponse.json({ success: true });

    // Set Supabase auth cookie in the format getSession() expects
    // Cookie name: sb-${projectRef}-auth-token
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    const sessionData = {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      expires_at: data.session.expires_at,
      token_type: "bearer",
      type: "session",
    };

    response.cookies.set(`sb-${projectRef}-auth-token`, JSON.stringify(sessionData), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/"
    });

    return response;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Login API error:", errorMessage);
    return NextResponse.json({ error: errorMessage || "Login failed" }, { status: 500 });
  }
}
