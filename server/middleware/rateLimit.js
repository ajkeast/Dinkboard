import rateLimit from 'express-rate-limit';

const envelope = (code, message) => ({ error: { code, message } });

// Strict limiter for credential endpoints: 10 attempts / 15 min / IP.
// In NODE_ENV=test the limiter is skipped unless FORCE_AUTH_RATE_LIMIT=1
// (so the integration suite can assert 429 without starving sibling tests).
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: () => Number(process.env.AUTH_RATE_LIMIT) || 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: envelope('RATE_LIMITED', 'Too many attempts, please try again later'),
    skip: () => process.env.NODE_ENV === 'test' && process.env.FORCE_AUTH_RATE_LIMIT !== '1'
});

// Global backstop: 300 requests / minute / IP.
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: () => Number(process.env.API_RATE_LIMIT) || 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: envelope('RATE_LIMITED', 'Too many requests, please slow down'),
    skip: () => process.env.NODE_ENV === 'test'
});
