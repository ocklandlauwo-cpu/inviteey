import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  token:    z.string().min(1),
  password: z.string().min(8).max(72),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { token, password } = parsed.data;

    const record = await prisma.passwordReset.findFirst({
      where: { token, usedAt: null },
    });

    if (!record) {
      return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
    }

    if (record.expiresAt < new Date()) {
      return NextResponse.json({ error: "Reset link has expired. Please request a new one." }, { status: 400 });
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? "12", 10);
    const hashedPw   = await bcrypt.hash(password, saltRounds);

    await prisma.$transaction([
      prisma.passwordReset.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash: hashedPw } }),
      /* Invalidate all existing sessions on password reset */
      prisma.session.deleteMany({ where: { userId: record.userId } }),
    ]);

    return NextResponse.json({ success: true, message: "Password reset successfully." });
  } catch (err) {
    console.error("[POST /api/v1/auth/reset-password]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
