import { ZodError } from 'zod';

// Application error with an HTTP status and a stable machine-readable code.
// All failures leave the API as: { "error": { "code", "message", "details"? } }
export class ApiError extends Error {
    constructor(status, code, message, details = undefined) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

export function notFoundHandler(req, res) {
    res.status(404).json({
        error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` }
    });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
    if (err instanceof ApiError) {
        const body = { error: { code: err.code, message: err.message } };
        if (err.details) body.error.details = err.details;
        return res.status(err.status).json(body);
    }

    if (err instanceof ZodError) {
        return res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request input',
                details: err.issues.map(i => ({ path: i.path.join('.'), message: i.message }))
            }
        });
    }

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: { code: 'VALIDATION_ERROR', message: err.message }
        });
    }

    if (err.name === 'DatabaseError') {
        console.error('Database error:', err.originalError?.message ?? err.message);
        return res.status(503).json({
            error: { code: 'DB_UNAVAILABLE', message: 'Database is unavailable, please try again shortly' }
        });
    }

    if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Invalid or expired session' }
        });
    }

    console.error('Unhandled error:', err);
    return res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
    });
}
