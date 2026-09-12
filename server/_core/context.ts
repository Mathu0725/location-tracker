import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

export const JWT_SECRET = process.env.JWT_SECRET || 'location-consent-hub-dev-secret-key-2026';

export interface UserContext {
  id: string;
  username: string;
  role: 'admin' | 'member';
}

export interface Context {
  user: UserContext | null;
  clientIp: string;
  userAgent: string;
  req: CreateExpressContextOptions['req'];
  res: CreateExpressContextOptions['res'];
}

export async function createContext({ req, res }: CreateExpressContextOptions): Promise<Context> {
  let user: UserContext | null = null;

  // Check cookie or Bearer token header
  const authHeader = req.headers.authorization;
  const token = req.cookies?.auth_token || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string; role: string };
      const [foundUser] = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
      if (foundUser) {
        user = {
          id: foundUser.id,
          username: foundUser.username,
          role: foundUser.role as 'admin' | 'member',
        };
      }
    } catch {
      // Invalid/expired token: user remains null
    }
  }

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = (req.headers['user-agent'] as string) || 'unknown';

  return {
    user,
    clientIp,
    userAgent,
    req,
    res,
  };
}
