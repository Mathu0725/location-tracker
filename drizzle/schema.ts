import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  token: text('token').notNull().unique(),
  participantName: text('participant_name').notNull(),
  purpose: text('purpose').notNull(),
  retentionDays: integer('retention_days').notNull().default(1),
  status: text('status', { enum: ['pending', 'active', 'revoked', 'expired'] }).notNull().default('pending'),
  consentVersion: text('consent_version'),
  consentedAt: integer('consented_at'),
  lastSeenAt: integer('last_seen_at'),
  latestLatitude: real('latest_latitude'),
  latestLongitude: real('latest_longitude'),
  latestAccuracy: real('latest_accuracy'),
  latestUserAgent: text('latest_user_agent'),
  expiresAt: integer('expires_at'),
  createdBy: text('created_by').notNull().default('admin'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  tokenIdx: index('sessions_token_idx').on(table.token),
  statusIdx: index('sessions_status_idx').on(table.status),
  createdByIdx: index('sessions_created_by_idx').on(table.createdBy),
  lastSeenAtIdx: index('sessions_last_seen_at_idx').on(table.lastSeenAt),
}));

export const locationUpdates = sqliteTable('location_updates', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  accuracy: real('accuracy').notNull(),
  recordedAt: integer('recorded_at').notNull(),
  userAgent: text('user_agent'),
}, (table) => ({
  sessionIdIdx: index('location_updates_session_id_idx').on(table.sessionId),
  recordedAtIdx: index('location_updates_recorded_at_idx').on(table.recordedAt),
}));

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  sessionId: text('session_id'),
  eventType: text('event_type').notNull(),
  actorType: text('actor_type', { enum: ['participant', 'admin', 'system'] }).notNull(),
  details: text('details'),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  sessionIdIdx: index('audit_logs_session_id_idx').on(table.sessionId),
  eventTypeIdx: index('audit_logs_event_type_idx').on(table.eventType),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
}));

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'member'] }).notNull().default('admin'),
  createdAt: integer('created_at').notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type LocationUpdate = typeof locationUpdates.$inferSelect;
export type NewLocationUpdate = typeof locationUpdates.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
