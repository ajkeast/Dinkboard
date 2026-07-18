import { describe, it, expect, afterEach, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import {
    app,
    request,
    uniqueCreds,
    cleanupUsersByEmail,
    registerAgent,
} from './helpers.js';

const createdEmails = [];

afterEach(async () => {
    if (createdEmails.length) {
        try {
            await cleanupUsersByEmail(...createdEmails.splice(0));
        } catch {
            // DB may be briefly unavailable; orphaned m9test_* rows are safe to delete later
            createdEmails.length = 0;
        }
    }
});

function track(creds) {
    createdEmails.push(creds.email);
    return creds;
}

describe('Auth API', () => {
    it('registers a new user and sets auth cookies', async () => {
        const creds = track(uniqueCreds('reg'));
        const res = await request(app).post('/api/auth/register').send(creds);

        expect(res.status).toBe(201);
        expect(res.body.user).toMatchObject({
            email: creds.email,
            username: creds.username,
            role: 'viewer',
        });
        expect(res.body.user.id).toBeTypeOf('number');
        expect(res.headers['set-cookie']).toEqual(
            expect.arrayContaining([
                expect.stringMatching(/^access_token=/),
                expect.stringMatching(/^refresh_token=/),
            ])
        );
    });

    it('rejects duplicate email and username', async () => {
        const { creds } = await registerAgent();
        track(creds);

        const emailClash = await request(app)
            .post('/api/auth/register')
            .send({ ...uniqueCreds('dup'), email: creds.email });
        expect(emailClash.status).toBe(409);
        expect(emailClash.body.error.code).toBe('EMAIL_TAKEN');

        const userClash = await request(app)
            .post('/api/auth/register')
            .send({ ...uniqueCreds('dup'), username: creds.username });
        expect(userClash.status).toBe(409);
        expect(userClash.body.error.code).toBe('USERNAME_TAKEN');
    });

    it('rejects invalid register body with VALIDATION_ERROR', async () => {
        const res = await request(app).post('/api/auth/register').send({
            email: 'not-an-email',
            username: 'ab',
            password: 'short',
        });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
        expect(res.body.error.details?.length).toBeGreaterThan(0);
    });

    it('logs in with correct credentials and returns /me', async () => {
        const { creds } = await registerAgent();
        track(creds);

        // Fresh agent (no cookies) — login should re-issue session
        const agent = request.agent(app);
        const login = await agent.post('/api/auth/login').send({
            email: creds.email,
            password: creds.password,
        });
        expect(login.status).toBe(200);
        expect(login.body.user.email).toBe(creds.email);

        const me = await agent.get('/api/auth/me');
        expect(me.status).toBe(200);
        expect(me.body.user.username).toBe(creds.username);
    });

    it('rejects wrong password with INVALID_CREDENTIALS', async () => {
        const { creds } = await registerAgent();
        track(creds);

        const res = await request(app).post('/api/auth/login').send({
            email: creds.email,
            password: 'wrong-password-xx',
        });
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('refreshes rotated cookies and rejects reused refresh token', async () => {
        const { agent, creds } = await registerAgent();
        track(creds);

        const first = await agent.post('/api/auth/refresh');
        expect(first.status).toBe(200);
        expect(first.body.user.email).toBe(creds.email);

        // Capture the rotated refresh cookie, then revoke via logout and reuse old path
        const refreshCookies = first.headers['set-cookie'];
        const refreshCookie = refreshCookies.find((c) => c.startsWith('refresh_token='));

        const second = await agent.post('/api/auth/refresh');
        expect(second.status).toBe(200);

        // Present the earlier (already rotated/revoked) refresh token
        const stale = await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', refreshCookie.split(';')[0]);
        expect(stale.status).toBe(401);
        expect(stale.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('rejects refresh with no cookie', async () => {
        const res = await request(app).post('/api/auth/refresh');
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('NO_REFRESH_TOKEN');
    });

    it('logs out, clears session, and blocks /me', async () => {
        const { agent, creds } = await registerAgent();
        track(creds);

        const out = await agent.post('/api/auth/logout');
        expect(out.status).toBe(200);
        expect(out.body).toEqual({ success: true });

        const me = await agent.get('/api/auth/me');
        expect(me.status).toBe(401);
        expect(me.body.error.code).toBe('UNAUTHORIZED');
    });

    it('accepts Bearer access token as auth fallback', async () => {
        const creds = track(uniqueCreds('bearer'));
        const login = await request(app).post('/api/auth/register').send(creds);
        expect(login.status).toBe(201);
        const access = login.headers['set-cookie'].find((c) => c.startsWith('access_token='));
        const token = access.split(';')[0].replace('access_token=', '');

        const me = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);
        expect(me.status).toBe(200);
        expect(me.body.user.email).toBe(creds.email);
    });

    it('rejects expired access token, then refresh restores session', async () => {
        const { agent, creds, user } = await registerAgent();
        track(creds);

        const expired = jwt.sign(
            { sub: String(user.id), username: user.username, role: user.role, exp: Math.floor(Date.now() / 1000) - 60 },
            process.env.JWT_SECRET,
            { algorithm: 'HS256' }
        );

        const denied = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${expired}`);
        expect(denied.status).toBe(401);

        // Refresh cookie on the agent should still be valid
        const refreshed = await agent.post('/api/auth/refresh');
        expect(refreshed.status).toBe(200);
        expect(refreshed.body.user.id).toBe(user.id);

        const me = await agent.get('/api/auth/me');
        expect(me.status).toBe(200);
    });

    it('returns 429 after exceeding auth rate limit', async () => {
        const prevForce = process.env.FORCE_AUTH_RATE_LIMIT;
        const prevLimit = process.env.AUTH_RATE_LIMIT;
        process.env.FORCE_AUTH_RATE_LIMIT = '1';
        process.env.AUTH_RATE_LIMIT = '3';
        try {
            const email = `m9test_rl_${Date.now()}@example.com`;
            let last;
            for (let i = 0; i < 5; i++) {
                last = await request(app).post('/api/auth/login').send({
                    email,
                    password: 'whatever-long',
                });
            }
            expect(last.status).toBe(429);
            expect(last.body.error.code).toBe('RATE_LIMITED');
        } finally {
            if (prevForce === undefined) delete process.env.FORCE_AUTH_RATE_LIMIT;
            else process.env.FORCE_AUTH_RATE_LIMIT = prevForce;
            if (prevLimit === undefined) delete process.env.AUTH_RATE_LIMIT;
            else process.env.AUTH_RATE_LIMIT = prevLimit;
        }
    });
});

describe('Discord OAuth', () => {
    const prevEnv = {};
    let fetchMock;

    beforeAll(() => {
        for (const key of [
            'DISCORD_CLIENT_ID',
            'DISCORD_CLIENT_SECRET',
            'DISCORD_REDIRECT_URI',
            'CLIENT_URL',
        ]) {
            prevEnv[key] = process.env[key];
        }
        process.env.DISCORD_CLIENT_ID = 'test_client_id';
        process.env.DISCORD_CLIENT_SECRET = 'test_client_secret';
        process.env.DISCORD_REDIRECT_URI =
            'http://localhost:5001/api/auth/discord/callback';
        process.env.CLIENT_URL = 'http://localhost:3000';
    });

    afterAll(() => {
        for (const [key, value] of Object.entries(prevEnv)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    });

    beforeEach(() => {
        fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    function mockDiscordProfile(profile) {
        fetchMock.mockImplementation(async (url) => {
            const href = String(url);
            if (href.includes('/oauth2/token')) {
                return {
                    ok: true,
                    json: async () => ({ access_token: 'discord_access_token' }),
                    text: async () => '',
                };
            }
            if (href.includes('/users/@me')) {
                return {
                    ok: true,
                    json: async () => profile,
                    text: async () => '',
                };
            }
            throw new Error(`Unexpected fetch: ${href}`);
        });
    }

    async function startOAuth(agent = request.agent(app)) {
        const start = await agent.get('/api/auth/discord').redirects(0);
        expect(start.status).toBe(302);
        const location = start.headers.location;
        expect(location).toContain('discord.com/api/oauth2/authorize');
        const state = new URL(location).searchParams.get('state');
        expect(state).toBeTruthy();
        return { agent, state };
    }

    it('creates a passwordless user from Discord and rejects password login', async () => {
        const discordId = `9${Date.now()}`.slice(0, 20);
        const email = `m9test_oauth_${discordId}@example.com`;
        track({ email });
        mockDiscordProfile({
            id: discordId,
            username: 'OAuthUser!',
            email,
            avatar: 'abc123avatarhash',
        });

        const { agent, state } = await startOAuth();
        const cb = await agent
            .get(`/api/auth/discord/callback?code=ok&state=${state}`)
            .redirects(0);

        expect(cb.status).toBe(302);
        expect(cb.headers.location).toBe('http://localhost:3000/dashboard');
        expect(cb.headers['set-cookie']).toEqual(
            expect.arrayContaining([
                expect.stringMatching(/^access_token=/),
                expect.stringMatching(/^refresh_token=/),
            ])
        );

        const me = await agent.get('/api/auth/me');
        expect(me.status).toBe(200);
        expect(me.body.user.email).toBe(email);
        expect(me.body.user.member_id).toBe(discordId);
        expect(me.body.user.avatar_url).toBe(
            `https://cdn.discordapp.com/avatars/${discordId}/abc123avatarhash.png?size=128`
        );

        const login = await request(app).post('/api/auth/login').send({
            email,
            password: 'anything-long-enough',
        });
        expect(login.status).toBe(401);
        expect(login.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('links Discord to an existing account by email', async () => {
        const { agent: registered, creds, user } = await registerAgent();
        track(creds);
        // Drop session cookies; OAuth uses a fresh agent with only state cookie.
        void registered;

        const discordId = `8${Date.now()}`.slice(0, 20);
        mockDiscordProfile({
            id: discordId,
            username: 'LinkedUser',
            email: creds.email,
        });

        const { agent, state } = await startOAuth();
        const cb = await agent
            .get(`/api/auth/discord/callback?code=ok&state=${state}`)
            .redirects(0);

        expect(cb.status).toBe(302);
        expect(cb.headers.location).toBe('http://localhost:3000/dashboard');

        const me = await agent.get('/api/auth/me');
        expect(me.status).toBe(200);
        expect(me.body.user.id).toBe(user.id);
        expect(me.body.user.member_id).toBe(discordId);

        const login = await request(app).post('/api/auth/login').send({
            email: creds.email,
            password: creds.password,
        });
        expect(login.status).toBe(200);
        expect(login.body.user.id).toBe(user.id);
        expect(login.body.user.member_id).toBe(discordId);
    });

    it('rejects callback when OAuth state does not match', async () => {
        const { agent, state } = await startOAuth();
        void state;

        const cb = await agent
            .get('/api/auth/discord/callback?code=ok&state=wrong-state')
            .redirects(0);

        expect(cb.status).toBe(302);
        expect(cb.headers.location).toBe(
            'http://localhost:3000/login?error=discord_auth_failed'
        );
    });

    it('reuses the same user on a second Discord login', async () => {
        const discordId = `7${Date.now()}`.slice(0, 20);
        const email = `m9test_oauth2_${discordId}@example.com`;
        track({ email });
        mockDiscordProfile({
            id: discordId,
            username: 'repeat_user',
            email,
        });

        const first = await startOAuth();
        const cb1 = await first.agent
            .get(`/api/auth/discord/callback?code=ok&state=${first.state}`)
            .redirects(0);
        expect(cb1.status).toBe(302);
        const me1 = await first.agent.get('/api/auth/me');
        expect(me1.status).toBe(200);
        const userId = me1.body.user.id;

        const second = await startOAuth();
        const cb2 = await second.agent
            .get(`/api/auth/discord/callback?code=ok&state=${second.state}`)
            .redirects(0);
        expect(cb2.status).toBe(302);
        const me2 = await second.agent.get('/api/auth/me');
        expect(me2.status).toBe(200);
        expect(me2.body.user.id).toBe(userId);
        expect(me2.body.user.member_id).toBe(discordId);
    });
});
