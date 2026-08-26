import type { Adapter, DatabaseSession, DatabaseUser } from "lucia";
import type { PrismaClient } from "@prisma/client";

/**
 * Lucia's session/user IDs are strings, but our `users.id` / `sessions.user_id`
 * columns are Prisma Int (autoincrement). This adapter converts at the boundary
 * so the rest of the app can keep treating Lucia user IDs as strings.
 */
export class IntIdPrismaAdapter implements Adapter {
  constructor(private prisma: PrismaClient) {}

  async getSessionAndUser(sessionId: string): Promise<[DatabaseSession | null, DatabaseUser | null]> {
    const result = await this.prisma.session.findUnique({
      where:   { id: sessionId },
      include: { user: true },
    });
    if (!result) return [null, null];
    const { user, ...session } = result;
    return [toSession(session), toUser(user)];
  }

  async getUserSessions(userId: string): Promise<DatabaseSession[]> {
    const sessions = await this.prisma.session.findMany({ where: { userId: Number(userId) } });
    return sessions.map(toSession);
  }

  async setSession(session: DatabaseSession): Promise<void> {
    await this.prisma.session.create({
      data: {
        id:        session.id,
        userId:    Number(session.userId),
        expiresAt: session.expiresAt,
      },
    });
  }

  async updateSessionExpiration(sessionId: string, expiresAt: Date): Promise<void> {
    await this.prisma.session.update({ where: { id: sessionId }, data: { expiresAt } });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { id: sessionId } });
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userId: Number(userId) } });
  }

  async deleteExpiredSessions(): Promise<void> {
    await this.prisma.session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  }
}

function toSession(session: { id: string; userId: number; expiresAt: Date }): DatabaseSession {
  return {
    id:         session.id,
    userId:     String(session.userId),
    expiresAt:  session.expiresAt,
    attributes: {},
  };
}

function toUser(user: Record<string, unknown> & { id: number }): DatabaseUser {
  const { id, ...attributes } = user;
  return { id: String(id), attributes: attributes as DatabaseUser["attributes"] };
}
