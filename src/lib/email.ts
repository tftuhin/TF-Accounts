import { Resend } from "resend";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

export async function sendInvitationEmail(
  email: string,
  fullName: string,
  signupLink: string,
  role: string
) {
  try {
    const resend = getResend();
    if (!resend) {
      console.warn("RESEND_API_KEY not configured - skipping email");
      return { success: false, message: "Email service not configured" };
    }

    const roleDisplay = role
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

    const result = await resend.emails.send({
      from: "invitations@teamosis.dev",
      to: email,
      subject: "You've been invited to Teamosis Ledger",
      html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
      .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
      .button { background: #667eea; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; display: inline-block; margin: 20px 0; font-weight: 600; }
      .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
      .role-badge { background: #e0e7ff; color: #667eea; padding: 8px 12px; border-radius: 4px; display: inline-block; margin: 10px 0; font-weight: 600; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Welcome to Teamosis Ledger</h1>
      </div>
      <div class="content">
        <p>Hi ${fullName},</p>

        <p>You've been invited to join Teamosis Ledger with the role of <span class="role-badge">${roleDisplay}</span></p>

        <p>Click the button below to create your account and get started:</p>

        <div style="text-align: center;">
          <a href="${signupLink}" class="button">Accept Invitation</a>
        </div>

        <p style="font-size: 14px; color: #666;">Or copy and paste this link in your browser:</p>
        <p style="font-size: 13px; word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px; color: #666;">
          ${signupLink}
        </p>

        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          This invitation link will expire in 7 days.
        </p>
      </div>
      <div class="footer">
        <p>© 2026 Teamosis. All rights reserved.</p>
      </div>
    </div>
  </body>
</html>
      `,
    });

    if (result.error) {
      console.error("Email send error:", result.error);
      return { success: false, message: result.error.message };
    }

    return { success: true, message: "Email sent successfully" };
  } catch (err) {
    console.error("Email service error:", err);
    return { success: false, message: "Failed to send email" };
  }
}
