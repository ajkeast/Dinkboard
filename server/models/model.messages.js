import { BaseModel } from "./BaseModel.js";

export class Messages extends BaseModel {
    constructor() {
        super('messages');
    }

    async getAll() {
        return await this.findAll({
            fields: [
                'CAST(messages.id AS CHAR(20)) AS id',
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
            GROUP BY channel_id
            ORDER BY COUNT(*)`;
        
        return await this.db.query(query);
    }

    async getById(id) {
        return await this.findById(id, {
            fields: [
                'CAST(messages.id AS CHAR(20)) AS id',
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
                members.id AS 'user_id',
                COALESCE(display_name, user_name) AS user_name,
                COUNT(*) AS 'messages'
            FROM ${this.tableName}
            JOIN members ON messages.member_id = members.id
            GROUP BY messages.member_id`;
        
        return await this.db.query(query);
    }

    async getByMonth() {
        const query = `
            SELECT
                DATE_FORMAT(messages.created_at, '%b %Y') AS 'month',
                COUNT(*) AS 'messages'
            FROM ${this.tableName}
            JOIN members ON messages.member_id = members.id
            WHERE messages.created_at > '2017-08-01'
            GROUP BY DATE_FORMAT(messages.created_at, '%Y-%m')
            ORDER BY DATE_FORMAT(messages.created_at, '%Y-%m')`;
        
        return await this.db.query(query);
    }

    async getByMonthByMember() {
        const query = `
            SELECT
                DATE_FORMAT(messages.created_at, '%b %Y') AS 'month',
                COALESCE(display_name, user_name) AS user_name,
                COUNT(*) AS 'messages'
            FROM ${this.tableName}
            JOIN members ON messages.member_id = members.id
            WHERE messages.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(messages.created_at, '%Y-%m'), user_name
            ORDER BY DATE_FORMAT(messages.created_at, '%Y-%m')`;
        
        return await this.db.query(query);
    }

    /**
     * Sparse daily message counts for one member in [startDate, endDate] (inclusive).
     * Dates are YYYY-MM-DD strings. Empty days are omitted — fill on the client.
     */
    async getByDayByMember(memberId, startDate, endDate) {
        const query = `
            SELECT
                DATE_FORMAT(created_at, '%Y-%m-%d') AS date,
                COUNT(*) AS messages
            FROM ${this.tableName}
            WHERE member_id = ?
              AND created_at >= ?
              AND created_at < DATE_ADD(?, INTERVAL 1 DAY)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
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
            GROUP BY messages.channel_id
            ORDER BY messages DESC`;

        return await this.db.query(query, [memberId]);
    }

    async getMemberSummary(memberId) {
        const query = `
            SELECT
                COUNT(*) AS total_messages,
                COUNT(DISTINCT DATE(created_at)) AS active_days,
                DATE_FORMAT(MIN(created_at), '%Y-%m-%d') AS first_message_date,
                DATE_FORMAT(MAX(created_at), '%Y-%m-%d') AS last_message_date
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
                    WHERE DATE_FORMAT(created_at, '%Y-%m-%d') BETWEEN DATE_FORMAT(NOW(), '%Y-%m-01') AND NOW()
                ) AS thisMTD,
                (
                    SELECT COUNT(*) 
                    FROM ${this.tableName}
                    WHERE DATE_FORMAT(created_at, '%Y-%m-%d') BETWEEN DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y-%m-01') AND DATE_SUB(NOW(), INTERVAL 1 MONTH)
                ) AS lastMTD,
                (
                    SELECT COUNT(*) 
                    FROM ${this.tableName}
                    WHERE DATE_FORMAT(created_at, '%Y-%m-%d') BETWEEN DATE_FORMAT(NOW(), '%Y-01-01') AND NOW()
                ) AS thisYTD,
                (
                    SELECT COUNT(*) 
                    FROM ${this.tableName}
                    WHERE DATE_FORMAT(created_at, '%Y-%m-%d') BETWEEN DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 YEAR), '%Y-01-01') AND DATE_SUB(NOW(), INTERVAL 1 YEAR)
                ) AS lastYTD`;
        
        return await this.db.query(query);
    }
}

