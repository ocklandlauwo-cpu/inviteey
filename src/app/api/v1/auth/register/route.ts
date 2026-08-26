import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { prisma }    from "@/lib/prisma";
import { sendEmail, buildVerificationEmail } from "@/lib/email";

const schema = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  phone:    z.string().optional(),
  password: z.string().min(8).max(72),
});

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { name, email, phone, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? "12", 10);
    const hashedPw   = await bcrypt.hash(password, saltRounds);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone ?? null,
        passwordHash: hashedPw,
        role:   "organizer",
        status: "unverified",
      },
    });

    /* Create 6-char uppercase hex token */
    const token     = randomBytes(3).toString("hex").toUpperCase();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.emailVerification.create({
      data: { userId: user.id, token, expiresAt },
    });

    const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? "https://invitee.co.tz";
    const verifyUrl = `${appUrl}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
    const html      = buildVerificationEmail(name, verifyUrl);

    try {
      await sendEmail({ to: email, subject: "Verify your Invitee account", html });
    } catch (emailErr) {
      console.error("[register] email send failed:", emailErr);
    }

    return NextResponse.json(
      { success: true, message: "Account created. Check your email to verify." },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/v1/auth/register]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
