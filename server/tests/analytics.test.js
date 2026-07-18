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

describe('Analytics API', () => {
    it('lets any authenticated user ingest events', async () => {
        const { agent, creds } = await registerAgent();
        track(creds);

        const res = await agent.post('/api/analytics/events').send({
            events: [sampleEvent],
        });

        expect(res.status).toBe(202);
        expect(res.body.inserted).toBe(1);
    });

    it('forbids viewers from reading summary/events', async () => {
        const { agent, creds } = await registerAgent();
        track(creds);

        const summary = await agent.get('/api/analytics/summary');
        expect(summary.status).toBe(403);
        expect(summary.body.error.code).toBe('FORBIDDEN');

        const events = await agent.get('/api/analytics/events');
        expect(events.status).toBe(403);
    });

    it('allows admins to read summary and events', async () => {
        const { agent, user, creds } = await registerAgent();
        track(creds);
        await db.query('UPDATE app_users SET role = ? WHERE id = ?', ['admin', user.id]);

        // Re-login so JWT carries the admin role
        const login = await agent.post('/api/auth/login').send({
            email: creds.email,
            password: creds.password,
        });
        expect(login.status).toBe(200);

        await agent.post('/api/analytics/events').send({ events: [sampleEvent] });

        const summary = await agent.get('/api/analytics/summary').query({ days: 7 });
        expect(summary.status).toBe(200);
        expect(summary.body.totals.page_views).toBeGreaterThanOrEqual(1);

        const events = await agent.get('/api/analytics/events').query({ days: 7, limit: 10 });
        expect(events.status).toBe(200);
        expect(Array.isArray(events.body)).toBe(true);
        expect(events.body.some((e) => e.path === '/dashboard')).toBe(true);
    });

    it('rejects unauthenticated ingest', async () => {
        const res = await request(app).post('/api/analytics/events').send({
            events: [sampleEvent],
        });
        expect(res.status).toBe(401);
    });
});
