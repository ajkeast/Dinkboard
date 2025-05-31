import { BaseModel } from "./BaseModel.js";

export class Messages extends BaseModel {
    constructor() {
        super('messages');
    }

    async getAll() {
        return await this.findAll({
            fields: [
                'CAST(messages.id AS VARCHAR(20)) AS id',
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
                'CAST(messages.id AS VARCHAR(20)) AS id',
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
            GROUP BY DATE_FORMAT(messages.created_at, '%Y-%m')`;
        
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
            GROUP BY DATE_FORMAT(messages.created_at, '%Y-%m'), user_name`;
        
        return await this.db.query(query);
    }

    // New methods for better functionality
    async createMessage(data) {
        const { member_id, channel_id, content } = data;
        return await this.create({
            member_id,
            channel_id,
            content,
            created_at: new Date(),
            last_updated: new Date()
        });
    }

    async updateMessage(id, content) {
        return await this.update(id, {
            content,
            last_updated: new Date()
        });
    }

    async getMessagesByDateRange(startDate, endDate) {
        return await this.findAll({
            fields: [
                'CAST(messages.id AS VARCHAR(20)) AS id',
                'COALESCE(display_name, user_name) AS user_name',
                "CONCAT('#', channel_name) AS channel_name",
                'content',
                'messages.created_at'
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
            where: {
                'messages.created_at >=': startDate,
                'messages.created_at <=': endDate
            },
            orderBy: 'messages.created_at DESC'
        });
    }

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

