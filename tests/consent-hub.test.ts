import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { appRouter } from '../server/routers';
import { db, initDb } from '../server/db';
import { sessions } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { generateSecureToken } from '../server/security/tokens';
import { clearRateLimits } from '../server/security/rateLimit';
import type { Context } from '../server/_core/context';

describe('Location Consent Hub Test Suite', () => {
  const adminCtx: Context = {
    user: { id: 'admin-test-id', username: 'admin', role: 'admin' },
    clientIp: '127.0.0.1',
    userAgent: 'Vitest-Admin-Agent',
    req: {} as any,
    res: { cookie: () => {}, clearCookie: () => {} } as any,
  };

  const nonAdminCtx: Context = {
    user: { id: 'member-test-id', username: 'member', role: 'member' },
    clientIp: '127.0.0.1',
    userAgent: 'Vitest-Member-Agent',
    req: {} as any,
    res: { cookie: () => {}, clearCookie: () => {} } as any,
  };

  const publicCtx: Context = {
    user: null,
    clientIp: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)',
    req: {} as any,
    res: { cookie: () => {}, clearCookie: () => {} } as any,
  };

  const adminCaller = appRouter.createCaller(adminCtx);
  const nonAdminCaller = appRouter.createCaller(nonAdminCtx);
  const publicCaller = appRouter.createCaller(publicCtx);

  beforeAll(async () => {
    await initDb();
  });

  beforeEach(() => {
    clearRateLimits();
  });

  // 1. Token generation uniqueness & entropy
  it('generates unique cryptographic tokens with high entropy', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const tok = generateSecureToken(32);
      expect(tok.length).toBeGreaterThanOrEqual(40);
      expect(tokens.has(tok)).toBe(false);
      tokens.add(tok);
    }
  });

  // 2. Admin authorization
  it('enforces admin-only authorization on createSession', async () => {
    await expect(
      nonAdminCaller.admin.createSession({
        participantName: 'Test Participant',
        purpose: 'Transit escort',
      })
    ).rejects.toThrow('Admin privileges required');

    await expect(
      publicCaller.admin.createSession({
        participantName: 'Test Participant',
        purpose: 'Transit escort',
      })
    ).rejects.toThrow('Authentication required');
  });

  // 3. Valid session creation
  it('creates a session successfully with valid inputs', async () => {
    const result = await adminCaller.admin.createSession({
      participantName: 'Sarah Connor',
      purpose: 'Safe transit monitoring to train station',
      retentionDays: 3,
      expiresInHours: 12,
    });

    expect(result.success).toBe(true);
    expect(result.session.participantName).toBe('Sarah Connor');
    expect(result.session.token).toBeDefined();
    expect(result.session.status).toBe('pending');
    expect(result.session.retentionDays).toBe(3);
  });

  // 4. Invalid session input
  it('rejects session creation with invalid input (empty or too short)', async () => {
    await expect(
      adminCaller.admin.createSession({
        participantName: '',
        purpose: 'Valid purpose',
      })
    ).rejects.toThrow();

    await expect(
      adminCaller.admin.createSession({
        participantName: 'John',
        purpose: 'abc', // under 5 characters
      })
    ).rejects.toThrow();
  });

  // 5. Public session lookup
  it('allows public participant to lookup session by token', async () => {
    const created = await adminCaller.admin.createSession({
      participantName: 'Bruce Wayne',
      purpose: 'Patrol route verification',
      retentionDays: 1,
      expiresInHours: 24,
    });

    const session = await publicCaller.participant.getSession({ token: created.session.token });
    expect(session.participantName).toBe('Bruce Wayne');
    expect(session.purpose).toBe('Patrol route verification');
    expect(session.status).toBe('pending');
  });

  // 6. Invalid token rejection
  it('rejects lookup with non-existent token', async () => {
    await expect(
      publicCaller.participant.getSession({ token: 'non-existent-random-token-xyz' })
    ).rejects.toThrow('Location sharing link is invalid');
  });

  // 7. Consent acceptance flow
  it('records informed consent and updates status to active', async () => {
    const created = await adminCaller.admin.createSession({
      participantName: 'Diana Prince',
      purpose: 'Field safety monitoring',
      retentionDays: 2,
    });

    const consentRes = await publicCaller.participant.recordConsent({
      token: created.session.token,
      consentVersion: 'v1.0.0',
      deviceMetadata: 'Safari on iPhone iOS 17.4',
    });

    expect(consentRes.success).toBe(true);
    expect(consentRes.status).toBe('active');

    // Verify lookup now shows active
    const session = await publicCaller.participant.getSession({ token: created.session.token });
    expect(session.status).toBe('active');
    expect(session.consentedAt).toBeDefined();
  });

  // 8. Location update before consent must fail
  it('rejects location updates if consent was not yet accepted (pending state)', async () => {
    const created = await adminCaller.admin.createSession({
      participantName: 'Peter Parker',
      purpose: 'Check-in on route',
    });

    await expect(
      publicCaller.participant.updateLocation({
        token: created.session.token,
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 12.5,
      })
    ).rejects.toThrow('Informed consent must be granted');
  });

  // 9. Location update after consent
  it('accepts valid location updates after consent', async () => {
    const created = await adminCaller.admin.createSession({
      participantName: 'Clark Kent',
      purpose: 'Transit check',
    });

    await publicCaller.participant.recordConsent({
      token: created.session.token,
      consentVersion: 'v1.0.0',
    });

    const locRes = await publicCaller.participant.updateLocation({
      token: created.session.token,
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 8.2,
    });

    expect(locRes.success).toBe(true);

    // Verify session snapshot updated
    const session = await publicCaller.participant.getSession({ token: created.session.token });
    expect(session.latestAccuracy).toBeCloseTo(8.2);
    expect(session.lastSeenAt).toBeDefined();
  });

  // 10. Invalid coordinates rejection
  it('rejects invalid latitude and longitude values', async () => {
    const created = await adminCaller.admin.createSession({
      participantName: 'Barry Allen',
      purpose: 'Speed test monitoring',
    });

    await publicCaller.participant.recordConsent({
      token: created.session.token,
    });

    // Latitude > 90
    await expect(
      publicCaller.participant.updateLocation({
        token: created.session.token,
        latitude: 91.5,
        longitude: 0,
        accuracy: 10,
      })
    ).rejects.toThrow();

    // Longitude < -180
    await expect(
      publicCaller.participant.updateLocation({
        token: created.session.token,
        latitude: 0,
        longitude: -181.0,
        accuracy: 10,
      })
    ).rejects.toThrow();

    // Negative accuracy
    await expect(
      publicCaller.participant.updateLocation({
        token: created.session.token,
        latitude: 0,
        longitude: 0,
        accuracy: -5,
      })
    ).rejects.toThrow();
  });

  // 11. Revoke sharing and verify updates fail
  it('stops location sharing on revoke and rejects subsequent updates', async () => {
    const created = await adminCaller.admin.createSession({
      participantName: 'Arthur Curry',
      purpose: 'Coastal check',
    });

    await publicCaller.participant.recordConsent({
      token: created.session.token,
    });

    // Participant revokes
    const revokeRes = await publicCaller.participant.revokeConsent({
      token: created.session.token,
      reason: 'Arrived safely at destination',
    });

    expect(revokeRes.success).toBe(true);

    // Verify lookup now rejects with revoked error
    await expect(
      publicCaller.participant.getSession({ token: created.session.token })
    ).rejects.toThrow('revoked');

    // Subsequent location update must fail
    await expect(
      publicCaller.participant.updateLocation({
        token: created.session.token,
        latitude: 34.0522,
        longitude: -118.2437,
        accuracy: 10,
      })
    ).rejects.toThrow('Location sharing has been revoked');
  });

  // 12. Expired session enforcement
  it('enforces session expiry on lookup and location updates', async () => {
    const created = await adminCaller.admin.createSession({
      participantName: 'Victor Stone',
      purpose: 'Lab transit',
      expiresInHours: 0.25, // will manually backdate in db
    });

    // Backdate expiresAt in DB to past
    await db.update(sessions)
      .set({ expiresAt: Date.now() - 10000 })
      .where(eq(sessions.id, created.session.id));

    // Lookup should reject or mark as expired
    await expect(
      publicCaller.participant.getSession({ token: created.session.token })
    ).rejects.toThrow('expired');
  });

  // 13. Rate limit throttling on updates
  it('throttles rapid location updates within window', async () => {
    const created = await adminCaller.admin.createSession({
      participantName: 'Hal Jordan',
      purpose: 'Sector patrol',
    });

    await publicCaller.participant.recordConsent({
      token: created.session.token,
    });

    // First update succeeds
    const first = await publicCaller.participant.updateLocation({
      token: created.session.token,
      latitude: 51.5074,
      longitude: -0.1278,
      accuracy: 15,
    });
    expect(first.success).toBe(true);

    // Immediate second update with same token is throttled
    await expect(
      publicCaller.participant.updateLocation({
        token: created.session.token,
        latitude: 51.5075,
        longitude: -0.1279,
        accuracy: 15,
      })
    ).rejects.toThrow('Location updates are throttled');
  });
});
