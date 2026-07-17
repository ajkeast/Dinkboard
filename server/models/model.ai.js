import { BaseModel } from "./BaseModel.js";

// Whitelist of allowed groupBy values -> { SQL interval keyword, DATE_FORMAT pattern }.
// groupBy comes from user input and the interval is interpolated into SQL, so it
// MUST pass through this map (never interpolate the raw value).
export const GROUP_BY_INTERVALS = {
    day: { interval: 'DAY', timeFormat: '%Y-%m-%d' },
    hour: { interval: 'HOUR', timeFormat: '%Y-%m-%d %H:00:00' },
    month: { interval: 'MONTH', timeFormat: '%Y-%m' }
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

    // Helper method to generate date series. The series is formatted with the
    // same DATE_FORMAT pattern as the data query so the merge keys line up
    // (raw DATE values never matched the formatted strings, yielding zeros).
    async generateDateSeries(startDate, endDate, groupBy = 'day') {
        const { interval, timeFormat } = resolveGroupBy(groupBy);
        const query = `
            WITH RECURSIVE date_series AS (
                SELECT DATE(?) as date
                UNION ALL
                SELECT DATE_ADD(date, INTERVAL 1 ${interval})
                FROM date_series
                WHERE date < DATE(?)
            )
            SELECT DISTINCT DATE_FORMAT(date, ?) as time_period FROM date_series
        `;
        return await this.db.query(query, [startDate, endDate, timeFormat]);
    }

    // ChatGPT Logs Methods
    async getChatGPTUsageByUser(startDate = null, endDate = null) {
        let query = `
            SELECT 
                m.user_name,
                COALESCE(m.display_name, m.user_name) as display_name,
                COUNT(*) as total_calls,
                SUM(input_tokens) as total_input_tokens,
                SUM(output_tokens) as total_output_tokens,
                SUM(total_tokens) as total_tokens,
                COUNT(DISTINCT DATE(c.created_at)) as days_used
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
                model,
                COUNT(*) as total_calls,
                SUM(input_tokens) as total_input_tokens,
                SUM(output_tokens) as total_output_tokens,
                SUM(total_tokens) as total_tokens,
                AVG(total_tokens) as avg_tokens_per_call
            FROM ${this.tableName}
            GROUP BY model
            ORDER BY total_calls DESC`;

        return await this.db.query(query);
    }

    async getChatGPTUsageOverTime(groupBy = 'day') {
        const { timeFormat } = resolveGroupBy(groupBy);

        // Get date range
        const rangeQuery = `
            SELECT 
                DATE(MIN(created_at)) as start_date,
                DATE(MAX(created_at)) as end_date
            FROM ${this.tableName}`;
        const [dateRange] = await this.db.query(rangeQuery);
        
        if (!dateRange || !dateRange.start_date) {
            return [];
        }

        const dataQuery = `
            SELECT 
                DATE_FORMAT(created_at, ?) as time_period,
                COUNT(*) as total_calls,
                SUM(input_tokens) as total_input_tokens,
                SUM(output_tokens) as total_output_tokens,
                SUM(total_tokens) as total_tokens
            FROM ${this.tableName}
            GROUP BY time_period
            ORDER BY MIN(created_at)`;

        const data = await this.db.query(dataQuery, [timeFormat]);

        // Hourly series over the full history would blow past MySQL's CTE
        // recursion cap; return sparse rows (only hours with activity).
        if (String(groupBy).toLowerCase() === 'hour') {
            return data;
        }

        // Generate complete date series and zero-fill gaps
        const dateSeries = await this.generateDateSeries(
            dateRange.start_date,
            dateRange.end_date,
            groupBy
        );

        return dateSeries.map(date => {
            const matchingData = data.find(d => d.time_period === date.time_period);
            return {
                time_period: date.time_period,
                total_calls: matchingData ? matchingData.total_calls : 0,
                total_input_tokens: matchingData ? matchingData.total_input_tokens : 0,
                total_output_tokens: matchingData ? matchingData.total_output_tokens : 0,
                total_tokens: matchingData ? matchingData.total_tokens : 0
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

    // DALL-E 3 Methods
    async getDalleUsageByUser(startDate = null, endDate = null) {
        let query = `
            SELECT 
                m.user_name,
                COALESCE(m.display_name, m.user_name) as display_name,
                COUNT(*) as total_prompts,
                COUNT(DISTINCT DATE(d.timesent)) as days_used
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

        // Get date range
        const rangeQuery = `
            SELECT 
                DATE(MIN(timesent)) as start_date,
                DATE(MAX(timesent)) as end_date
            FROM ${this.dalleTable}`;
        const [dateRange] = await this.db.query(rangeQuery);
        
        if (!dateRange || !dateRange.start_date) {
            return [];
        }

        const dataQuery = `
            SELECT 
                DATE_FORMAT(timesent, ?) as time_period,
                COUNT(*) as total_prompts
            FROM ${this.dalleTable}
            GROUP BY time_period
            ORDER BY MIN(timesent)`;

        const data = await this.db.query(dataQuery, [timeFormat]);

        // See getChatGPTUsageOverTime: sparse rows for hourly grouping.
        if (String(groupBy).toLowerCase() === 'hour') {
            return data;
        }

        // Generate complete date series and zero-fill gaps
        const dateSeries = await this.generateDateSeries(
            dateRange.start_date,
            dateRange.end_date,
            groupBy
        );

        return dateSeries.map(date => ({
            time_period: date.time_period,
            total_prompts: data.find(d => d.time_period === date.time_period)?.total_prompts || 0
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

    // Combined AI Usage Stats
    async getAIUsageStats() {
        const query = `
            SELECT
                (
                    SELECT COUNT(*) 
                    FROM ${this.tableName}
                    WHERE DATE(created_at) = CURDATE()
                ) as chatgpt_today,
                (
                    SELECT COUNT(*) 
                    FROM ${this.dalleTable}
                    WHERE DATE(timesent) = CURDATE()
                ) as dalle_today,
                (
                    SELECT COUNT(*) 
                    FROM ${this.tableName}
                    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                ) as chatgpt_last_30_days,
                (
                    SELECT COUNT(*) 
                    FROM ${this.dalleTable}
                    WHERE timesent >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                ) as dalle_last_30_days,
                (
                    SELECT SUM(total_tokens)
                    FROM ${this.tableName}
                    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                ) as total_tokens_last_30_days`;

        const result = await this.db.query(query);
        // Single-row aggregate: return the object, not a 1-element array.
        return result[0];
    }
} 