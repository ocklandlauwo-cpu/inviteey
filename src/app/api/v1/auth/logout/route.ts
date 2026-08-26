import { NextRequest, NextResponse } from "next/server";
import { lucia }      from "@/lib/auth";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { session } = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await lucia.invalidateSession(session.id);
    const blankCookie = lucia.createBlankSessionCookie();

    return NextResponse.json(
      { success: true },
      { headers: { "Set-Cookie": blankCookie.serialize() } }
    );
  } catch (err) {
    console.error("[POST /api/v1/auth/logout]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
