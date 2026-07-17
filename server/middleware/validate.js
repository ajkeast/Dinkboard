import { z } from 'zod';

// validate({ params, query, body }) — each key is a zod schema. Parsed values
// replace the originals so downstream handlers get coerced types. Zod errors
// fall through to the central error handler (400 envelope with issue list).
export function validate(schemas) {
    return (req, res, next) => {
        try {
            for (const key of ['params', 'query', 'body']) {
                if (schemas[key]) {
                    const parsed = schemas[key].parse(req[key] ?? {});
                    // Express 5 makes req.query a getter; assign properties instead.
                    if (key === 'query') {
                        Object.assign(req.query, parsed);
                    } else {
                        req[key] = parsed;
                    }
                }
            }
            next();
        } catch (err) {
            next(err);
        }
    };
}

// ---- Shared field schemas ----

// Discord snowflakes: 64-bit ids stored as varchar(20). Keep them strings.
export const snowflakeId = z.string().regex(/^\d{1,20}$/, 'must be a numeric id (1-20 digits)');

export const numericId = z.coerce.number().int().positive();

export const limitParam = z.coerce.number().int().min(1).max(500);

export const groupByParam = z.enum(['day', 'hour', 'month']);

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}([T ].*)?$/, 'must be an ISO date (YYYY-MM-DD)');

// startDate/endDate: both or neither.
export const dateRangeQuery = z.object({
    startDate: isoDate.optional(),
    endDate: isoDate.optional()
}).refine(
    q => Boolean(q.startDate) === Boolean(q.endDate),
    { message: 'startDate and endDate must be provided together' }
);

// ---- Auth body schemas ----

export const registerBody = z.object({
    email: z.string().email().max(255),
    username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_.-]+$/, 'letters, numbers, and _ . - only'),
    password: z.string().min(10).max(200)
});

export const loginBody = z.object({
    email: z.string().email().max(255),
    password: z.string().min(1).max(200)
});
