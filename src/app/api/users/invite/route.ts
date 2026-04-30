import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInvitationEmail } from "@/lib/email";
import crypto from "crypto";

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { email, fullName, role } = await req.json();

    if (!email || !fullName || !role)
      return NextResponse.json({ error: "email, fullName, role required" }, { status: 400 });

    const validRoles = ["ADMIN", "ACCOUNTS_MANAGER", "ENTRY_MANAGER"];
    if (!validRoles.includes(role))
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    // Check if invitation already exists
    const existingInvitation = await prisma.invitation.findUnique({ where: { email } });
    
    // Generate token and expiry for new/updated invitation
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    let invitation;
    if (existingInvitation) {
      // Update existing invitation (handles both pending and accepted cases)
      invitation = await prisma.invitation.update({
        where: { email },
        data: {
          role,
          token,
          expiresAt,
          acceptedAt: null, // Reset if previously accepted
          createdBy: session.id,
        },
      });
    } else {
      // Create new invitation
      invitation = await prisma.invitation.create({
        data: {
          email,
          role,
          token,
          expiresAt,
          createdBy: session.id,
        },
      });
    }

    // Generate signup link with token
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tf-accounts.vercel.app";
    const signupLink = `${appUrl}/signup?token=${token}&email=${encodeURIComponent(email)}`;

    // Send invitation email
    console.log(`Sending invitation to ${email}. Signup link: ${signupLink}`);
    const emailResult = await sendInvitationEmail(email, fullName, signupLink, role);

    // Revalidate the team members cache so settings page shows the new invitation
    revalidateTag("user-profiles");

    return NextResponse.json({
      success: true,
      data: {
        id: invitation.id,
        email,
        role,
        message: emailResult.success
          ? (existingInvitation ? "Invitation resent successfully" : "Invitation sent successfully")
          : "Invitation created but email failed to send",
        emailSent: emailResult.success,
        isResend: !!existingInvitation,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("Invite error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    // Get pending invitations
    const invitations = await prisma.invitation.findMany({
      where: { acceptedAt: null },
      orderBy: { createdAt: "desc" },
    });

    // Get accepted users (profiles)
    const profiles = await prisma.user.findMany({
      orderBy: { email: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        pending: invitations.map((inv) => ({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          invitedAt: inv.createdAt,
          expiresAt: inv.expiresAt,
        })),
        users: profiles.map((p) => ({
          id: p.id,
          email: p.email,
          fullName: p.fullName,
          role: p.role,
          isActive: p.isActive,
        })),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { invitationId } = await req.json();

    if (!invitationId)
      return NextResponse.json({ error: "invitationId required" }, { status: 400 });

    // Check if invitation exists first
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    await prisma.invitation.delete({ where: { id: invitationId } });

    // Revalidate the team members cache so settings page shows the update
    revalidateTag("user-profiles");

    return NextResponse.json({
      success: true,
      message: "Invitation removed",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("Delete invitation error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
