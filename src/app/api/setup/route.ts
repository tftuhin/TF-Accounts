import { createDemoUsers } from "@/lib/auth";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
