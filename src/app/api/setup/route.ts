import { createDemoUsers } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    await createDemoUsers();
    return NextResponse.json({ success: true, message: "Demo users created" });
  } catch (error) {
    console.error("Setup failed:", error);
    return NextResponse.json(
      { error: "Setup failed" },
      { status: 500 }
    );
  }
}
