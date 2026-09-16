import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { eq, lt, sql, and, ne } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import * as schema from '../drizzle/schema';
import { generateId } from './security/tokens';

const dbUrl = process.env.DATABASE_URL || (process.env.VERCEL ? 'file:/tmp/local.db' : 'file:local.db');
export const client = createClient({ url: dbUrl });
export const db = drizzle(client, { schema });

/**
 * Initialize database tables and demo seed data if needed
 */
export async function initDb() {
  // Create tables if they do not exist
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin' NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY NOT NULL,
      token TEXT NOT NULL UNIQUE,
      participant_name TEXT NOT NULL,
      purpose TEXT NOT NULL,
      retention_days INTEGER DEFAULT 1 NOT NULL,
      status TEXT DEFAULT 'pending' NOT NULL,
      consent_version TEXT,
      consented_at INTEGER,
      last_seen_at INTEGER,
      latest_latitude REAL,
      latest_longitude REAL,
      latest_accuracy REAL,
      latest_user_agent TEXT,
      expires_at INTEGER,
      created_by TEXT DEFAULT 'admin' NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS location_updates (
      id TEXT PRIMARY KEY NOT NULL,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      accuracy REAL NOT NULL,
      recorded_at INTEGER NOT NULL,
      user_agent TEXT
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY NOT NULL,
      session_id TEXT,
      event_type TEXT NOT NULL,
      actor_type TEXT NOT NULL,
      details TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  // Create Indexes
  try {
    await client.execute(`CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS sessions_status_idx ON sessions(status);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS sessions_created_by_idx ON sessions(created_by);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS sessions_last_seen_at_idx ON sessions(last_seen_at);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS location_updates_session_id_idx ON location_updates(session_id);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS location_updates_recorded_at_idx ON location_updates(recorded_at);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS audit_logs_session_id_idx ON audit_logs(session_id);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS audit_logs_event_type_idx ON audit_logs(event_type);`);
  } catch (e) {
    // Index creation error ignored if exists
  }

  // Seed default admin user if absent
  const adminUser = await db.select().from(schema.users).where(eq(schema.users.username, 'admin')).limit(1);
  if (adminUser.length === 0) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await db.insert(schema.users).values({
      id: generateId('usr'),
      username: 'admin',
      passwordHash,
      role: 'admin',
      createdAt: Date.now(),
    });
  }

  // Seed demo-aria session if absent for demo testing
  const demoSession = await db.select().from(schema.sessions).where(eq(schema.sessions.token, 'demo-aria')).limit(1);
  if (demoSession.length === 0) {
    const now = Date.now();
    await db.insert(schema.sessions).values({
      id: 'sess_demo_aria',
      token: 'demo-aria',
      participantName: 'Aria Montgomery',
      purpose: 'Evening safety escort & transit check-in',
      retentionDays: 1,
      status: 'pending',
      consentVersion: 'v1.0.0',
      expiresAt: now + 24 * 60 * 60 * 1000,
      createdBy: 'Care Team Lead',
      createdAt: now,
      updatedAt: now,
    });
  }
}

/**
 * Audit log recording helper. Ensures strict sanitization:
 * NEVER store raw coordinates or raw tokens in audit details.
 */
export async function recordAuditLog(params: {
  sessionId?: string;
  eventType: 'session_created' | 'consent_accepted' | 'location_received' | 'session_revoked' | 'admin_location_viewed' | 'data_purged';
  actorType: 'participant' | 'admin' | 'system';
  details?: Record<string, any>;
}) {
  try {
    const sanitizedDetails: Record<string, any> = { ...params.details };
    // Redact raw tokens or coordinates if accidentally included
    delete sanitizedDetails.token;
    delete sanitizedDetails.latitude;
    delete sanitizedDetails.longitude;
    delete sanitizedDetails.coords;

    await db.insert(schema.auditLogs).values({
      id: generateId('audit'),
      sessionId: params.sessionId,
      eventType: params.eventType,
      actorType: params.actorType,
      details: JSON.stringify(sanitizedDetails),
      createdAt: Date.now(),
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

/**
 * Retention cleanup:
 * - Purges location_updates older than retention policy
 * - Updates expired sessions to 'expired' status
 */
export async function cleanupRetentionData(): Promise<{ purgedUpdatesCount: number; expiredSessionsCount: number }> {
  const now = Date.now();

  // 1. Mark expired sessions
  const expiredSessions = await db
    .select({ id: schema.sessions.id })
    .from(schema.sessions)
    .where(
      and(
        lt(schema.sessions.expiresAt, now),
        ne(schema.sessions.status, 'revoked'),
        ne(schema.sessions.status, 'expired')
      )
    );

  let expiredSessionsCount = 0;
  for (const s of expiredSessions) {
    await db.update(schema.sessions)
      .set({ status: 'expired', updatedAt: now })
      .where(eq(schema.sessions.id, s.id));
    expiredSessionsCount++;
  }

  // 2. Delete location_updates older than retention_days for their session
  const allSessions = await db.select({
    id: schema.sessions.id,
    retentionDays: schema.sessions.retentionDays,
  }).from(schema.sessions);

  let purgedUpdatesCount = 0;
  for (const sess of allSessions) {
    const retentionCutoff = now - sess.retentionDays * 24 * 60 * 60 * 1000;
    const deleted = await db.delete(schema.locationUpdates)
      .where(
        and(
          eq(schema.locationUpdates.sessionId, sess.id),
          lt(schema.locationUpdates.recordedAt, retentionCutoff)
        )
      );
    // @ts-ignore
    purgedUpdatesCount += deleted.rowsAffected || 0;
  }

  if (purgedUpdatesCount > 0 || expiredSessionsCount > 0) {
    await recordAuditLog({
      eventType: 'data_purged',
      actorType: 'system',
      details: { purgedUpdatesCount, expiredSessionsCount },
    });
  }

  return { purgedUpdatesCount, expiredSessionsCount };
}
