import moment from 'moment-timezone';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MINUTES_PER_DAY = 1440;

export const convertToEasternTime = (utcTimestamp) => {
    return moment.utc(utcTimestamp).tz('America/New_York');
};

export const calculateMinutesAfterMidnight = (timestamp) => {
    return timestamp.hours() * 60 + timestamp.minutes() + timestamp.seconds() / 60;
};

/** Eastern calendar day as UTC midnight of that Y-M-D (for day-gap math). */
const easternDayStartMs = (easternTime) => {
    const day = easternTime.format('YYYY-MM-DD');
    return Date.parse(`${day}T00:00:00Z`);
};

/**
 * Build per-claim juice rows matching the Discord bot:
 * within-day minutes past midnight Eastern, plus 1440 per missed Eastern day.
 */
export const buildJuiceSeries = (rows) => {
    if (!Array.isArray(rows) || rows.length === 0) return [];

    const prepared = rows.map((row) => {
        const easternTime = convertToEasternTime(row.timesent);
        return {
            user_id: row.user_id,
            user_name: row.user_name,
            original_timestamp: row.timesent,
            eastern_timestamp: easternTime.format(),
            easternDayMs: easternDayStartMs(easternTime),
            withinDay: calculateMinutesAfterMidnight(easternTime),
        };
    });

    prepared.sort((a, b) => {
        const byDay = a.easternDayMs - b.easternDayMs;
        if (byDay !== 0) return byDay;
        return a.withinDay - b.withinDay;
    });

    return prepared.map((row, index) => {
        let missedDays = 0;
        if (index > 0) {
            const dayGap = Math.round(
                (row.easternDayMs - prepared[index - 1].easternDayMs) / MS_PER_DAY
            );
            missedDays = Math.max(0, dayGap - 1);
        }

        const juice = row.withinDay + missedDays * MINUTES_PER_DAY;
        const { easternDayMs, withinDay, ...rest } = row;
        return {
            ...rest,
            juice: Math.round(juice * 100) / 100,
        };
    });
};

/** @deprecated Prefer buildJuiceSeries for correct missed-day rollover. */
export const processTimestamp = (row) => {
    const [processed] = buildJuiceSeries([row]);
    return processed;
};

export const groupByUserAndSumMinutes = (processedData) => {
    const grouped = processedData.reduce((acc, curr) => {
        if (!acc[curr.user_id]) {
            acc[curr.user_id] = 0;
        }
        acc[curr.user_id] += curr.juice;
        return acc;
    }, {});

    return Object.entries(grouped).map(([user_id, total_minutes]) => ({
        user_id,
        total_juice: Math.round(total_minutes * 100) / 100,
    }));
};
