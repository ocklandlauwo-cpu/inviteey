import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma }    from "@/lib/prisma";
import { sendEmail, buildVerificationEmail } from "@/lib/email";

/* POST — verify using token */
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Verification token is required" }, { status: 400 });
    }

    const record = await prisma.emailVerification.findFirst({
      where: { token },
      include: { user: true },
    });

    if (!record) {
      return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
    }

    if (record.expiresAt < new Date()) {
      return NextResponse.json({ error: "Verification code has expired. Please request a new one." }, { status: 400 });
    }

    if (record.user.status !== "unverified") {
      return NextResponse.json({ success: true, message: "Email already verified." });
    }

    await prisma.$transaction([
      /* Delete the used token to prevent replay */
      prisma.emailVerification.delete({ where: { id: record.id } }),
      /* Activate the user */
      prisma.user.update({ where: { id: record.userId }, data: { status: "active" } }),
    ]);

    return NextResponse.json({ success: true, message: "Email verified successfully." });
  } catch (err) {
    console.error("[POST /api/v1/auth/verify-email]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* PUT — resend verification email */
export async function PUT(req: NextRequest) {
  try {
    const schema = z.object({ email: z.string().email() });
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Valid email required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (user && user.status === "unverified") {
      const token     = randomBytes(3).toString("hex").toUpperCase();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await prisma.emailVerification.create({
        data: { userId: user.id, token, expiresAt },
      });

      const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "https://invitee.co.tz";
      const verifyUrl = `${appUrl}/verify-email?token=${token}&email=${encodeURIComponent(user.email)}`;
      const html      = buildVerificationEmail(user.name, verifyUrl);

      try {
        await sendEmail({ to: user.email, subject: "Verify your Invitee account", html });
      } catch (e) {
        console.error("[verify-email resend] email failed:", e);
      }
    }

    /* Always return success to prevent email enumeration */
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PUT /api/v1/auth/verify-email]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
