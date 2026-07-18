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

const usageEventBody = z.object({
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
    events: z.array(usageEventBody).min(1).max(25)
});

const summaryQuery = z.object({
    days: z.coerce.number().int().min(1).max(365).optional().default(30)
});

const activityQuery = z.object({
    days: z.coerce.number().int().min(1).max(365).optional().default(30),
    limit: z.coerce.number().int().min(1).max(200).optional().default(50),
    offset: z.coerce.number().int().min(0).optional().default(0),
    event_type: eventTypeEnum.optional()
});

// Path names avoid EasyList/uBlock patterns (analytics, events, track, collect).
router.post('/ingest', requireAuth, validate({ body: ingestBody }), ingestEvents);
router.get('/summary', requireAuth, requireAdmin, validate({ query: summaryQuery }), getSummary);
router.get('/activity', requireAuth, requireAdmin, validate({ query: activityQuery }), listEvents);

export default router;
