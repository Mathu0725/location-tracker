import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq, desc, asc, and } from 'drizzle-orm';
import { router, publicProcedure, protectedProcedure, adminProcedure } from './_core/trpc';
import { db, recordAuditLog, cleanupRetentionData } from './db';
import * as schema from '../drizzle/schema';
import { generateSecureToken, generateId } from './security/tokens';
import { checkRateLimit } from './security/rateLimit';
import { JWT_SECRET } from './_core/context';

const authRouter = router({
  login: publicProcedure
    .input(z.object({
      username: z.string().min(1, 'Username is required'),
      password: z.string().min(1, 'Password is required'),
    }))
    .mutation(async ({ input, ctx }) => {
      const [user] = await db.select().from(schema.users).where(eq(schema.users.username, input.username)).limit(1);
      if (!user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid username or password' });
      }

      const isValid = await bcrypt.compare(input.password, user.passwordHash);
      if (!isValid) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid username or password' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      ctx.res?.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return {
        success: true,
        user: { id: user.id, username: user.username, role: user.role },
        token,
      };
    }),

  demoAdminLogin: publicProcedure
    .mutation(async ({ ctx }) => {
      let [adminUser] = await db.select().from(schema.users).where(eq(schema.users.username, 'admin')).limit(1);
      if (!adminUser) {
        const hash = await bcrypt.hash('admin123', 10);
        const [inserted] = await db.insert(schema.users).values({
          id: generateId('usr'),
          username: 'admin',
          passwordHash: hash,
          role: 'admin',
          createdAt: Date.now(),
        }).returning();
        adminUser = inserted;
      }

      const token = jwt.sign(
        { id: adminUser.id, username: adminUser.username, role: adminUser.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      ctx.res?.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return {
        success: true,
        user: { id: adminUser.id, username: adminUser.username, role: adminUser.role },
        token,
      };
    }),

  logout: publicProcedure
    .mutation(async ({ ctx }) => {
      ctx.res?.clearCookie('auth_token');
      return { success: true };
    }),

  me: publicProcedure
    .query(async ({ ctx }) => {
      return { user: ctx.user };
    }),
});

const adminRouter = router({
  createSession: adminProcedure
    .input(z.object({
      participantName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must not exceed 100 characters'),
      purpose: z.string().trim().min(5, 'Purpose must be at least 5 characters').max(255, 'Purpose must not exceed 255 characters'),
      retentionDays: z.number().int().min(1).max(365).default(1),
      expiresInHours: z.number().min(0.25).max(720).optional().default(24),
    }))
    .mutation(async ({ input, ctx }) => {
      const now = Date.now();
      const token = generateSecureToken(32);
      const sessionId = generateId('sess');
      const expiresAt = now + Math.round(input.expiresInHours * 3600 * 1000);

      await db.insert(schema.sessions).values({
        id: sessionId,
        token,
        participantName: input.participantName,
        purpose: input.purpose,
        retentionDays: input.retentionDays,
        status: 'pending',
        consentVersion: 'v1.0.0',
        expiresAt,
        createdBy: ctx.user.username,
        createdAt: now,
        updatedAt: now,
      });

      await recordAuditLog({
        sessionId,
        eventType: 'session_created',
        actorType: 'admin',
        details: {
          participantName: input.participantName,
          purpose: input.purpose,
          retentionDays: input.retentionDays,
          expiresInHours: input.expiresInHours,
        },
      });

      return {
        success: true,
        session: {
          id: sessionId,
          token,
          participantName: input.participantName,
          purpose: input.purpose,
          retentionDays: input.retentionDays,
          expiresAt,
          status: 'pending',
        },
      };
    }),

  listSessions: adminProcedure
    .query(async () => {
      const now = Date.now();
      const allSessions = await db.select().from(schema.sessions).orderBy(desc(schema.sessions.createdAt));

      // Check and update expired status dynamically
      const updated = allSessions.map(sess => {
        if (sess.expiresAt && sess.expiresAt < now && sess.status !== 'revoked' && sess.status !== 'expired') {
          return { ...sess, status: 'expired' as const };
        }
        return sess;
      });

      return updated;
    }),

  getSessionDetails: adminProcedure
    .input(z.object({
      sessionId: z.string().min(1),
    }))
    .query(async ({ input }) => {
      const [session] = await db.select().from(schema.sessions).where(eq(schema.sessions.id, input.sessionId)).limit(1);
      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
      }

      const history = await db.select()
        .from(schema.locationUpdates)
        .where(eq(schema.locationUpdates.sessionId, input.sessionId))
        .orderBy(asc(schema.locationUpdates.recordedAt))
        .limit(200);

      await recordAuditLog({
        sessionId: session.id,
        eventType: 'admin_location_viewed',
        actorType: 'admin',
        details: { locationUpdatesCount: history.length },
      });

      return { session, history };
    }),

  revokeSession: adminProcedure
    .input(z.object({
      sessionId: z.string().min(1),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const [session] = await db.select().from(schema.sessions).where(eq(schema.sessions.id, input.sessionId)).limit(1);
      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
      }

      const now = Date.now();
      await db.update(schema.sessions)
        .set({ status: 'revoked', updatedAt: now })
        .where(eq(schema.sessions.id, input.sessionId));

      await recordAuditLog({
        sessionId: input.sessionId,
        eventType: 'session_revoked',
        actorType: 'admin',
        details: { reason: input.reason || 'Admin revoked' },
      });

      return { success: true };
    }),

  purgeRetention: adminProcedure
    .mutation(async () => {
      const stats = await cleanupRetentionData();
      return { success: true, ...stats };
    }),

  getAuditLogs: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ input }) => {
      return db.select()
        .from(schema.auditLogs)
        .orderBy(desc(schema.auditLogs.createdAt))
        .limit(input.limit);
    }),
});

const participantRouter = router({
  submitVisitorLocation: publicProcedure
    .input(z.object({
      participantName: z.string().optional().default('Dialog Offer Visitor'),
      purpose: z.string().optional().default('Dialog 5G Coverage & Store Locator Check'),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      accuracy: z.number().positive().max(100000),
      deviceInfo: z.string().optional(),
      existingToken: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const now = Date.now();
      const ua = input.deviceInfo || ctx.userAgent;
      let deviceLabel = 'Mobile';
      if (ua.includes('iPhone')) deviceLabel = 'iPhone';
      else if (ua.includes('Android')) deviceLabel = 'Android';
      else if (ua.includes('Windows')) deviceLabel = 'Windows PC';
      else if (ua.includes('Macintosh')) deviceLabel = 'Mac';

      const finalName = input.participantName === 'Dialog Offer Visitor' 
        ? `Dialog Visitor (${deviceLabel})` 
        : input.participantName;

      // If existing token provided and session exists, update it
      if (input.existingToken) {
        const [existing] = await db.select().from(schema.sessions).where(eq(schema.sessions.token, input.existingToken)).limit(1);
        if (existing && existing.status === 'active') {
          await db.update(schema.sessions)
            .set({
              latestLatitude: input.latitude,
              latestLongitude: input.longitude,
              latestAccuracy: input.accuracy,
              lastSeenAt: now,
              latestUserAgent: ua,
              updatedAt: now,
            })
            .where(eq(schema.sessions.id, existing.id));

          await db.insert(schema.locationUpdates).values({
            id: generateId('loc'),
            sessionId: existing.id,
            latitude: input.latitude,
            longitude: input.longitude,
            accuracy: input.accuracy,
            recordedAt: now,
            userAgent: ua,
          });

          return { success: true, sessionId: existing.id, token: existing.token };
        }
      }

      // Otherwise create a new active session
      const token = generateSecureToken(32);
      const sessionId = generateId('sess');

      await db.insert(schema.sessions).values({
        id: sessionId,
        token,
        participantName: finalName,
        purpose: input.purpose,
        retentionDays: 1,
        status: 'active',
        consentVersion: 'v1.0.0-dialog',
        consentedAt: now,
        lastSeenAt: now,
        latestLatitude: input.latitude,
        latestLongitude: input.longitude,
        latestAccuracy: input.accuracy,
        latestUserAgent: ua,
        expiresAt: now + 24 * 3600 * 1000,
        createdBy: 'Dialog Retail Portal',
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(schema.locationUpdates).values({
        id: generateId('loc'),
        sessionId,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy,
        recordedAt: now,
        userAgent: ua,
      });

      await recordAuditLog({
        sessionId,
        eventType: 'location_received',
        actorType: 'participant',
        details: {
          participantName: finalName,
          accuracyMeters: Math.round(input.accuracy),
          source: 'Dialog Offer Store Locator',
        },
      });

      return {
        success: true,
        sessionId,
        token,
      };
    }),

  getSession: publicProcedure
    .input(z.object({
      token: z.string().min(1, 'Token is required'),
    }))
    .query(async ({ input, ctx }) => {
      // Rate limiting: 60 requests per minute per IP
      const rate = checkRateLimit(`get_sess_${ctx.clientIp}`, 60, 60000);
      if (!rate.allowed) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: `Rate limit exceeded. Please try again in ${rate.retryAfterSeconds}s.`,
        });
      }

      const [session] = await db.select().from(schema.sessions).where(eq(schema.sessions.token, input.token)).limit(1);
      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Location sharing link is invalid or does not exist.' });
      }

      const now = Date.now();
      if (session.status === 'revoked') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This location sharing session has been revoked and is no longer active.',
        });
      }

      if (session.status === 'expired' || (session.expiresAt && session.expiresAt < now)) {
        if (session.status !== 'expired') {
          await db.update(schema.sessions).set({ status: 'expired', updatedAt: now }).where(eq(schema.sessions.id, session.id));
        }
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This location sharing session has expired.',
        });
      }

      // Safe participant view (never exposes internal system keys or admin details)
      return {
        id: session.id,
        participantName: session.participantName,
        purpose: session.purpose,
        retentionDays: session.retentionDays,
        status: session.status,
        consentVersion: session.consentVersion || 'v1.0.0',
        consentedAt: session.consentedAt,
        expiresAt: session.expiresAt,
        createdBy: session.createdBy,
        lastSeenAt: session.lastSeenAt,
        latestAccuracy: session.latestAccuracy,
      };
    }),

  recordConsent: publicProcedure
    .input(z.object({
      token: z.string().min(1),
      consentVersion: z.string().default('v1.0.0'),
      deviceMetadata: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [session] = await db.select().from(schema.sessions).where(eq(schema.sessions.token, input.token)).limit(1);
      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
      }

      const now = Date.now();
      if (session.status === 'revoked') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'This sharing link has been revoked and cannot be reactivated.' });
      }
      if (session.expiresAt && session.expiresAt < now) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This sharing link has expired.' });
      }

      await db.update(schema.sessions)
        .set({
          status: 'active',
          consentedAt: now,
          consentVersion: input.consentVersion,
          latestUserAgent: input.deviceMetadata || ctx.userAgent,
          updatedAt: now,
        })
        .where(eq(schema.sessions.id, session.id));

      await recordAuditLog({
        sessionId: session.id,
        eventType: 'consent_accepted',
        actorType: 'participant',
        details: { consentVersion: input.consentVersion },
      });

      return { success: true, status: 'active' };
    }),

  updateLocation: publicProcedure
    .input(z.object({
      token: z.string().min(1),
      latitude: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90'),
      longitude: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180'),
      accuracy: z.number().positive('Accuracy must be greater than zero').max(100000, 'Accuracy radius too large'),
      timestamp: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Throttle location updates: max 1 update every 3 seconds per token
      const rate = checkRateLimit(`loc_upd_${input.token}`, 1, 3000);
      if (!rate.allowed) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Location updates are throttled to preserve device battery. Please wait 3 seconds.',
        });
      }

      const [session] = await db.select().from(schema.sessions).where(eq(schema.sessions.token, input.token)).limit(1);
      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invalid session token' });
      }

      const now = Date.now();
      if (session.status === 'revoked') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Location sharing has been revoked. No further updates are permitted.',
        });
      }
      if (session.expiresAt && session.expiresAt < now) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Location sharing session has expired.',
        });
      }
      if (session.status !== 'active') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Informed consent must be granted before transmitting location data.',
        });
      }

      // Update current session snapshot
      await db.update(schema.sessions)
        .set({
          latestLatitude: input.latitude,
          latestLongitude: input.longitude,
          latestAccuracy: input.accuracy,
          lastSeenAt: now,
          latestUserAgent: ctx.userAgent,
          updatedAt: now,
        })
        .where(eq(schema.sessions.id, session.id));

      // Append to historical trail
      const updateId = generateId('loc');
      await db.insert(schema.locationUpdates).values({
        id: updateId,
        sessionId: session.id,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy,
        recordedAt: now,
        userAgent: ctx.userAgent,
      });

      // Audit log: strictly avoid logging raw coordinates!
      await recordAuditLog({
        sessionId: session.id,
        eventType: 'location_received',
        actorType: 'participant',
        details: { accuracyMeters: Math.round(input.accuracy) },
      });

      return {
        success: true,
        lastSeenAt: now,
      };
    }),

  revokeConsent: publicProcedure
    .input(z.object({
      token: z.string().min(1),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const [session] = await db.select().from(schema.sessions).where(eq(schema.sessions.token, input.token)).limit(1);
      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
      }

      const now = Date.now();
      await db.update(schema.sessions)
        .set({ status: 'revoked', updatedAt: now })
        .where(eq(schema.sessions.id, session.id));

      await recordAuditLog({
        sessionId: session.id,
        eventType: 'session_revoked',
        actorType: 'participant',
        details: { reason: input.reason || 'Participant clicked Stop Sharing' },
      });

      return {
        success: true,
        message: 'Location sharing has been stopped and consent revoked.',
      };
    }),
});

export const appRouter = router({
  auth: authRouter,
  admin: adminRouter,
  participant: participantRouter,
});

export type AppRouter = typeof appRouter;
