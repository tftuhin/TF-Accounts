import { supabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST() {
  if (!supabaseServer) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }
  await supabaseServer.auth.signOut();
  return NextResponse.json({ success: true });
}
