import { describe, it, expect } from 'vitest';
import {
    addDays,
    isBlockItem,
    periodWindows,
    statsFromDeltas,
    summarizeStats,
    advancementName,
} from '../services/minecraftStats.js';

describe('minecraft stat windows and totals', () => {
    it('builds playday windows from the latest daily row', () => {
        expect(addDays('2026-11-20', -6)).toBe('2026-11-14');
        expect(addDays('2026-11-20', -29)).toBe('2026-10-22');
        expect(periodWindows('2026-11-20')).toEqual({
            latestPlayday: '2026-11-20',
            day: { from: '2026-11-20', to: '2026-11-20' },
            week: { from: '2026-11-14', to: '2026-11-20' },
            month: { from: '2026-10-22', to: '2026-11-20' },
        });
        expect(periodWindows(null).day).toBeNull();
    });

    it('sums lifetime vanilla stats and treats only block items as placed', () => {
        expect(isBlockItem('minecraft:stone')).toBe(true);
        expect(isBlockItem('minecraft:diamond_pickaxe')).toBe(false);

        const summary = summarizeStats({
            'minecraft:custom': {
                'minecraft:play_time': 72000,
                'minecraft:deaths': 5,
                'minecraft:jump': 100,
                'minecraft:mob_kills': 8,
                'minecraft:player_kills': 1,
                'minecraft:walk_one_cm': 250000,
                'minecraft:sprint_one_cm': 50000,
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
            'minecraft:crafted': {
                'minecraft:stick': 6,
                'minecraft:torch': 4,
            },
            'minecraft:killed': {
                'minecraft:zombie': 6,
                'minecraft:player': 1,
            },
        }, { deathsExcluded: 2 });

        expect(summary.playtimeSeconds).toBe(3600);
        expect(summary.deaths).toBe(3);
        expect(summary.jumps).toBe(100);
        expect(summary.blocksMined).toBe(43);
        expect(summary.blocksPlaced).toBe(15);
        expect(summary.diamondsMined).toBe(3);
        expect(summary.itemsCrafted).toBe(10);
        expect(summary.distanceCm).toBe(300000);
        expect(summary.topMinedBlock).toEqual({ id: 'minecraft:stone', name: 'Stone', count: 40 });
        expect(summary.topKillerMob).toEqual({ id: 'minecraft:zombie', name: 'Zombie', count: 6 });
        expect(summary.activeSeconds).toBeNull();
    });

    it('rebuilds a stats object from daily deltas and names advancements', () => {
        const stats = statsFromDeltas([
            { category: 'minecraft:custom', stat: 'minecraft:jump', delta: 4 },
            { category: 'minecraft:custom', stat: 'minecraft:jump', delta: 1 },
            { category: 'minecraft:mined', stat: 'minecraft:dirt', delta: 9 },
        ]);
        expect(summarizeStats(stats).jumps).toBe(5);
        expect(summarizeStats(stats).blocksMined).toBe(9);
        expect(advancementName('minecraft:story/mine_stone')).toBe('Stone Age');
        expect(advancementName('minecraft:story/not_a_real_one')).toBe('Not A Real One');
    });
});
