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

    it('allows admins to read summary and activity with usernames', async () => {
        const { agent, user, creds } = await registerAgent();
        track(creds);
        await db.query('UPDATE app_users SET role = ? WHERE id = ?', ['admin', user.id]);

        const login = await agent.post('/api/auth/login').send({
            email: creds.email,
            password: creds.password,
        });
        expect(login.status).toBe(200);

        await agent.post('/api/usage/ingest').send({ events: [sampleEvent] });

        const summary = await agent.get('/api/usage/summary').query({ days: 7 });
        expect(summary.status).toBe(200);
        expect(summary.body.totals.page_views).toBeGreaterThanOrEqual(1);
        expect(summary.body.totals.users).toBeGreaterThanOrEqual(1);

        const activity = await agent.get('/api/usage/activity').query({ days: 7, limit: 10 });
        expect(activity.status).toBe(200);
        expect(Array.isArray(activity.body)).toBe(true);
        const mine = activity.body.find((e) => e.path === '/dashboard' && e.user_id === user.id);
        expect(mine).toBeTruthy();
        expect(mine.username).toBe(user.username);
    });

    it('rejects unauthenticated ingest', async () => {
        const res = await request(app).post('/api/usage/ingest').send({
            events: [sampleEvent],
        });
        expect(res.status).toBe(401);
    });
});
