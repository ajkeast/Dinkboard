import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
    app,
    request,
    registerAgent,
    cleanupUsersByEmail,
} from './helpers.js';

/**
 * Data suite — READ-ONLY against Discord tables.
 * Writes only create/delete the suite's own app_users / app_refresh_tokens rows.
 */
describe('Protected data API (read-only Discord tables)', () => {
    let agent;
    let creds;

    beforeAll(async () => {
        ({ agent, creds } = await registerAgent());
    }, 60000);

    afterAll(async () => {
        if (creds?.email) await cleanupUsersByEmail(creds.email);
    });

    const protectedPaths = [
        '/api/messages/stats',
        '/api/messages',
        '/api/members',
        '/api/firsts/score',
        '/api/firsts/juice',
        '/api/ai/stats',
        '/api/emojis',
        '/api/dinkcoin/balances',
        '/api/dinkcoin/transactions',
    ];

    it.each(protectedPaths)('returns 401 unauthenticated for %s', async (path) => {
        const res = await request(app).get(path);
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('GET /api/health is public and reports db status', async () => {
        const res = await request(app).get('/api/health');
        expect([200, 503]).toContain(res.status);
        expect(res.body).toHaveProperty('status');
        expect(res.body).toHaveProperty('db');
        if (res.status === 200) {
            expect(res.body).toEqual({ status: 'ok', db: 'up' });
        }
    });

    it('GET /api/messages/stats returns stats shape', async () => {
        const started = Date.now();
        const res = await agent.get('/api/messages/stats');
        const ms = Date.now() - started;
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body[0]).toEqual(
            expect.objectContaining({
                thisMTD: expect.anything(),
                lastMTD: expect.anything(),
                thisYTD: expect.anything(),
                lastYTD: expect.anything(),
            })
        );
        // Record for M9: emoji/messages queries can be heavy on iCloud/shared DB
        // eslint-disable-next-line no-console
        console.log(`[timing] /api/messages/stats ${ms}ms`);
    });

    it('GET /api/messages/month/member returns last-12 wide rows', async () => {
        const res = await agent.get('/api/messages/month/member');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeLessThanOrEqual(12);
        if (res.body.length > 0) {
            expect(res.body[0]).toEqual(
                expect.objectContaining({
                    month: expect.any(String),
                })
            );
        }
    });

    it('GET /api/members returns member rows', async () => {
        const res = await agent.get('/api/members');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        if (res.body.length > 0) {
            expect(res.body[0]).toEqual(
                expect.objectContaining({
                    id: expect.any(String),
                    user_name: expect.any(String),
                })
            );
        }
    });

    it('GET /api/firsts/score returns score rows', async () => {
        const res = await agent.get('/api/firsts/score');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        if (res.body.length > 0) {
            expect(res.body[0]).toEqual(
                expect.objectContaining({
                    user_id: expect.any(String),
                    user_name: expect.any(String),
                    firsts: expect.anything(),
                })
            );
        }
    });

    it('GET /api/firsts/juice returns juice rows', async () => {
        const res = await agent.get('/api/firsts/juice');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        if (res.body.length > 0) {
            expect(res.body[0]).toEqual(
                expect.objectContaining({
                    user_id: expect.any(String),
                    juice: expect.anything(),
                })
            );
        }
    });

    it('GET /api/ai/stats returns object shape', async () => {
        const res = await agent.get('/api/ai/stats');
        expect(res.status).toBe(200);
        expect(res.body).toEqual(
            expect.objectContaining({
                chatgpt_today: expect.anything(),
                dalle_today: expect.anything(),
                chatgpt_last_30_days: expect.anything(),
                dalle_last_30_days: expect.anything(),
                chatgpt_prev_30_days: expect.anything(),
                dalle_prev_30_days: expect.anything(),
                total_tokens_last_30_days: expect.anything(),
                total_tokens_prev_30_days: expect.anything(),
            })
        );
        expect(Array.isArray(res.body)).toBe(false);
    });

    it('GET /api/ai/chatgpt/timeline?groupBy=month returns series', async () => {
        const res = await agent.get('/api/ai/chatgpt/timeline').query({ groupBy: 'month' });
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        if (res.body.length > 0) {
            expect(res.body[0]).toEqual(
                expect.objectContaining({
                    time_period: expect.anything(),
                    total_calls: expect.anything(),
                })
            );
        }
    });

    it('GET /api/dinkcoin/balances returns balance rows', async () => {
        const res = await agent.get('/api/dinkcoin/balances');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        if (res.body.length > 0) {
            expect(res.body[0]).toEqual(
                expect.objectContaining({
                    user_id: expect.any(String),
                    balance: expect.anything(),
                })
            );
        }
    });

    it('GET /api/dinkcoin/transactions returns newest-first rows', async () => {
        const res = await agent.get('/api/dinkcoin/transactions').query({ limit: 10 });
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        if (res.body.length > 0) {
            expect(res.body[0]).toEqual(
                expect.objectContaining({
                    id: expect.anything(),
                    to_user_id: expect.any(String),
                    amount: expect.anything(),
                    tx_type: expect.stringMatching(/^(mint|transfer)$/),
                })
            );
        }
        if (res.body.length > 1) {
            expect(res.body[0].id).toBeGreaterThanOrEqual(res.body[1].id);
        }
    });

    it('returns 400 for bad groupBy', async () => {
        const res = await agent.get('/api/ai/chatgpt/timeline').query({ groupBy: 'week' });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('GET /api/messages/day returns sparse daily counts for a member', async () => {
        const members = await agent.get('/api/members');
        expect(members.status).toBe(200);
        if (!members.body.length) return;

        const memberId = members.body[0].id;
        const res = await agent.get('/api/messages/day').query({
            memberId,
            startDate: '2024-01-01',
            endDate: '2024-01-31',
        });
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        if (res.body.length > 0) {
            expect(res.body[0]).toEqual(
                expect.objectContaining({
                    date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
                    messages: expect.anything(),
                })
            );
        }
    });

    it('GET /api/messages/summary/member returns summary shape', async () => {
        const members = await agent.get('/api/members');
        expect(members.status).toBe(200);
        if (!members.body.length) return;

        const res = await agent
            .get('/api/messages/summary/member')
            .query({ memberId: members.body[0].id });
        expect(res.status).toBe(200);
        expect(res.body).toEqual(
            expect.objectContaining({
                total_messages: expect.anything(),
                active_days: expect.anything(),
            })
        );
    });

    it('returns 400 for messages/day without memberId', async () => {
        const res = await agent.get('/api/messages/day');
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for bad message :id', async () => {
        const res = await agent.get('/api/messages/not-a-snowflake');
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
});
