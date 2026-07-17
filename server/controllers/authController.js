import { Users, RefreshTokens } from '../models/model.users.js';
import {
    hashPassword,
    verifyPassword,
    signAccessToken,
    generateRefreshToken,
    hashRefreshToken,
    cookieOptions
} from '../services/authService.js';
import {
    discordConfigured,
    generateOAuthState,
    setOAuthStateCookie,
    clearOAuthStateCookie,
    readOAuthStateCookie,
    buildDiscordAuthorizeUrl,
    exchangeDiscordCode,
    fetchDiscordProfile,
    sanitizeDiscordUsername,
    syntheticDiscordEmail,
    discordAvatarUrl,
    oauthFailureRedirect,
    oauthSuccessRedirect
} from '../services/discordOAuth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../middleware/errorHandler.js';

function publicUser(user) {
    return {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        member_id: user.member_id ?? null,
        avatar_url: user.avatar_url ?? null
    };
}

async function issueSession(res, user) {
    const accessToken = signAccessToken(user);
    const { token: refreshToken, tokenHash, expiresAt } = generateRefreshToken();
    await RefreshTokens.create({ userId: user.id, tokenHash, expiresAt });
    res.cookie('access_token', accessToken, cookieOptions.access);
    res.cookie('refresh_token', refreshToken, cookieOptions.refresh);
}

function clearSessionCookies(res) {
    res.clearCookie('access_token', { ...cookieOptions.access, maxAge: undefined });
    res.clearCookie('refresh_token', { ...cookieOptions.refresh, maxAge: undefined });
}

async function resolveDiscordUser(profile) {
    const discordId = String(profile.id);
    const avatarUrl = discordAvatarUrl(profile);

    const existingByDiscord = await Users.findByMemberId(discordId);
    if (existingByDiscord) {
        await Users.updateAvatarUrl(existingByDiscord.id, avatarUrl);
        return Users.findById(existingByDiscord.id);
    }

    const email = profile.email
        ? String(profile.email).trim().toLowerCase()
        : syntheticDiscordEmail(discordId);

    if (profile.email) {
        const existingByEmail = await Users.findByEmail(email);
        if (existingByEmail) {
            if (existingByEmail.member_id && existingByEmail.member_id !== discordId) {
                throw new Error('Email already linked to a different Discord account');
            }
            await Users.linkMemberId(existingByEmail.id, discordId);
            await Users.updateAvatarUrl(existingByEmail.id, avatarUrl);
            return Users.findById(existingByEmail.id);
        }
    }

    const baseUsername = sanitizeDiscordUsername(profile.username || profile.global_name);
    const username = await Users.allocateUsername(baseUsername);
    const id = await Users.createOAuthUser({
        email,
        username,
        memberId: discordId,
        avatarUrl
    });
    return Users.findById(id);
}

export const register = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    if (await Users.findByEmail(email)) {
        throw new ApiError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
    }
    if (await Users.findByUsername(username)) {
        throw new ApiError(409, 'USERNAME_TAKEN', 'This username is already taken');
    }

    const passwordHash = await hashPassword(password);
    const id = await Users.createUser({ email, username, passwordHash });
    const user = await Users.findById(id);

    await issueSession(res, user);
    res.status(201).json({ user: publicUser(user) });
});

export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await Users.findByEmail(email);
    if (!user || !user.password_hash || !(await verifyPassword(user.password_hash, password))) {
        throw new ApiError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password');
    }

    await issueSession(res, user);
    res.status(200).json({ user: publicUser(user) });
});

export const refresh = asyncHandler(async (req, res) => {
    const presented = req.cookies?.refresh_token;
    if (!presented) {
        throw new ApiError(401, 'NO_REFRESH_TOKEN', 'No refresh token provided');
    }

    const tokenHash = hashRefreshToken(presented);
    const stored = await RefreshTokens.findValidByHash(tokenHash);
    if (!stored) {
        clearSessionCookies(res);
        throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid, expired, or revoked');
    }

    const user = await Users.findById(stored.user_id);
    if (!user) {
        clearSessionCookies(res);
        throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid, expired, or revoked');
    }

    // Rotation: revoke the presented token, then issue a fresh pair.
    await RefreshTokens.revokeByHash(tokenHash);
    await issueSession(res, user);
    res.status(200).json({ user: publicUser(user) });
});

export const logout = asyncHandler(async (req, res) => {
    const presented = req.cookies?.refresh_token;
    if (presented) {
        await RefreshTokens.revokeByHash(hashRefreshToken(presented));
    }
    clearSessionCookies(res);
    res.status(200).json({ success: true });
});

export const me = asyncHandler(async (req, res) => {
    const user = await Users.findById(req.user.id);
    if (!user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'User no longer exists');
    }
    res.status(200).json({ user: publicUser(user) });
});

export const discordStart = asyncHandler(async (req, res) => {
    if (!discordConfigured()) {
        return res.redirect(oauthFailureRedirect());
    }

    const state = generateOAuthState();
    setOAuthStateCookie(res, state);
    res.redirect(buildDiscordAuthorizeUrl(state));
});

export const discordCallback = asyncHandler(async (req, res) => {
    const fail = () => {
        clearOAuthStateCookie(res);
        return res.redirect(oauthFailureRedirect());
    };

    if (!discordConfigured()) {
        return fail();
    }

    const { code, state, error: oauthError } = req.query;
    if (oauthError || !code || !state) {
        return fail();
    }

    const expectedState = readOAuthStateCookie(req);
    clearOAuthStateCookie(res);
    if (!expectedState || expectedState !== state) {
        return fail();
    }

    try {
        const tokenPayload = await exchangeDiscordCode(String(code));
        if (!tokenPayload?.access_token) {
            return fail();
        }

        const profile = await fetchDiscordProfile(tokenPayload.access_token);
        if (!profile?.id) {
            return fail();
        }

        const user = await resolveDiscordUser(profile);
        await issueSession(res, user);
        return res.redirect(oauthSuccessRedirect());
    } catch {
        return fail();
    }
});
