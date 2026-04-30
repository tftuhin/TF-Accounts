import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  // One-time setup endpoint - creates invitations table if it doesn't exist
  // No auth required as this is a one-time initialization

  try {
    // Try to create the invitations table if it doesn't exist
    const result = await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.invitations (
        id UUID NOT NULL DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        role user_role NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP(3) NOT NULL,
        accepted_at TIMESTAMP(3),
        created_by TEXT NOT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT invitations_pkey PRIMARY KEY (id)
      );

      CREATE UNIQUE INDEX IF NOT EXISTS invitations_email_key ON public.invitations(email);
      CREATE UNIQUE INDEX IF NOT EXISTS invitations_token_key ON public.invitations(token);
      CREATE INDEX IF NOT EXISTS invitations_email_idx ON public.invitations(email);
      CREATE INDEX IF NOT EXISTS invitations_token_idx ON public.invitations(token);
    `);

    return NextResponse.json({
      success: true,
      message: "Invitations table created successfully",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("Setup error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
