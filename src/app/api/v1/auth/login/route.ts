import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { lucia }  from "@/lib/auth";

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      await bcrypt.compare(password, "$2b$12$placeholder.hash.to.prevent.timing");
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const validPw = await bcrypt.compare(password, user.passwordHash);
    if (!validPw) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (user.status === "unverified") {
      return NextResponse.json({ error: "Please verify your email before signing in." }, { status: 403 });
    }

    if (user.status === "suspended") {
      return NextResponse.json({ error: "Your account has been suspended. Contact support." }, { status: 403 });
    }

    /* Lucia expects the user id as a string */
    const session = await lucia.createSession(String(user.id), {});
    const cookie  = lucia.createSessionCookie(session.id);

    return NextResponse.json(
      { success: true, data: { role: user.role } },
      {
        status: 200,
        headers: { "Set-Cookie": cookie.serialize() },
      }
    );
  } catch (err) {
    console.error("[POST /api/v1/auth/login]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
