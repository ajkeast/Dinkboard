import { describe, it, expect, afterEach } from 'vitest';
import {
    uniqueCreds,
    cleanupUsersByEmail,
    registerAgent,
} from './helpers.js';
import { db } from '../models/database.js';

const createdEmails = [];

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

async function adminAgent() {
    const { agent, user, creds } = await registerAgent();
    track(creds);
    await db.query('UPDATE app_users SET role = ? WHERE id = ?', ['admin', user.id]);
    const login = await agent.post('/api/auth/login').send({
        email: creds.email,
        password: creds.password,
    });
    expect(login.status).toBe(200);
    return { agent, user, creds };
}

describe('User admin API', () => {
    it('lists users for admins only', async () => {
        const viewer = await registerAgent();
        track(viewer.creds);
        const forbidden = await viewer.agent.get('/api/users');
        expect(forbidden.status).toBe(403);

        const { agent } = await adminAgent();
        const res = await agent.get('/api/users');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.some((u) => u.email === viewer.creds.email)).toBe(true);
    });

    it('updates roles and blocks self-demote', async () => {
        const { agent, user } = await adminAgent();
        const other = await registerAgent();
        track(other.creds);

        const promoted = await agent
            .patch(`/api/users/${other.user.id}/role`)
            .send({ role: 'admin' });
        expect(promoted.status).toBe(200);
        expect(promoted.body.user.role).toBe('admin');

        const selfDemote = await agent
            .patch(`/api/users/${user.id}/role`)
            .send({ role: 'viewer' });
        expect(selfDemote.status).toBe(400);
    });

    it('deletes users but not self', async () => {
        const { agent, user } = await adminAgent();
        const other = await registerAgent();
        track(other.creds);

        const self = await agent.delete(`/api/users/${user.id}`);
        expect(self.status).toBe(400);

        const deleted = await agent.delete(`/api/users/${other.user.id}`);
        expect(deleted.status).toBe(200);

        const rows = await db.query('SELECT id FROM app_users WHERE id = ?', [other.user.id]);
        expect(rows.length).toBe(0);
    });
});
