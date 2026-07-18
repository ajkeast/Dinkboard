import { db } from './database.js';

const USER_COLS =
    'id, email, username, password_hash, member_id, role, avatar_url, created_at';
const USER_PUBLIC_COLS =
    'id, email, username, member_id, role, avatar_url, created_at';

export const Users = {
    async findByEmail(email) {
        const rows = await db.query(
            `SELECT ${USER_COLS} FROM app_users WHERE email = ?`,
            [email]
        );
        return rows[0] ?? null;
    },

    async findByUsername(username) {
        const rows = await db.query(
            `SELECT ${USER_COLS} FROM app_users WHERE username = ?`,
            [username]
        );
        return rows[0] ?? null;
    },

    async findById(id) {
        const rows = await db.query(
            `SELECT ${USER_PUBLIC_COLS} FROM app_users WHERE id = ?`,
            [id]
        );
        return rows[0] ?? null;
    },

    async findByMemberId(memberId) {
        const rows = await db.query(
            `SELECT ${USER_COLS} FROM app_users WHERE member_id = ?`,
            [memberId]
        );
        return rows[0] ?? null;
    },

    async createUser({ email, username, passwordHash = null, memberId = null, avatarUrl = null }) {
        const result = await db.query(
            'INSERT INTO app_users (email, username, password_hash, member_id, avatar_url) VALUES (?, ?, ?, ?, ?)',
            [email, username, passwordHash, memberId, avatarUrl]
        );
        return result.insertId;
    },

    async createOAuthUser({ email, username, memberId, avatarUrl = null }) {
        return this.createUser({ email, username, passwordHash: null, memberId, avatarUrl });
    },

    async linkMemberId(userId, memberId) {
        await db.query('UPDATE app_users SET member_id = ? WHERE id = ?', [memberId, userId]);
    },

    async updateAvatarUrl(userId, avatarUrl) {
        await db.query('UPDATE app_users SET avatar_url = ? WHERE id = ?', [avatarUrl, userId]);
    },

    async listAll() {
        return db.query(
            `SELECT ${USER_PUBLIC_COLS}
             FROM app_users
             ORDER BY created_at DESC`
        );
    },

    async setRole(userId, role) {
        await db.query('UPDATE app_users SET role = ? WHERE id = ?', [role, userId]);
    },

    async countByRole(role) {
        const rows = await db.query(
            'SELECT COUNT(*) AS count FROM app_users WHERE role = ?',
            [role]
        );
        return Number(rows[0]?.count ?? 0);
    },

    async deleteById(userId) {
        await RefreshTokens.revokeAllForUser(userId);
        await db.query('DELETE FROM app_users WHERE id = ?', [userId]);
    },

    /** Pick a unique username based on a sanitized base (adds numeric suffix on clash). */
    async allocateUsername(base) {
        let candidate = base.slice(0, 50);
        let n = 0;
        while (await this.findByUsername(candidate)) {
            n += 1;
            const suffix = String(n);
            candidate = `${base.slice(0, Math.max(1, 50 - suffix.length))}${suffix}`;
        }
        return candidate;
    }
};

export const RefreshTokens = {
    async create({ userId, tokenHash, expiresAt }) {
        await db.query(
            'INSERT INTO app_refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
            [userId, tokenHash, expiresAt]
        );
    },

    async findValidByHash(tokenHash) {
        const rows = await db.query(
            `SELECT id, user_id, token_hash, expires_at, revoked_at
             FROM app_refresh_tokens
             WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > NOW()
             LIMIT 1`,
            [tokenHash]
        );
        return rows[0] ?? null;
    },

    async revokeByHash(tokenHash) {
        await db.query(
            'UPDATE app_refresh_tokens SET revoked_at = NOW() WHERE token_hash = ? AND revoked_at IS NULL',
            [tokenHash]
        );
    },

    async revokeAllForUser(userId) {
        await db.query(
            'UPDATE app_refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
            [userId]
        );
    }
};
