import { describe, it, expect } from 'vitest';
import {
    buildJuiceSeries,
    groupByUserAndSumMinutes,
} from '../utils/timestamp.utils.js';

/** UTC wall-clock → Date, matching PG TIMESTAMP parsed as UTC. */
const utc = (s) => new Date(`${s.replace(' ', 'T')}Z`);

describe('buildJuiceSeries (Discord bot parity)', () => {
    it('counts minutes past midnight Eastern for a noon EST claim', () => {
        // 17:00 UTC = 12:00 EST
        const series = buildJuiceSeries([
            { user_id: '111', user_name: 'a', timesent: utc('2024-01-15 17:00:00') },
        ]);
        expect(series).toHaveLength(1);
        expect(series[0].juice).toBe(720);
    });

    it('adds 1440 juice per missed Eastern day', () => {
        // Two noon-EST claims with one calendar day gap → 720 + (720 + 1440)
        const series = buildJuiceSeries([
            { user_id: '111', user_name: 'a', timesent: utc('2024-01-01 17:00:00') },
            { user_id: '111', user_name: 'a', timesent: utc('2024-01-03 17:00:00') },
        ]);
        const total = groupByUserAndSumMinutes(series)[0].total_juice;
        expect(total).toBe(2880);
    });

    it('treats midnight Eastern claims as ~0 juice (not UTC offset)', () => {
        // 04:00 UTC in summer = 00:00 EDT
        const series = buildJuiceSeries([
            { user_id: '111', user_name: 'a', timesent: utc('2026-07-31 04:00:00') },
        ]);
        expect(series[0].juice).toBe(0);
    });

    it('parses bare datetime strings as UTC wall-clock', () => {
        const series = buildJuiceSeries([
            { user_id: '111', user_name: 'a', timesent: '2026-07-31 04:00:00' },
        ]);
        expect(series[0].juice).toBe(0);
    });
});
