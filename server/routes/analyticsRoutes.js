import express from 'express';
import { z } from 'zod';
import {
    ingestEvents,
    getSummary,
    listEvents
} from '../controllers/analyticsController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const eventTypeEnum = z.enum([
    'page_view',
    'session_start',
    'auth',
    'action',
    'error',
    'web_vital'
]);

const deviceTypeEnum = z.enum(['mobile', 'tablet', 'desktop', 'unknown']);

const analyticsEventBody = z.object({
    event_type: eventTypeEnum,
    session_id: z.string().uuid(),
    path: z.string().max(512).optional().nullable(),
    referrer: z.string().max(1024).optional().nullable(),
    device_type: deviceTypeEnum.optional().default('unknown'),
    os: z.string().max(64).optional().nullable(),
    browser: z.string().max(64).optional().nullable(),
    viewport_w: z.coerce.number().int().min(0).max(100000).optional().nullable(),
    viewport_h: z.coerce.number().int().min(0).max(100000).optional().nullable(),
    properties: z.record(z.unknown()).optional().nullable()
});

const ingestBody = z.object({
    events: z.array(analyticsEventBody).min(1).max(25)
});

const summaryQuery = z.object({
    days: z.coerce.number().int().min(1).max(365).optional().default(30)
});

const listQuery = z.object({
    days: z.coerce.number().int().min(1).max(365).optional().default(30),
    limit: z.coerce.number().int().min(1).max(200).optional().default(50),
    offset: z.coerce.number().int().min(0).optional().default(0),
    event_type: eventTypeEnum.optional()
});

// Any authenticated user can write events; only admins can read them.
router.post('/events', requireAuth, validate({ body: ingestBody }), ingestEvents);
router.get('/summary', requireAuth, requireAdmin, validate({ query: summaryQuery }), getSummary);
router.get('/events', requireAuth, requireAdmin, validate({ query: listQuery }), listEvents);

export default router;
