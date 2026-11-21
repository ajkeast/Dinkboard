import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');

const BLOCK_ITEMS = new Set(
    JSON.parse(fs.readFileSync(path.join(dataDir, 'block-items.json'), 'utf8'))
        .map((name) => `minecraft:${name}`)
);

const ADVANCEMENT_TITLES = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'advancement-titles.json'), 'utf8')
);

/**
 * Playdays are 05:00–05:00 America/New_York, labeled by the morning they start.
 * Daily is the latest playday that has any minecraft.daily_stats row.
 * Weekly is that playday and the 6 before it. Monthly is that playday and the
 * 29 before it. All-time is the latest stats snapshot, not the sum of deltas
 * (deltas start 2026-11-20; the first snapshot is a baseline only).
 * activeSeconds is public.minecraft_sessions where likely_afk is false. The bot
 * sets that flag when the unbroken session is longer than 6 hours. The profile
 * does not expose the AFK portion.
 */
export const WINDOW_NOTE =
    'Daily, weekly, and monthly are playdays (05:00–05:00 America/New_York), labeled by the morning they start. '
    + 'Daily is the latest playday with any daily_stats row. Weekly is that playday and the 6 before it. '
    + 'Monthly is that playday and the 29 before it. All-time is the latest stats snapshot (lifetime), '
    + 'not the sum of daily deltas.';

const DIAMOND_ORES = ['minecraft:diamond_ore', 'minecraft:deepslate_diamond_ore'];

export function addDays(iso, days) {
    const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + days);
    return dt.toISOString().slice(0, 10);
}

export function periodWindows(latestPlayday) {
    if (!latestPlayday) {
        return { latestPlayday: null, day: null, week: null, month: null };
    }
    const end = String(latestPlayday).slice(0, 10);
    return {
        latestPlayday: end,
        day: { from: end, to: end },
        week: { from: addDays(end, -6), to: end },
        month: { from: addDays(end, -29), to: end },
    };
}

export function prettyId(id) {
    const raw = String(id || '').replace(/^minecraft:/, '').split('/').pop() || '';
    return raw
        .split('_')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export function advancementName(id) {
    return ADVANCEMENT_TITLES[id] || prettyId(id);
}

export function isBlockItem(id, mined = {}) {
    return BLOCK_ITEMS.has(id) || Object.prototype.hasOwnProperty.call(mined, id);
}

function num(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function sumValues(obj) {
    return Object.values(obj || {}).reduce((total, value) => total + num(value), 0);
}

function topEntry(obj, pred = () => true) {
    let best = null;
    for (const [id, value] of Object.entries(obj || {})) {
        const count = num(value);
        if (count <= 0 || !pred(id)) continue;
        if (!best || count > best.count) {
            best = { id, name: prettyId(id), count };
        }
    }
    return best;
}

export function summarizeStats(stats, { deathsExcluded = 0 } = {}) {
    const custom = stats?.['minecraft:custom'] || {};
    const mined = stats?.['minecraft:mined'] || {};
    const used = stats?.['minecraft:used'] || {};
    const crafted = stats?.['minecraft:crafted'] || {};
    const killed = stats?.['minecraft:killed'] || {};
    const distanceCm = Object.entries(custom)
        .filter(([id]) => id.endsWith('_one_cm'))
        .reduce((total, [, value]) => total + num(value), 0);
    const blocksPlaced = Object.entries(used).reduce((total, [id, value]) => {
        const count = num(value);
        if (!count || !isBlockItem(id, mined)) return total;
        return total + count;
    }, 0);
    const playtimeTicks = num(custom['minecraft:play_time']);
    return {
        playtimeTicks,
        playtimeSeconds: Math.round(playtimeTicks / 20),
        activeSeconds: null,
        deaths: Math.max(0, num(custom['minecraft:deaths']) - num(deathsExcluded)),
        jumps: num(custom['minecraft:jump']),
        blocksMined: sumValues(mined),
        blocksPlaced,
        mobKills: num(custom['minecraft:mob_kills']),
        playerKills: num(custom['minecraft:player_kills']),
        distanceCm,
        itemsCrafted: sumValues(crafted),
        diamondsMined: DIAMOND_ORES.reduce((total, id) => total + num(mined[id]), 0),
        villagerTrades: num(custom['minecraft:traded_with_villager']),
        animalsBred: num(custom['minecraft:animals_bred']),
        fishCaught: num(custom['minecraft:fish_caught']),
        damageDealt: num(custom['minecraft:damage_dealt']),
        damageTaken: num(custom['minecraft:damage_taken']),
        topMinedBlock: topEntry(mined),
        topKillerMob: topEntry(killed, (id) => id !== 'minecraft:player'),
    };
}

export function statsFromDeltas(rows) {
    const stats = {};
    for (const row of rows || []) {
        if (!stats[row.category]) stats[row.category] = {};
        stats[row.category][row.stat] = (stats[row.category][row.stat] || 0) + num(row.delta);
    }
    return stats;
}

export function withPresence(summary, presence) {
    if (!presence) return summary;
    return {
        ...summary,
        activeSeconds: num(presence.activeSeconds),
    };
}

export function snapshotStats(doc) {
    if (!doc) return null;
    let parsed = doc;
    if (typeof doc === 'string') {
        try {
            parsed = JSON.parse(doc);
        } catch {
            return null;
        }
    }
    if (parsed.stats && typeof parsed.stats === 'object') return parsed.stats;
    return parsed;
}
