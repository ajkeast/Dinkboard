import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../models/database.js';
import {
    app,
    request,
    registerAgent,
    cleanupUsersByEmail,
} from './helpers.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MEMBER = '910000000000009101';
const OTHER = '910000000000009102';
const UUID = '11111111-1111-4111-8111-111111111111';
const CHAT = 'SECRET_CHAT_PHRASE_mc';
const COMMAND = 'SECRET_COMMAND_PHRASE_mc';
const REJECT = 'SECRET_REJECT_PHRASE_mc';
const IP = '203.0.113.10';
const CITY = 'Onlyadminsville';

const SEED_IDS = [
    '162725160397438978',
    '94235023560941568',
    '186667084007211008',
    '163124059826028544',
    '1242970919190925315',
    '119872477299081216',
    '94254577766891520',
    '95321829031280640',
];

function walkKeys(value, hits, banned) {
    if (Array.isArray(value)) {
        value.forEach((item) => walkKeys(item, hits, banned));
        return;
    }
    if (value && typeof value === 'object') {
        for (const [key, child] of Object.entries(value)) {
            if (banned.includes(key)) hits.push(key);
            walkKeys(child, hits, banned);
        }
    }
}

async function applySql(name) {
    const sql = fs.readFileSync(path.join(root, 'deploy/postgres', name), 'utf8');
    await db.pool.query(sql);
}

describe('Minecraft member profile', () => {
    let viewer;
    let admin;

    beforeAll(async () => {
        await applySql('minecraft.sql');
        await db.pool.query(`
            CREATE TABLE IF NOT EXISTS minecraft_sessions (
                id BIGSERIAL PRIMARY KEY,
                activity_date DATE NOT NULL,
                player_name TEXT NOT NULL,
                player_uuid TEXT,
                started_at TIMESTAMPTZ NOT NULL,
                ended_at TIMESTAMPTZ NOT NULL,
                slice_started_at TIMESTAMPTZ NOT NULL,
                slice_ended_at TIMESTAMPTZ NOT NULL,
                duration_seconds INTEGER NOT NULL,
                end_reason TEXT NOT NULL,
                likely_afk BOOLEAN NOT NULL
            )
        `);

        await db.query(
            `INSERT INTO members (id, user_name, display_name) VALUES (?, 'fixturesteve', 'Fixture Steve')
             ON CONFLICT (id) DO NOTHING`,
            [MEMBER]
        );
        await db.query(
            `INSERT INTO members (id, user_name, display_name) VALUES (?, 'nolink', 'No Link')
             ON CONFLICT (id) DO NOTHING`,
            [OTHER]
        );
        await db.query(
            `INSERT INTO minecraft.player_links (minecraft_uuid, discord_user_id, minecraft_name)
             VALUES (?, ?, 'FixtureSteve')
             ON CONFLICT (minecraft_uuid) DO UPDATE
             SET discord_user_id = EXCLUDED.discord_user_id, minecraft_name = EXCLUDED.minecraft_name`,
            [UUID, MEMBER]
        );
        await db.query(
            `INSERT INTO minecraft.players (name_lc, name, uuid) VALUES ('fixturesteve', 'FixtureSteve', ?)
             ON CONFLICT (name_lc) DO UPDATE SET uuid = EXCLUDED.uuid`,
            [UUID]
        );

        const snapshot = {
            stats: {
                'minecraft:custom': {
                    'minecraft:play_time': 72000,
                    'minecraft:deaths': 5,
                    'minecraft:jump': 100,
                    'minecraft:mob_kills': 8,
                    'minecraft:player_kills': 1,
                    'minecraft:walk_one_cm': 250000,
                    'minecraft:damage_dealt': 200,
                    'minecraft:damage_taken': 80,
                    'minecraft:animals_bred': 3,
                    'minecraft:fish_caught': 4,
                    'minecraft:traded_with_villager': 2,
                },
                'minecraft:mined': {
                    'minecraft:stone': 40,
                    'minecraft:diamond_ore': 2,
                    'minecraft:deepslate_diamond_ore': 1,
                },
                'minecraft:used': {
                    'minecraft:stone': 15,
                    'minecraft:diamond_pickaxe': 9,
                },
                'minecraft:crafted': { 'minecraft:torch': 4 },
                'minecraft:killed': { 'minecraft:zombie': 6, 'minecraft:player': 1 },
            },
        };
        await db.query(
            `INSERT INTO minecraft.stats_snapshots (taken_at, playday, kind, uuid, json)
             VALUES ('2026-11-21T05:00:00-05:00', '2026-11-20', 'daily', ?, ?::jsonb)
             ON CONFLICT (taken_at, uuid) DO NOTHING`,
            [UUID, JSON.stringify(snapshot)]
        );
        const deltas = [
            ['minecraft:custom', 'minecraft:play_time', 24000],
            ['minecraft:custom', 'minecraft:deaths', 2],
            ['minecraft:custom', 'minecraft:jump', 10],
            ['minecraft:mined', 'minecraft:stone', 5],
            ['minecraft:used', 'minecraft:stone', 3],
            ['minecraft:used', 'minecraft:diamond_pickaxe', 1],
            ['minecraft:killed', 'minecraft:zombie', 2],
            ['minecraft:custom', 'minecraft:walk_one_cm', 10000],
        ];
        for (const [category, stat, delta] of deltas) {
            await db.query(
                `INSERT INTO minecraft.daily_stats (playday, player, uuid, category, stat, delta)
                 VALUES ('2026-11-20', 'FixtureSteve', ?, ?, ?, ?)
                 ON CONFLICT (playday, uuid, category, stat) DO UPDATE SET delta = EXCLUDED.delta`,
                [UUID, category, stat, delta]
            );
        }
        await db.query(
            `INSERT INTO minecraft.deaths (k, ts, player, uuid, message, killer_player, rolled_back)
             VALUES ('rb-old', '2026-11-08T12:00:00-05:00', 'FixtureSteve', ?, 'old death', NULL, TRUE)
             ON CONFLICT (k) DO NOTHING`,
            [UUID]
        );
        await db.query(
            `INSERT INTO minecraft.deaths (k, ts, player, uuid, message, killer_player, rolled_back)
             VALUES ('rb-day', '2026-11-20T18:00:00-05:00', 'FixtureSteve', ?, 'day death', NULL, TRUE)
             ON CONFLICT (k) DO NOTHING`,
            [UUID]
        );
        await db.query(
            `INSERT INTO minecraft.advancements (uuid, player, advancement, earned_at)
             VALUES (?, 'FixtureSteve', 'minecraft:story/mine_stone', '2026-11-20T15:00:00-05:00')
             ON CONFLICT (uuid, advancement) DO NOTHING`,
            [UUID]
        );
        await db.query(
            `INSERT INTO minecraft.chat (k, ts, player, message)
             VALUES ('chat-secret', '2026-11-20T16:00:00-05:00', 'FixtureSteve', ?)
             ON CONFLICT (k) DO NOTHING`,
            [CHAT]
        );
        await db.query(
            `INSERT INTO minecraft.commands (k, ts, player, command)
             VALUES ('cmd-secret', '2026-11-20T16:01:00-05:00', 'FixtureSteve', ?)
             ON CONFLICT (k) DO NOTHING`,
            [COMMAND]
        );
        await db.query(
            `INSERT INTO minecraft.rejected_logins (k, ts, name, ip, reason)
             VALUES ('rej-secret', '2026-11-20T16:02:00-05:00', 'FixtureSteve', '198.51.100.20', ?)
             ON CONFLICT (k) DO NOTHING`,
            [REJECT]
        );
        await db.query(
            `INSERT INTO minecraft.ip_geo (ip, country, region, city, isp, org, asn, mobile, proxy, hosting, looked_up_at)
             VALUES (?, 'US', 'Test Region', ?, 'Example ISP', 'Example Org', 'AS64500', FALSE, FALSE, FALSE, NOW())
             ON CONFLICT (ip) DO UPDATE SET city = EXCLUDED.city`,
            [IP, CITY]
        );
        await db.query(
            `INSERT INTO minecraft.logins (k, ts, player, uuid, ip, country, region, city, isp, flags)
             VALUES ('login-a', '2026-11-20T12:00:00-05:00', 'FixtureSteve', ?, ?, 'US', 'Test Region', ?, 'Example ISP', 'new_ip')
             ON CONFLICT (k) DO NOTHING`,
            [UUID, IP, CITY]
        );
        await db.query(
            `INSERT INTO minecraft.logins (k, ts, player, uuid, ip, country, region, city, isp, flags)
             VALUES ('login-b', '2026-11-20T20:00:00-05:00', 'FixtureSteve', ?, ?, 'US', 'Test Region', ?, 'Example ISP', '')
             ON CONFLICT (k) DO NOTHING`,
            [UUID, IP, CITY]
        );
        await db.query(
            `INSERT INTO minecraft_sessions (
                activity_date, player_name, player_uuid, started_at, ended_at,
                slice_started_at, slice_ended_at, duration_seconds, end_reason, likely_afk
             ) VALUES
             ('2026-11-20', 'FixtureSteve', ?, '2026-11-20T12:00:00-05:00', '2026-11-20T12:10:00-05:00',
              '2026-11-20T12:00:00-05:00', '2026-11-20T12:10:00-05:00', 600, 'leave', FALSE),
             ('2026-11-20', 'FixtureSteve', ?, '2026-11-20T13:00:00-05:00', '2026-11-20T15:00:00-05:00',
              '2026-11-20T13:00:00-05:00', '2026-11-20T15:00:00-05:00', 6000, 'leave', TRUE)`,
            [UUID, UUID]
        );

        viewer = await registerAgent();
        admin = await registerAgent();
        await db.query('UPDATE app_users SET role = ? WHERE id = ?', ['admin', admin.user.id]);
        const relog = await admin.agent.post('/api/auth/login').send({
            email: admin.creds.email,
            password: admin.creds.password,
        });
        expect(relog.status).toBe(200);
    }, 60000);

    afterAll(async () => {
        await db.query('DELETE FROM minecraft_sessions WHERE player_uuid = ?', [UUID]);
        await db.query('DELETE FROM minecraft.daily_stats WHERE uuid = ?', [UUID]);
        await db.query('DELETE FROM minecraft.stats_snapshots WHERE uuid = ?', [UUID]);
        await db.query('DELETE FROM minecraft.deaths WHERE uuid = ?', [UUID]);
        await db.query('DELETE FROM minecraft.advancements WHERE uuid = ?', [UUID]);
        await db.query('DELETE FROM minecraft.chat WHERE k = ?', ['chat-secret']);
        await db.query('DELETE FROM minecraft.commands WHERE k = ?', ['cmd-secret']);
        await db.query('DELETE FROM minecraft.rejected_logins WHERE k = ?', ['rej-secret']);
        await db.query('DELETE FROM minecraft.logins WHERE uuid = ?', [UUID]);
        await db.query('DELETE FROM minecraft.ip_geo WHERE ip = ?', [IP]);
        await db.query('DELETE FROM minecraft.player_links WHERE minecraft_uuid = ?', [UUID]);
        await db.query('DELETE FROM minecraft.players WHERE uuid = ?', [UUID]);
        await db.query('DELETE FROM members WHERE id IN (?, ?)', [MEMBER, OTHER]);
        if (viewer?.creds?.email) await cleanupUsersByEmail(viewer.creds.email);
        if (admin?.creds?.email) await cleanupUsersByEmail(admin.creds.email);
    });

    it('requires auth and hides the section when there is no link', async () => {
        const anon = await request(app).get(`/api/members/${MEMBER}/minecraft`);
        expect(anon.status).toBe(401);

        const unlinked = await viewer.agent.get(`/api/members/${OTHER}/minecraft`);
        expect(unlinked.status).toBe(200);
        expect(unlinked.body).toEqual({ linked: false });
    });

    it('returns lifetime and playday stats without private fields', async () => {
        const res = await viewer.agent.get(`/api/members/${MEMBER}/minecraft`);
        expect(res.status).toBe(200);
        expect(res.body.linked).toBe(true);
        expect(res.body.player).toEqual({ uuid: UUID, name: 'FixtureSteve' });
        expect(res.body.skinUrl).toBeNull();
        expect(res.body.windows.latestPlayday).toBe('2026-11-20');
        expect(res.body.windows.week).toEqual({ from: '2026-11-14', to: '2026-11-20' });
        expect(res.body.windows.month.from).toBe('2026-10-22');

        expect(res.body.stats.all.playtimeSeconds).toBe(3600);
        expect(res.body.stats.all.deaths).toBe(3);
        expect(res.body.stats.all.blocksPlaced).toBe(15);
        expect(res.body.stats.all.diamondsMined).toBe(3);
        expect(res.body.stats.all.topMinedBlock.name).toBe('Stone');
        expect(res.body.stats.all.topKillerMob.id).toBe('minecraft:zombie');
        expect(res.body.stats.all.activeSeconds).toBe(600);
        expect(res.body.stats.all).not.toHaveProperty('afkSeconds');
        expect(res.body.stats.all).not.toHaveProperty('onlineSeconds');

        expect(res.body.stats.day.playtimeSeconds).toBe(1200);
        expect(res.body.stats.day.deaths).toBe(1);
        expect(res.body.stats.day.blocksPlaced).toBe(3);
        expect(res.body.stats.day.jumps).toBe(10);
        expect(res.body.stats.day.activeSeconds).toBe(600);
        expect(res.body.stats.week.playtimeSeconds).toBe(1200);

        expect(res.body.advancements.map((row) => row.name)).toContain('Stone Age');

        const banned = ['ip', 'country', 'region', 'city', 'isp', 'org', 'asn', 'mobile', 'proxy', 'hosting', 'flags'];
        const hits = [];
        walkKeys(res.body, hits, banned);
        expect(hits).toEqual([]);
        const blob = JSON.stringify(res.body);
        expect(blob).not.toContain(IP);
        expect(blob).not.toContain(CITY);
        expect(blob).not.toContain(CHAT);
        expect(blob).not.toContain(COMMAND);
        expect(blob).not.toContain(REJECT);
        expect(blob).not.toContain('198.51.100.20');
    });

    it('shows login IPs only to admins', async () => {
        const anon = await request(app).get(`/api/members/${MEMBER}/minecraft/logins`);
        expect(anon.status).toBe(401);

        const forbidden = await viewer.agent.get(`/api/members/${MEMBER}/minecraft/logins`);
        expect(forbidden.status).toBe(403);
        expect(JSON.stringify(forbidden.body)).not.toContain(IP);

        const missing = await admin.agent.get(`/api/members/${OTHER}/minecraft/logins`);
        expect(missing.status).toBe(404);

        const res = await admin.agent.get(`/api/members/${MEMBER}/minecraft/logins`);
        expect(res.status).toBe(200);
        expect(res.body.logins).toHaveLength(1);
        expect(res.body.logins[0]).toEqual(expect.objectContaining({
            ip: IP,
            city: CITY,
            country: 'US',
            isp: 'Example ISP',
            org: 'Example Org',
            asn: 'AS64500',
            count: 2,
            flags: ['new_ip'],
        }));
        const blob = JSON.stringify(res.body);
        expect(blob).not.toContain(CHAT);
        expect(blob).not.toContain(COMMAND);
        expect(blob).not.toContain(REJECT);
    });

    it('seeds player links only for Discord members that already exist', async () => {
        const existing = await db.query(
            `SELECT id FROM members WHERE id IN (${SEED_IDS.map(() => '?').join(',')})`,
            SEED_IDS
        );
        if (existing.length > 0) return;

        const placeholders = SEED_IDS.map(() => '?').join(',');
        await applySql('minecraft_player_links.sql');
        const skipped = await db.query(
            `SELECT COUNT(*)::int AS n FROM minecraft.player_links WHERE discord_user_id IN (${placeholders})`,
            SEED_IDS
        );
        expect(Number(skipped[0].n)).toBe(0);

        try {
            for (const id of SEED_IDS) {
                await db.query(
                    'INSERT INTO members (id, user_name) VALUES (?, ?) ON CONFLICT (id) DO NOTHING',
                    [id, `seed_${id}`]
                );
            }
            await applySql('minecraft_player_links.sql');
            const rows = await db.query(
                `SELECT minecraft_name FROM minecraft.player_links WHERE discord_user_id IN (${placeholders})`,
                SEED_IDS
            );
            expect(rows.map((row) => row.minecraft_name).sort()).toEqual([
                'Conkeastador',
                'EpicPigz',
                'Goated',
                'LeNelli',
                'NiftyNarwhalz',
                'TORNADOTOM50',
                'jphelps',
                'samtyclaws',
            ].sort());
        } finally {
            await db.query(
                `DELETE FROM members WHERE user_name LIKE 'seed_%' AND id IN (${placeholders})`,
                SEED_IDS
            );
        }
        const left = await db.query(
            `SELECT COUNT(*)::int AS n FROM minecraft.player_links WHERE discord_user_id IN (${placeholders})`,
            SEED_IDS
        );
        expect(Number(left[0].n)).toBe(0);
    });
});
