import { Analytics } from '../models/model.analytics.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const ingestEvents = asyncHandler(async (req, res) => {
    const { events } = req.body;
    const userId = req.user.id;

    const rows = events.map((e) => ({
        event_type: e.event_type,
        user_id: userId,
        session_id: e.session_id,
        path: e.path ?? null,
        referrer: e.referrer ?? null,
        device_type: e.device_type ?? 'unknown',
        os: e.os ?? null,
        browser: e.browser ?? null,
        viewport_w: e.viewport_w ?? null,
        viewport_h: e.viewport_h ?? null,
        properties: e.properties ?? null
    }));

    const result = await Analytics.insertMany(rows);
    res.status(202).json(result);
});

export const getSummary = asyncHandler(async (req, res) => {
    const summary = await Analytics.summary({ days: req.query.days });
    res.status(200).json(summary);
});

export const listEvents = asyncHandler(async (req, res) => {
    const events = await Analytics.list({
        limit: req.query.limit,
        offset: req.query.offset,
        eventType: req.query.event_type,
        days: req.query.days
    });
    res.status(200).json(events);
});
