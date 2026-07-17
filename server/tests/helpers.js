import request from 'supertest';
import app from '../app.js';
import { db } from '../models/database.js';

const PREFIX = 'm9test_';

/** Unique email/username for a test case (safe to leave if cleanup fails). */
export function uniqueCreds(label = 'user') {
    const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return {
        email: `${PREFIX}${label}_${stamp}@example.com`,
        username: `${PREFIX}${label}_${stamp}`.slice(0, 50),
        password: 'test-password-ok',
    };
}

/** Delete test user(s) by email — only touches app_users (CASCADE cleans tokens). */
export async function cleanupUsersByEmail(...emails) {
    for (const email of emails) {
        // Extra safety: only delete emails created by this suite's PREFIX.
        if (!email || !String(email).includes(PREFIX)) continue;
        await db.query('DELETE FROM app_users WHERE email = ?', [email]);
    }
}

export async function cleanupUsersByUsernamePrefix(prefix = PREFIX) {
    await db.query('DELETE FROM app_users WHERE username LIKE ?', [`${prefix}%`]);
}

/** Register a user and return { agent, user, creds }. Agent keeps cookies. */
export async function registerAgent(overrides = {}) {
    const creds = { ...uniqueCreds(), ...overrides };
    const agent = request.agent(app);
    const res = await agent.post('/api/auth/register').send(creds);
    if (res.status !== 201) {
        throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
    }
    return { agent, user: res.body.user, creds, res };
}

export { app, request };
