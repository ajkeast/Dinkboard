import { BaseModel } from "./BaseModel.js";

/** Map range → lookback days (current window length). */
export const RANGE_DAYS = {
    week: 7,
    month: 30,
    year: 365,
};

/**
 * Inclusive date windows for the current and prior period.
 * Current: [today - (days-1), today]
 * Prior:   [currentStart - days, currentStart - 1 day]
 */
export function rangeWindows(range = "month") {
    const days = RANGE_DAYS[range] ?? RANGE_DAYS.month;
    const end = new Date();
    end.setHours(0, 0, 0, 0);

    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));

    const priorEnd = new Date(start);
    priorEnd.setDate(priorEnd.getDate() - 1);

    const priorStart = new Date(priorEnd);
    priorStart.setDate(priorStart.getDate() - (days - 1));

    const fmt = (d) => d.toISOString().slice(0, 10);
    return {
        days,
        startDate: fmt(start),
        endDate: fmt(end),
        priorStartDate: fmt(priorStart),
        priorEndDate: fmt(priorEnd),
        groupBy: range === "year" ? "month" : "day",
    };
}

const AGG_SELECT = `
    COUNT(*) AS scored_count,
    ROUND(AVG(ms.polarity_score), 4) AS avg_score,
    SUM(ms.polarity = 'positive') AS positive_count,
    SUM(ms.polarity = 'negative') AS negative_count,
    SUM(ms.polarity = 'neutral') AS neutral_count,
    SUM(ms.polarity = 'mixed') AS mixed_count,
    SUM(ms.sarcasm = 1) AS sarcasm_count,
    SUM(ms.toxicity = 'none') AS toxicity_none,
    SUM(ms.toxicity = 'mild') AS toxicity_mild,
    SUM(ms.toxicity = 'moderate') AS toxicity_moderate,
    SUM(ms.toxicity = 'severe') AS toxicity_severe
`;

function emptyAgg() {
    return {
        scored_count: 0,
        avg_score: 0,
        positive_count: 0,
        negative_count: 0,
        neutral_count: 0,
        mixed_count: 0,
        sarcasm_count: 0,
        toxicity_none: 0,
        toxicity_mild: 0,
        toxicity_moderate: 0,
        toxicity_severe: 0,
    };
}

function normalizeAgg(row) {
    if (!row) return emptyAgg();
    return {
        scored_count: Number(row.scored_count) || 0,
        avg_score: Number(row.avg_score) || 0,
        positive_count: Number(row.positive_count) || 0,
        negative_count: Number(row.negative_count) || 0,
        neutral_count: Number(row.neutral_count) || 0,
        mixed_count: Number(row.mixed_count) || 0,
        sarcasm_count: Number(row.sarcasm_count) || 0,
        toxicity_none: Number(row.toxicity_none) || 0,
        toxicity_mild: Number(row.toxicity_mild) || 0,
        toxicity_moderate: Number(row.toxicity_moderate) || 0,
        toxicity_severe: Number(row.toxicity_severe) || 0,
    };
}

export class Sentiment extends BaseModel {
    constructor() {
        super("message_sentiment");
    }

    async getAggForWindow(startDate, endDate, memberId = null) {
        const params = [startDate, endDate];
        let memberClause = "";
        if (memberId) {
            memberClause = " AND CAST(m.member_id AS CHAR(20)) = ?";
            params.push(String(memberId));
        }

        const query = `
            SELECT ${AGG_SELECT}
            FROM ${this.tableName} ms
            JOIN messages m ON m.id = ms.message_id
            WHERE m.created_at >= ? AND m.created_at < DATE_ADD(?, INTERVAL 1 DAY)
            ${memberClause}
        `;
        const rows = await this.db.query(query, params);
        return normalizeAgg(rows[0]);
    }

    async getStats(range = "month") {
        const windows = rangeWindows(range);
        const [current, prior] = await Promise.all([
            this.getAggForWindow(windows.startDate, windows.endDate),
            this.getAggForWindow(windows.priorStartDate, windows.priorEndDate),
        ]);
        return { range, ...windows, current, prior };
    }

    async getTimeline(range = "month") {
        const windows = rangeWindows(range);
        const timeFormat = windows.groupBy === "month" ? "%Y-%m" : "%Y-%m-%d";

        const query = `
            SELECT
                DATE_FORMAT(m.created_at, ?) AS period,
                COUNT(*) AS scored_count,
                ROUND(AVG(ms.polarity_score), 4) AS avg_score,
                SUM(ms.polarity = 'positive') AS positive_count,
                SUM(ms.polarity = 'negative') AS negative_count,
                SUM(ms.polarity = 'neutral') AS neutral_count,
                SUM(ms.polarity = 'mixed') AS mixed_count
            FROM ${this.tableName} ms
            JOIN messages m ON m.id = ms.message_id
            WHERE m.created_at >= ? AND m.created_at < DATE_ADD(?, INTERVAL 1 DAY)
            GROUP BY period
            ORDER BY period ASC
        `;
        const rows = await this.db.query(query, [
            timeFormat,
            windows.startDate,
            windows.endDate,
        ]);

        return {
            range,
            groupBy: windows.groupBy,
            startDate: windows.startDate,
            endDate: windows.endDate,
            points: rows.map((r) => ({
                period: r.period,
                scored_count: Number(r.scored_count) || 0,
                avg_score: Number(r.avg_score) || 0,
                positive_count: Number(r.positive_count) || 0,
                negative_count: Number(r.negative_count) || 0,
                neutral_count: Number(r.neutral_count) || 0,
                mixed_count: Number(r.mixed_count) || 0,
            })),
        };
    }

    async getEmotionBundles(range = "month", memberId = null) {
        const windows = rangeWindows(range);
        const params = [windows.startDate, windows.endDate];
        let memberClause = "";
        if (memberId) {
            memberClause = " AND CAST(m.member_id AS CHAR(20)) = ?";
            params.push(String(memberId));
        }

        const query = `
            SELECT ms.emotions, COUNT(*) AS cnt
            FROM ${this.tableName} ms
            JOIN messages m ON m.id = ms.message_id
            WHERE m.created_at >= ? AND m.created_at < DATE_ADD(?, INTERVAL 1 DAY)
            ${memberClause}
            GROUP BY ms.emotions
        `;
        return this.db.query(query, params);
    }

    async getAllTimeEmotionBundles(memberId) {
        const query = `
            SELECT ms.emotions, COUNT(*) AS cnt
            FROM ${this.tableName} ms
            JOIN messages m ON m.id = ms.message_id
            WHERE CAST(m.member_id AS CHAR(20)) = ?
            GROUP BY ms.emotions
        `;
        return this.db.query(query, [String(memberId)]);
    }

    async getMembers(range = "month", minMessages = 20) {
        const windows = rangeWindows(range);
        const query = `
            SELECT
                CAST(m.member_id AS CHAR(20)) AS member_id,
                COALESCE(mem.display_name, mem.user_name) AS display_name,
                mem.user_name,
                mem.avatar,
                COUNT(*) AS scored_count,
                ROUND(AVG(ms.polarity_score), 4) AS avg_score,
                SUM(ms.polarity = 'positive') AS positive_count,
                SUM(ms.polarity = 'negative') AS negative_count,
                SUM(ms.polarity = 'neutral') AS neutral_count,
                SUM(ms.polarity = 'mixed') AS mixed_count,
                SUM(ms.sarcasm = 1) AS sarcasm_count,
                SUM(ms.toxicity != 'none') AS toxicity_count
            FROM ${this.tableName} ms
            JOIN messages m ON m.id = ms.message_id
            JOIN members mem ON CAST(mem.id AS CHAR(20)) = CAST(m.member_id AS CHAR(20))
            WHERE m.created_at >= ? AND m.created_at < DATE_ADD(?, INTERVAL 1 DAY)
            GROUP BY m.member_id, mem.display_name, mem.user_name, mem.avatar
            HAVING scored_count >= ?
            ORDER BY avg_score DESC
        `;
        const rows = await this.db.query(query, [
            windows.startDate,
            windows.endDate,
            minMessages,
        ]);

        return {
            range,
            startDate: windows.startDate,
            endDate: windows.endDate,
            minMessages,
            members: rows.map((r) => {
                const scored = Number(r.scored_count) || 0;
                const toxicityCount = Number(r.toxicity_count) || 0;
                return {
                    member_id: String(r.member_id),
                    display_name: r.display_name,
                    user_name: r.user_name,
                    avatar: r.avatar,
                    scored_count: scored,
                    avg_score: Number(r.avg_score) || 0,
                    positive_count: Number(r.positive_count) || 0,
                    negative_count: Number(r.negative_count) || 0,
                    neutral_count: Number(r.neutral_count) || 0,
                    mixed_count: Number(r.mixed_count) || 0,
                    sarcasm_count: Number(r.sarcasm_count) || 0,
                    sarcasm_rate: scored ? Number(r.sarcasm_count) / scored : 0,
                    toxicity_count: toxicityCount,
                    toxicity_rate: scored ? toxicityCount / scored : 0,
                };
            }),
        };
    }

    async getMemberAgg(memberId, range = null) {
        if (range) {
            const windows = rangeWindows(range);
            return this.getAggForWindow(
                windows.startDate,
                windows.endDate,
                memberId
            );
        }

        const query = `
            SELECT ${AGG_SELECT}
            FROM ${this.tableName} ms
            JOIN messages m ON m.id = ms.message_id
            WHERE CAST(m.member_id AS CHAR(20)) = ?
        `;
        const rows = await this.db.query(query, [String(memberId)]);
        return normalizeAgg(rows[0]);
    }
}
