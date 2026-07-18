import { db } from './database.js';

function parseProperties(row) {
    if (!row) return row;
    let properties = row.properties;
    if (typeof properties === 'string') {
        try {
            properties = JSON.parse(properties);
        } catch {
            properties = null;
        }
    }
    return { ...row, properties };
}

function formatDayLabel(value) {
    if (value instanceof Date) {
        return value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (typeof value === 'string') {
        // MySQL DATE often arrives as YYYY-MM-DD
        const d = new Date(`${value.slice(0, 10)}T12:00:00`);
        if (!Number.isNaN(d.getTime())) {
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
    }
    return String(value ?? '');
}

export const Analytics = {
    async insertMany(events) {
        if (!events.length) return { inserted: 0 };

        const placeholders = events.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const params = [];
        for (const e of events) {
            params.push(
                e.event_type,
                e.user_id,
                e.session_id,
                e.path,
                e.referrer,
                e.device_type,
                e.os,
                e.browser,
                e.viewport_w,
                e.viewport_h,
                e.properties == null ? null : JSON.stringify(e.properties)
            );
        }

        await db.query(
            `INSERT INTO app_analytics_events (
                event_type, user_id, session_id, path, referrer,
                device_type, os, browser, viewport_w, viewport_h, properties
            ) VALUES ${placeholders}`,
            params
        );
        return { inserted: events.length };
    },

    async list({ limit = 50, offset = 0, eventType = null, days = 30 } = {}) {
        const where = ['e.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)'];
        const params = [days];

        if (eventType) {
            where.push('e.event_type = ?');
            params.push(eventType);
        }

        params.push(Number(limit), Number(offset));
        const rows = await db.query(
            `SELECT
                e.id, e.event_type, e.user_id, e.session_id, e.path, e.referrer,
                e.device_type, e.os, e.browser, e.viewport_w, e.viewport_h,
                e.properties, e.created_at,
                u.username, u.email
             FROM app_analytics_events e
             LEFT JOIN app_users u ON u.id = e.user_id
             WHERE ${where.join(' AND ')}
             ORDER BY e.created_at DESC
             LIMIT ? OFFSET ?`,
            params
        );
        return rows.map(parseProperties);
    },

    async summary({ days = 30 } = {}) {
        const [totals] = await db.query(
            `SELECT
                COUNT(*) AS total_events,
                COUNT(DISTINCT session_id) AS sessions,
                COUNT(DISTINCT user_id) AS users,
                SUM(event_type = 'page_view') AS page_views,
                SUM(event_type = 'error') AS errors,
                SUM(event_type = 'auth') AS auth_events,
                SUM(event_type = 'action') AS actions,
                SUM(event_type = 'web_vital') AS web_vitals
             FROM app_analytics_events
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
            [days]
        );

        const byDevice = await db.query(
            `SELECT device_type, COUNT(*) AS count
             FROM app_analytics_events
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
             GROUP BY device_type
             ORDER BY count DESC`,
            [days]
        );

        const byPath = await db.query(
            `SELECT path, COUNT(*) AS count
             FROM app_analytics_events
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
               AND event_type = 'page_view'
               AND path IS NOT NULL
             GROUP BY path
             ORDER BY count DESC
             LIMIT 20`,
            [days]
        );

        const byDay = await db.query(
            `SELECT DATE(created_at) AS day, COUNT(*) AS count
             FROM app_analytics_events
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
             GROUP BY DATE(created_at)
             ORDER BY day ASC`,
            [days]
        );

        const byBrowser = await db.query(
            `SELECT COALESCE(browser, 'unknown') AS browser, COUNT(*) AS count
             FROM app_analytics_events
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
             GROUP BY browser
             ORDER BY count DESC
             LIMIT 10`,
            [days]
        );

        return {
            days,
            totals: {
                total_events: Number(totals?.total_events ?? 0),
                sessions: Number(totals?.sessions ?? 0),
                users: Number(totals?.users ?? 0),
                page_views: Number(totals?.page_views ?? 0),
                errors: Number(totals?.errors ?? 0),
                auth_events: Number(totals?.auth_events ?? 0),
                actions: Number(totals?.actions ?? 0),
                web_vitals: Number(totals?.web_vitals ?? 0)
            },
            by_device: byDevice.map((r) => ({
                device_type: r.device_type,
                count: Number(r.count)
            })),
            by_path: byPath.map((r) => ({
                path: r.path,
                count: Number(r.count)
            })),
            by_day: byDay.map((r) => ({
                day: r.day,
                day_label: formatDayLabel(r.day),
                count: Number(r.count)
            })),
            by_browser: byBrowser.map((r) => ({
                browser: r.browser,
                count: Number(r.count)
            }))
        };
    }
};
