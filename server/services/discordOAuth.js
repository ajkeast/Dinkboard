import crypto from 'node:crypto';

const DISCORD_AUTHORIZE = 'https://discord.com/api/oauth2/authorize';
const DISCORD_TOKEN = 'https://discord.com/api/oauth2/token';
const DISCORD_ME = 'https://discord.com/api/users/@me';
const SCOPES = 'identify email';
const STATE_COOKIE = 'discord_oauth_state';
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

function cookieSecure() {
    if (process.env.COOKIE_SECURE != null) {
        return process.env.COOKIE_SECURE === 'true';
    }
    return process.env.NODE_ENV === 'production';
}

export function discordConfigured() {
    return Boolean(
        process.env.DISCORD_CLIENT_ID &&
            process.env.DISCORD_CLIENT_SECRET &&
            process.env.DISCORD_REDIRECT_URI &&
            process.env.CLIENT_URL
    );
}

export function clientUrl() {
    return (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export function oauthFailureRedirect() {
    return `${clientUrl()}/#/login?error=discord_auth_failed`;
}

export function oauthSuccessRedirect() {
    return `${clientUrl()}/#/dashboard`;
}

export function generateOAuthState() {
    return crypto.randomBytes(24).toString('hex');
}

export const oauthStateCookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure(),
    maxAge: STATE_MAX_AGE_MS,
    path: '/api/auth'
};

export function setOAuthStateCookie(res, state) {
    res.cookie(STATE_COOKIE, state, oauthStateCookieOptions);
}

export function clearOAuthStateCookie(res) {
    res.clearCookie(STATE_COOKIE, { ...oauthStateCookieOptions, maxAge: undefined });
}

export function readOAuthStateCookie(req) {
    return req.cookies?.[STATE_COOKIE] ?? null;
}

export function buildDiscordAuthorizeUrl(state) {
    const params = new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
        response_type: 'code',
        scope: SCOPES,
        state
    });
    return `${DISCORD_AUTHORIZE}?${params}`;
}

export async function exchangeDiscordCode(code) {
    const body = new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI
    });

    const res = await fetch(DISCORD_TOKEN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Discord token exchange failed (${res.status}): ${text}`);
    }

    return res.json();
}

export async function fetchDiscordProfile(accessToken) {
    const res = await fetch(DISCORD_ME, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Discord profile fetch failed (${res.status}): ${text}`);
    }

    return res.json();
}

/** Sanitize Discord username to app username rules; ensure length 3–50. */
export function sanitizeDiscordUsername(raw) {
    let name = String(raw ?? 'discord')
        .replace(/[^a-zA-Z0-9_.-]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^[_.-]+|[_.-]+$/g, '');

    if (name.length < 3) {
        name = `user_${name}`.padEnd(3, '0');
    }
    return name.slice(0, 50);
}

export function syntheticDiscordEmail(discordId) {
    return `${discordId}@users.noreply.discord.local`;
}

/** Build a Discord CDN avatar URL from an OAuth /users/@me profile. */
export function discordAvatarUrl(profile) {
    const id = String(profile.id);
    if (profile.avatar) {
        const ext = String(profile.avatar).startsWith('a_') ? 'gif' : 'png';
        return `https://cdn.discordapp.com/avatars/${id}/${profile.avatar}.${ext}?size=128`;
    }
    // Default embed avatar index for users without a custom avatar.
    const index = Number(BigInt(id) >> 22n) % 6;
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}
