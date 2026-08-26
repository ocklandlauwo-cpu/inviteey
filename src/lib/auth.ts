import { Lucia } from "lucia";
import { IntIdPrismaAdapter } from "./lucia-adapter";
import { prisma } from "./prisma";
import { cookies } from "next/headers";
import { cache } from "react";
import type { UserRole, UserStatus } from "@prisma/client";

const adapter = new IntIdPrismaAdapter(prisma);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === "production",
    },
  },
  getUserAttributes(attributes) {
    return {
      email:  attributes.email,
      name:   attributes.name,
      role:   attributes.role,
      status: attributes.status,
    };
  },
});

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      email:  string;
      name:   string;
      role:   UserRole;
      status: UserStatus;
    };
  }
}

export const getSession = cache(async () => {
  const cookieStore = cookies();
  const sessionId = cookieStore.get(lucia.sessionCookieName)?.value ?? null;
  if (!sessionId) return { user: null, session: null };

  const { user, session } = await lucia.validateSession(sessionId);
  try {
    const cookieStore = cookies();
    if (session?.fresh) {
      const sessionCookie = lucia.createSessionCookie(session.id);
      cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
    }
    if (!session) {
      const sessionCookie = lucia.createBlankSessionCookie();
      cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
    }
  } catch {
    // Middleware already handles cookie refresh — safe to ignore
  }

  return { user, session };
});
