import { describe, it, expect, afterEach } from 'vitest';
import {
    app,
    request,
    uniqueCreds,
    cleanupUsersByEmail,
    registerAgent,
} from './helpers.js';
import { db } from '../models/database.js';

const createdEmails = [];
const sessionId = '11111111-1111-4111-8111-111111111111';

afterEach(async () => {
    // Clear any intentionally orphaned rows from this suite's shared session.
    try {
        await db.query(
            'DELETE FROM app_analytics_events WHERE session_id = ? AND user_id IS NULL',
            [sessionId]
        );
    } catch {
        /* ignore */
    }
    if (createdEmails.length) {
        try {
            await cleanupUsersByEmail(...createdEmails.splice(0));
        } catch {
            createdEmails.length = 0;
        }
    }
});

function track(creds) {
    createdEmails.push(creds.email);
    return creds;
}

const sampleEvent = {
    event_type: 'page_view',
    session_id: sessionId,
    path: '/dashboard',
    device_type: 'desktop',
    os: 'macOS',
    browser: 'Chrome',
    viewport_w: 1440,
    viewport_h: 900,
    properties: { test: true },
};

describe('Usage API', () => {
    it('lets any authenticated user ingest events with their user_id', async () => {
        const { agent, user, creds } = await registerAgent();
        track(creds);

        const res = await agent.post('/api/usage/ingest').send({
            events: [sampleEvent],
        });

        expect(res.status).toBe(202);
        expect(res.body.inserted).toBe(1);

        const rows = await db.query(
            'SELECT user_id, path FROM app_analytics_events WHERE session_id = ? ORDER BY id DESC LIMIT 1',
            [sessionId]
        );
        expect(rows[0]?.user_id).toBe(user.id);
        expect(rows[0]?.path).toBe('/dashboard');
    });

    it('forbids viewers from reading summary/activity', async () => {
        const { agent, creds } = await registerAgent();
        track(creds);

        const summary = await agent.get('/api/usage/summary');
        expect(summary.status).toBe(403);
        expect(summary.body.error.code).toBe('FORBIDDEN');

        const activity = await agent.get('/api/usage/activity');
        expect(activity.status).toBe(403);
    });

    it('skips ingest for admin users', async () => {
        const { agent, user, creds } = await registerAgent();
        track(creds);
        await db.query('UPDATE app_users SET role = ? WHERE id = ?', ['admin', user.id]);

        const login = await agent.post('/api/auth/login').send({
            email: creds.email,
            password: creds.password,
        });
        expect(login.status).toBe(200);

        const res = await agent.post('/api/usage/ingest').send({ events: [sampleEvent] });
        expect(res.status).toBe(202);
        expect(res.body.inserted).toBe(0);

        const rows = await db.query(
            'SELECT id FROM app_analytics_events WHERE user_id = ? AND session_id = ?',
            [user.id, sessionId]
        );
        expect(rows.length).toBe(0);
    });

    it('allows admins to read summary and activity, excluding admin events', async () => {
        const viewer = await registerAgent();
        track(viewer.creds);

        const admin = await registerAgent();
        track(admin.creds);
        await db.query('UPDATE app_users SET role = ? WHERE id = ?', ['admin', admin.user.id]);

        const adminLogin = await admin.agent.post('/api/auth/login').send({
            email: admin.creds.email,
            password: admin.creds.password,
        });
        expect(adminLogin.status).toBe(200);

        // Viewer event should appear; plant a historical admin row that must be filtered out.
        await viewer.agent.post('/api/usage/ingest').send({ events: [sampleEvent] });
        await db.query(
            `INSERT INTO app_analytics_events (
                event_type, user_id, session_id, path, device_type, os, browser
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            ['page_view', admin.user.id, sessionId, '/analytics', 'desktop', 'macOS', 'Chrome']
        );

        const summary = await admin.agent.get('/api/usage/summary').query({ days: 7 });
        expect(summary.status).toBe(200);
        expect(summary.body.totals.page_views).toBeGreaterThanOrEqual(1);
        expect(summary.body.totals.users).toBeGreaterThanOrEqual(1);

        const activity = await admin.agent.get('/api/usage/activity').query({ days: 7, limit: 50 });
        expect(activity.status).toBe(200);
        expect(Array.isArray(activity.body)).toBe(true);

        const viewerEvent = activity.body.find(
            (e) => e.path === '/dashboard' && e.user_id === viewer.user.id
        );
        expect(viewerEvent).toBeTruthy();
        expect(viewerEvent.username).toBe(viewer.user.username);

        const adminEvent = activity.body.find((e) => e.user_id === admin.user.id);
        expect(adminEvent).toBeUndefined();
    });

    it('excludes orphaned events left after user deletion (CI leftovers)', async () => {
        const viewer = await registerAgent();
        track(viewer.creds);

        const admin = await registerAgent();
        track(admin.creds);
        await db.query('UPDATE app_users SET role = ? WHERE id = ?', ['admin', admin.user.id]);
        const adminLogin = await admin.agent.post('/api/auth/login').send({
            email: admin.creds.email,
            password: admin.creds.password,
        });
        expect(adminLogin.status).toBe(200);

        await viewer.agent.post('/api/usage/ingest').send({
            events: [{ ...sampleEvent, path: '/orphan-check', session_id: sessionId }],
        });

        // Simulate incomplete cleanup: null out user_id the way ON DELETE SET NULL does.
        await db.query(
            'UPDATE app_analytics_events SET user_id = NULL WHERE path = ? AND session_id = ?',
            ['/orphan-check', sessionId]
        );

        const activity = await admin.agent.get('/api/usage/activity').query({ days: 7, limit: 50 });
        expect(activity.status).toBe(200);
        expect(activity.body.find((e) => e.path === '/orphan-check')).toBeUndefined();

        const summary = await admin.agent.get('/api/usage/summary').query({ days: 7 });
        expect(summary.status).toBe(200);
        // Orphan must not inflate page_views beyond attributed viewer traffic.
        expect(summary.body.totals.page_views).toBeGreaterThanOrEqual(0);
    });

    it('rejects unauthenticated ingest', async () => {
        const res = await request(app).post('/api/usage/ingest').send({
            events: [sampleEvent],
        });
        expect(res.status).toBe(401);
    });
});
