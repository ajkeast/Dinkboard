import { BaseModel } from "./BaseModel.js";

export class Messages extends BaseModel {
    constructor() {
        super('messages');
    }

    async getAll() {
        return await this.findAll({
            fields: [
                'CAST(messages.id AS TEXT) AS id',
                'COALESCE(display_name, user_name) AS user_name',
                "CONCAT('#', channel_name) AS channel_name",
                'content',
                'messages.created_at',
                'messages.last_updated'
            ],
            joins: [
                {
                    table: 'members',
                    on: 'messages.member_id = members.id'
                },
                {
                    table: 'channels',
                    on: 'messages.channel_id = channels.id'
                }
            ],
            orderBy: 'created_at DESC',
            limit: 100
        });
    }

    async getByChannel() {
        const query = `
            SELECT 
                channel_name,
                COUNT(*) AS messages
            FROM ${this.tableName}
            JOIN channels on channel_id = channels.id
            GROUP BY channel_id, channel_name
            ORDER BY COUNT(*)`;
        
        return await this.db.query(query);
    }

    async getById(id) {
        return await this.findById(id, {
            fields: [
                'CAST(messages.id AS TEXT) AS id',
                'COALESCE(display_name, user_name) AS user_name',
                "CONCAT('#', channel_name) AS channel_name",
                'content',
                'messages.created_at',
                'messages.last_updated'
            ],
            joins: [
                {
                    table: 'members',
                    on: 'messages.member_id = members.id'
                },
                {
                    table: 'channels',
                    on: 'messages.channel_id = channels.id'
                }
            ]
        });
    }

    async getByMember() {
        const query = `
            SELECT
                members.id AS user_id,
                COALESCE(display_name, user_name) AS user_name,
                COUNT(*) AS messages
            FROM ${this.tableName}
            JOIN members ON messages.member_id = members.id
            GROUP BY members.id, display_name, user_name`;
        
        return await this.db.query(query);
    }

    async getByMonth() {
        const query = `
            SELECT
                TO_CHAR(messages.created_at, 'Mon YYYY') AS month,
                COUNT(*) AS messages
            FROM ${this.tableName}
            JOIN members ON messages.member_id = members.id
            WHERE messages.created_at > '2017-08-01'
            GROUP BY TO_CHAR(messages.created_at, 'YYYY-MM'), TO_CHAR(messages.created_at, 'Mon YYYY')
            ORDER BY TO_CHAR(messages.created_at, 'YYYY-MM')`;
        
        return await this.db.query(query);
    }

    async getByMonthByMember() {
        const query = `
            SELECT
                TO_CHAR(messages.created_at, 'Mon YYYY') AS month,
                COALESCE(display_name, user_name) AS user_name,
                COUNT(*) AS messages
            FROM ${this.tableName}
            JOIN members ON messages.member_id = members.id
            WHERE messages.created_at >= DATE_TRUNC('month', NOW() - INTERVAL '11 months')
            GROUP BY TO_CHAR(messages.created_at, 'YYYY-MM'), TO_CHAR(messages.created_at, 'Mon YYYY'),
                     COALESCE(display_name, user_name)
            ORDER BY TO_CHAR(messages.created_at, 'YYYY-MM')`;
        
        return await this.db.query(query);
    }

    /**
     * Sparse daily message counts for one member in [startDate, endDate] (inclusive).
     * Dates are YYYY-MM-DD strings. Empty days are omitted — fill on the client.
     */
    async getByDayByMember(memberId, startDate, endDate) {
        const query = `
            SELECT
                TO_CHAR(created_at, 'YYYY-MM-DD') AS date,
                COUNT(*) AS messages
            FROM ${this.tableName}
            WHERE member_id = ?
              AND created_at >= ?
              AND created_at < (?::date + INTERVAL '1 day')
            GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
            ORDER BY date`;

        return await this.db.query(query, [memberId, startDate, endDate]);
    }

    async getChannelsByMember(memberId) {
        const query = `
            SELECT
                channels.channel_name,
                COUNT(*) AS messages
            FROM ${this.tableName}
            JOIN channels ON messages.channel_id = channels.id
            WHERE messages.member_id = ?
            GROUP BY messages.channel_id, channels.channel_name
            ORDER BY messages DESC`;

        return await this.db.query(query, [memberId]);
    }

    async getMemberSummary(memberId) {
        const query = `
            SELECT
                COUNT(*) AS total_messages,
                COUNT(DISTINCT created_at::date) AS active_days,
                TO_CHAR(MIN(created_at), 'YYYY-MM-DD') AS first_message_date,
                TO_CHAR(MAX(created_at), 'YYYY-MM-DD') AS last_message_date
            FROM ${this.tableName}
            WHERE member_id = ?`;

        const rows = await this.db.query(query, [memberId]);
        return rows[0] ?? {
            total_messages: 0,
            active_days: 0,
            first_message_date: null,
            last_message_date: null,
        };
    }

    // TODO(M7): return result[0] (object) once the frontend StatBox consumers
    // stop indexing into the 1-row array. Kept array-shaped for now on purpose.
    async getStats() {
        const query = `
            SELECT
                (
                    SELECT COUNT(*) 
                    FROM ${this.tableName}
                    WHERE created_at::date BETWEEN DATE_TRUNC('month', NOW())::date AND NOW()::date
                ) AS "thisMTD",
                (
                    SELECT COUNT(*) 
                    FROM ${this.tableName}
                    WHERE created_at::date BETWEEN DATE_TRUNC('month', NOW() - INTERVAL '1 month')::date
                      AND (NOW() - INTERVAL '1 month')::date
                ) AS "lastMTD",
                (
                    SELECT COUNT(*) 
                    FROM ${this.tableName}
                    WHERE created_at::date BETWEEN DATE_TRUNC('year', NOW())::date AND NOW()::date
                ) AS "thisYTD",
                (
                    SELECT COUNT(*) 
                    FROM ${this.tableName}
                    WHERE created_at::date BETWEEN DATE_TRUNC('year', NOW() - INTERVAL '1 year')::date
                      AND (NOW() - INTERVAL '1 year')::date
                ) AS "lastYTD"`;
        
        return await this.db.query(query);
    }
}
