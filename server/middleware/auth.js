import { verifyAccessToken } from '../services/authService.js';

// Verifies the access_token cookie (or an Authorization: Bearer fallback,
// handy for curl/tests) and attaches req.user. 401 envelope on failure.
export function requireAuth(req, res, next) {
    let token = req.cookies?.access_token;
    if (!token) {
        const header = req.headers.authorization;
        if (header?.startsWith('Bearer ')) {
            token = header.slice('Bearer '.length);
        }
    }

    if (!token) {
        return res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
    }

    try {
        const payload = verifyAccessToken(token);
        req.user = {
            id: Number(payload.sub),
            username: payload.username,
            role: payload.role
        };
        next();
    } catch {
        return res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Invalid or expired session' }
        });
    }
}

/** Requires requireAuth first. Only admin role may proceed. */
export function requireAdmin(req, res, next) {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({
            error: { code: 'FORBIDDEN', message: 'Admin access required' }
        });
    }
    next();
}
