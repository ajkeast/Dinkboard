import { db } from './database.js';
import {
    advancementName,
    periodWindows,
    snapshotStats,
    statsFromDeltas,
    summarizeStats,
    WINDOW_NOTE,
    withPresence,
} from '../services/minecraftStats.js';

function isMissingRelation(err) {
    const code = err?.originalError?.code || err?.code;
    return code === '42P01' || code === '3F000';
}

function splitFlags(raw) {
    return [...new Set(
        String(raw || '')
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean)
    )];
}

/**
 * Reads minecraft.* plus, for active playtime only, public.minecraft_sessions.
 * Never selects chat, commands, rejected logins, or session IPs.
 * Login IPs are loaded only by getLogins, which the admin route calls.
 */
export class MinecraftProfile {
    async link(discordUserId) {
        try {
            const rows = await db.query(
                `SELECT minecraft_uuid, discord_user_id, minecraft_name
                 FROM minecraft.player_links
                 WHERE discord_user_id = ?`,
                [discordUserId]
            );
            return rows[0] || null;
        } catch (err) {
            if (isMissingRelation(err)) return null;
            throw err;
        }
    }

    async playerName(uuid, fallback) {
        const rows = await db.query(
            `SELECT name FROM minecraft.players
             WHERE uuid = ?
             ORDER BY (name_lc = lower(name)) DESC, length(name) DESC
             LIMIT 1`,
            [uuid]
        );
        return rows[0]?.name || fallback || null;
    }

    async latestPlayday() {
        const rows = await db.query('SELECT MAX(playday) AS playday FROM minecraft.daily_stats');
        const value = rows[0]?.playday;
        return value ? String(value).slice(0, 10) : null;
    }

    async deltaRows(uuid, from, to) {
        return db.query(
            `SELECT category, stat, SUM(delta)::float8 AS delta
             FROM minecraft.daily_stats
             WHERE uuid = ? AND playday BETWEEN ?::date AND ?::date
             GROUP BY category, stat`,
            [uuid, from, to]
        );
    }

    async latestSnapshot(uuid) {
        const rows = await db.query(
            `SELECT json FROM minecraft.stats_snapshots
             WHERE uuid = ?
             ORDER BY taken_at DESC
             LIMIT 1`,
            [uuid]
        );
        return rows[0]?.json ?? null;
    }

    async rolledBackDeaths(uuid, from, to) {
        if (from && to) {
            const rows = await db.query(
                `SELECT COUNT(*)::int AS n
                 FROM minecraft.deaths
                 WHERE uuid = ?
                   AND rolled_back
                   AND ts >= ((?::date + TIME '05:00') AT TIME ZONE 'America/New_York')
                   AND ts < (((?::date + INTERVAL '1 day') + TIME '05:00') AT TIME ZONE 'America/New_York')`,
                [uuid, from, to]
            );
            return Number(rows[0]?.n) || 0;
        }
        const rows = await db.query(
            `SELECT COUNT(*)::int AS n
             FROM minecraft.deaths
             WHERE uuid = ? AND rolled_back`,
            [uuid]
        );
        return Number(rows[0]?.n) || 0;
    }

    async recordedDeaths(uuid) {
        const rows = await db.query(
            `SELECT COUNT(*)::int AS n
             FROM minecraft.deaths
             WHERE uuid = ? AND NOT rolled_back`,
            [uuid]
        );
        return Number(rows[0]?.n) || 0;
    }

    /**
     * Session seconds from the Discord bot's recap table (all slices).
     * Read-only. null when that table is not installed.
     */
    async presence(uuid, name, from, to) {
        const ranged = Boolean(from && to);
        const sql = `
            SELECT
              COALESCE(SUM(duration_seconds), 0)::float8 AS active_seconds
            FROM minecraft_sessions
            WHERE (
              replace(lower(COALESCE(player_uuid, '')), '-', '') = replace(lower(?), '-', '')
              OR (player_uuid IS NULL AND lower(player_name) = lower(?))
            )
            ${ranged ? 'AND activity_date BETWEEN ?::date AND ?::date' : ''}
        `;
        const params = ranged ? [uuid, name || '', from, to] : [uuid, name || ''];
        try {
            const rows = await db.query(sql, params);
            return { activeSeconds: Number(rows[0]?.active_seconds) || 0 };
        } catch (err) {
            if (isMissingRelation(err)) return null;
            throw err;
        }
    }

    async advancements(uuid) {
        const rows = await db.query(
            `SELECT advancement, earned_at
             FROM minecraft.advancements
             WHERE uuid = ?
             ORDER BY earned_at DESC NULLS LAST, advancement`,
            [uuid]
        );
        return rows.map((row) => ({
            id: row.advancement,
            name: advancementName(row.advancement),
            earnedAt: row.earned_at,
        }));
    }

    async periodStat(uuid, name, from, to) {
        const [rows, excluded, presence] = await Promise.all([
            this.deltaRows(uuid, from, to),
            this.rolledBackDeaths(uuid, from, to),
            this.presence(uuid, name, from, to),
        ]);
        return withPresence(
            summarizeStats(statsFromDeltas(rows), { deathsExcluded: excluded }),
            presence
        );
    }

    async getProfile(discordUserId) {
        const link = await this.link(discordUserId);
        if (!link) return { linked: false };

        const uuid = link.minecraft_uuid;
        const name = await this.playerName(uuid, link.minecraft_name);
        const windows = periodWindows(await this.latestPlayday());
        const [snapshot, allExcluded, allPresence, recordedDeaths, advancements] = await Promise.all([
            this.latestSnapshot(uuid),
            this.rolledBackDeaths(uuid),
            this.presence(uuid, name),
            this.recordedDeaths(uuid),
            this.advancements(uuid),
        ]);

        const parsed = snapshotStats(snapshot);
        let all = withPresence(
            summarizeStats(parsed || {}, { deathsExcluded: allExcluded }),
            allPresence
        );
        if (!parsed) {
            all = { ...all, deaths: recordedDeaths };
        }

        const empty = () => withPresence(summarizeStats({}), null);
        const [day, week, month] = await Promise.all([
            windows.day ? this.periodStat(uuid, name, windows.day.from, windows.day.to) : empty(),
            windows.week ? this.periodStat(uuid, name, windows.week.from, windows.week.to) : empty(),
            windows.month ? this.periodStat(uuid, name, windows.month.from, windows.month.to) : empty(),
        ]);

        return {
            linked: true,
            player: { uuid, name },
            windowNote: WINDOW_NOTE,
            windows,
            stats: { day, week, month, all },
            advancements,
        };
    }

    async getLogins(discordUserId) {
        const link = await this.link(discordUserId);
        if (!link) return null;
        const uuid = link.minecraft_uuid;
        const name = await this.playerName(uuid, link.minecraft_name);
        const rows = await db.query(
            `SELECT
               l.ip,
               MAX(g.country) AS country,
               MAX(g.region) AS region,
               MAX(g.city) AS city,
               MAX(g.isp) AS isp,
               MAX(g.org) AS org,
               MAX(g.asn) AS asn,
               BOOL_OR(g.mobile) AS mobile,
               BOOL_OR(g.proxy) AS proxy,
               BOOL_OR(g.hosting) AS hosting,
               COUNT(*)::int AS count,
               MIN(l.ts) AS first_seen,
               MAX(l.ts) AS last_seen,
               STRING_AGG(l.flags, ',') AS flags
             FROM minecraft.logins l
             LEFT JOIN minecraft.ip_geo g ON g.ip = l.ip
             WHERE l.uuid = ?
             GROUP BY l.ip
             ORDER BY MAX(l.ts) DESC`,
            [uuid]
        );
        return {
            player: { uuid, name },
            logins: rows.map((row) => ({
                ip: row.ip,
                country: row.country,
                region: row.region,
                city: row.city,
                isp: row.isp,
                org: row.org,
                asn: row.asn,
                mobile: row.mobile,
                proxy: row.proxy,
                hosting: row.hosting,
                count: Number(row.count) || 0,
                firstSeen: row.first_seen,
                lastSeen: row.last_seen,
                flags: splitFlags(row.flags),
            })),
        };
    }
}

export const minecraftProfile = new MinecraftProfile();
