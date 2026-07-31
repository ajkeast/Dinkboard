import { BaseModel } from "./BaseModel.js";

// Whitelist of allowed groupBy values -> { generate_series step, to_char pattern }.
// groupBy comes from user input and must pass through this map.
export const GROUP_BY_INTERVALS = {
    day: { step: '1 day', timeFormat: 'YYYY-MM-DD' },
    hour: { step: '1 hour', timeFormat: 'YYYY-MM-DD HH24:00:00' },
    month: { step: '1 month', timeFormat: 'YYYY-MM' }
};

function resolveGroupBy(groupBy) {
    const entry = GROUP_BY_INTERVALS[String(groupBy).toLowerCase()];
    if (!entry) {
        const err = new Error(`Invalid groupBy value; expected one of: ${Object.keys(GROUP_BY_INTERVALS).join(', ')}`);
        err.name = 'ValidationError';
        throw err;
    }
    return entry;
}

export class AI extends BaseModel {
    constructor() {
        super('chatgpt_logs');
        this.dalleTable = 'dalle_3_prompts';
    }

    async generateDateSeries(startDate, endDate, groupBy = 'day') {
        const { step, timeFormat } = resolveGroupBy(groupBy);
        const query = `
            SELECT TO_CHAR(gs, ?) AS time_period
            FROM generate_series(?::timestamp, ?::timestamp, ?::interval) AS gs
            ORDER BY gs
        `;
        return await this.db.query(query, [timeFormat, startDate, endDate, step]);
    }

    async getChatGPTUsageByUser(startDate = null, endDate = null) {
        let query = `
            SELECT 
                m.user_name,
                COALESCE(m.display_name, m.user_name) as display_name,
                COUNT(*)::int as total_calls,
                COALESCE(SUM(input_tokens), 0)::bigint as total_input_tokens,
                COALESCE(SUM(output_tokens), 0)::bigint as total_output_tokens,
                COALESCE(SUM(total_tokens), 0)::bigint as total_tokens,
                COUNT(DISTINCT c.created_at::date)::int as days_used
            FROM ${this.tableName} c
            JOIN members m ON c.user_id = m.id`;

        const params = [];
        if (startDate && endDate) {
            query += ` WHERE c.created_at BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        }

        query += ` GROUP BY c.user_id, m.user_name, m.display_name
                  ORDER BY total_tokens DESC`;

        return await this.db.query(query, params);
    }

    async getChatGPTUsageByModel() {
        const query = `
            SELECT 
                COALESCE(NULLIF(TRIM(model), ''), 'unknown') as model,
                COUNT(*)::int as total_calls,
                COALESCE(SUM(input_tokens), 0)::bigint as total_input_tokens,
                COALESCE(SUM(output_tokens), 0)::bigint as total_output_tokens,
                COALESCE(SUM(total_tokens), 0)::bigint as total_tokens,
                COALESCE(AVG(total_tokens), 0)::float as avg_tokens_per_call
            FROM ${this.tableName}
            GROUP BY COALESCE(NULLIF(TRIM(model), ''), 'unknown')
            ORDER BY total_calls DESC`;

        return await this.db.query(query);
    }

    async getChatGPTUsageOverTime(groupBy = 'day') {
        const { timeFormat } = resolveGroupBy(groupBy);

        // ::text avoids node-pg Date objects / TZ shifts breaking series merge keys.
        const rangeQuery = `
            SELECT 
                MIN(created_at)::date::text as start_date,
                MAX(created_at)::date::text as end_date
            FROM ${this.tableName}`;
        const [dateRange] = await this.db.query(rangeQuery);
        
        if (!dateRange || !dateRange.start_date) {
            return [];
        }

        const dataQuery = `
            SELECT 
                TO_CHAR(created_at, ?) as time_period,
                COUNT(*)::int as total_calls,
                COALESCE(SUM(input_tokens), 0)::bigint as total_input_tokens,
                COALESCE(SUM(output_tokens), 0)::bigint as total_output_tokens,
                COALESCE(SUM(total_tokens), 0)::bigint as total_tokens
            FROM ${this.tableName}
            GROUP BY time_period
            ORDER BY MIN(created_at)`;

        const data = await this.db.query(dataQuery, [timeFormat]);

        if (String(groupBy).toLowerCase() === 'hour') {
            return data;
        }

        const dateSeries = await this.generateDateSeries(
            dateRange.start_date,
            dateRange.end_date,
            groupBy
        );

        return dateSeries.map(date => {
            const matchingData = data.find(d => d.time_period === date.time_period);
            return {
                time_period: date.time_period,
                total_calls: matchingData ? Number(matchingData.total_calls) || 0 : 0,
                total_input_tokens: matchingData ? Number(matchingData.total_input_tokens) || 0 : 0,
                total_output_tokens: matchingData ? Number(matchingData.total_output_tokens) || 0 : 0,
                total_tokens: matchingData ? Number(matchingData.total_tokens) || 0 : 0
            };
        });
    }

    async getRecentChatGPTLogs(limit = 50) {
        return await this.findAll({
            fields: [
                'chatgpt_logs.*',
                'COALESCE(m.display_name, m.user_name) as user_name'
            ],
            joins: [{
                table: 'members m',
                on: 'chatgpt_logs.user_id = m.id'
            }],
            orderBy: 'created_at DESC',
            limit
        });
    }

    async getDalleUsageByUser(startDate = null, endDate = null) {
        let query = `
            SELECT 
                m.user_name,
                COALESCE(m.display_name, m.user_name) as display_name,
                COUNT(*)::int as total_prompts,
                COUNT(DISTINCT d.timesent::date)::int as days_used
            FROM ${this.dalleTable} d
            JOIN members m ON d.user_id = m.id`;

        const params = [];
        if (startDate && endDate) {
            query += ` WHERE d.timesent BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        }

        query += ` GROUP BY d.user_id, m.user_name, m.display_name
                  ORDER BY total_prompts DESC`;

        return await this.db.query(query, params);
    }

    async getDalleUsageOverTime(groupBy = 'day') {
        const { timeFormat } = resolveGroupBy(groupBy);

        const rangeQuery = `
            SELECT 
                MIN(timesent)::date::text as start_date,
                MAX(timesent)::date::text as end_date
            FROM ${this.dalleTable}`;
        const [dateRange] = await this.db.query(rangeQuery);
        
        if (!dateRange || !dateRange.start_date) {
            return [];
        }

        const dataQuery = `
            SELECT 
                TO_CHAR(timesent, ?) as time_period,
                COUNT(*)::int as total_prompts
            FROM ${this.dalleTable}
            GROUP BY time_period
            ORDER BY MIN(timesent)`;

        const data = await this.db.query(dataQuery, [timeFormat]);

        if (String(groupBy).toLowerCase() === 'hour') {
            return data;
        }

        const dateSeries = await this.generateDateSeries(
            dateRange.start_date,
            dateRange.end_date,
            groupBy
        );

        return dateSeries.map(date => ({
            time_period: date.time_period,
            total_prompts: Number(
                data.find(d => d.time_period === date.time_period)?.total_prompts
            ) || 0
        }));
    }

    async getRecentDallePrompts(limit = 50) {
        const query = `
            SELECT 
                d.*,
                COALESCE(m.display_name, m.user_name) as user_name
            FROM ${this.dalleTable} d
            JOIN members m ON d.user_id = m.id
            ORDER BY timesent DESC
            LIMIT ?`;

        return await this.db.query(query, [limit]);
    }

    async getAIUsageStats() {
        const query = `
            SELECT
                (
                    SELECT COUNT(*) 
                    FROM ${this.tableName}
                    WHERE created_at::date = CURRENT_DATE
                ) as chatgpt_today,
                (
                    SELECT COUNT(*) 
                    FROM ${this.dalleTable}
                    WHERE timesent::date = CURRENT_DATE
                ) as dalle_today,
                (
                    SELECT COUNT(*) 
                    FROM ${this.tableName}
                    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
                ) as chatgpt_last_30_days,
                (
                    SELECT COUNT(*) 
                    FROM ${this.dalleTable}
                    WHERE timesent >= CURRENT_DATE - INTERVAL '30 days'
                ) as dalle_last_30_days,
                (
                    SELECT COUNT(*) 
                    FROM ${this.tableName}
                    WHERE created_at >= CURRENT_DATE - INTERVAL '60 days'
                      AND created_at < CURRENT_DATE - INTERVAL '30 days'
                ) as chatgpt_prev_30_days,
                (
                    SELECT COUNT(*) 
                    FROM ${this.dalleTable}
                    WHERE timesent >= CURRENT_DATE - INTERVAL '60 days'
                      AND timesent < CURRENT_DATE - INTERVAL '30 days'
                ) as dalle_prev_30_days,
                (
                    SELECT COALESCE(SUM(total_tokens), 0)::bigint
                    FROM ${this.tableName}
                    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
                ) as total_tokens_last_30_days,
                (
                    SELECT COALESCE(SUM(total_tokens), 0)::bigint
                    FROM ${this.tableName}
                    WHERE created_at >= CURRENT_DATE - INTERVAL '60 days'
                      AND created_at < CURRENT_DATE - INTERVAL '30 days'
                ) as total_tokens_prev_30_days`;

        const result = await this.db.query(query);
        return result[0];
    }
}
