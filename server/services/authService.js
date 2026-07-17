import crypto from 'node:crypto';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.ACCESS_TOKEN_TTL_SECONDS) || 15 * 60;
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 30;

function jwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not set');
    }
    return secret;
}

function cookieSecure() {
    if (process.env.COOKIE_SECURE != null) {
        return process.env.COOKIE_SECURE === 'true';
    }
    return process.env.NODE_ENV === 'production';
}

export async function hashPassword(password) {
    return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash, password) {
    return argon2.verify(hash, password);
}

export function signAccessToken(user) {
    return jwt.sign(
        { sub: String(user.id), username: user.username, role: user.role },
        jwtSecret(),
        { algorithm: 'HS256', expiresIn: ACCESS_TOKEN_TTL_SECONDS }
    );
}

export function verifyAccessToken(token) {
    return jwt.verify(token, jwtSecret(), { algorithms: ['HS256'] });
}

// Refresh tokens: random 256-bit opaque values, stored server-side only as
// sha256 hashes. Rotated on every /refresh call.
export function generateRefreshToken() {
    const token = crypto.randomBytes(32).toString('hex');
    return { token, tokenHash: hashRefreshToken(token), expiresAt: refreshExpiry() };
}

export function hashRefreshToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function refreshExpiry() {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + REFRESH_TOKEN_TTL_DAYS);
    return d;
}

export const cookieOptions = {
    access: {
        httpOnly: true,
        sameSite: 'lax',
        secure: cookieSecure(),
        maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
        path: '/'
    },
    refresh: {
        httpOnly: true,
        sameSite: 'lax',
        secure: cookieSecure(),
        maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
        // Refresh token is only ever needed by the refresh + logout endpoints.
        path: '/api/auth'
    }
};
