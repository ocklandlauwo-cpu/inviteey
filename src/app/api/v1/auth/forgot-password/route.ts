import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma }    from "@/lib/prisma";
import { sendEmail, buildPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const schema = z.object({ email: z.string().email() });
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Valid email required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

    if (user && user.status === "active") {
      const token     = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.passwordReset.create({
        data: { userId: user.id, token, expiresAt },
      });

      const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? "https://invitee.co.tz";
      const resetUrl = `${appUrl}/reset-password?token=${token}`;
      const html     = buildPasswordResetEmail(user.name, resetUrl);

      try {
        await sendEmail({ to: user.email, subject: "Reset your Invitee password", html });
      } catch (e) {
        console.error("[forgot-password] email failed:", e);
      }
    }

    /* Always return success to prevent email enumeration */
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/v1/auth/forgot-password]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
