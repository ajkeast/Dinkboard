import { BaseModel } from "./BaseModel.js";

export class Firsts extends BaseModel {
    constructor() {
        super('firstlist_id');
    }

    async getAll() {
        return await this.findAll({
            fields: [
                'user_id',
                'COALESCE(display_name, user_name) AS user_name',
                'timesent'
            ],
            joins: [
                {
                    table: 'members',
                    on: 'firstlist_id.user_id = members.id'
                }
            ],
            orderBy: 'timesent DESC'
        });
    }

    async getFew(limit) {
        return await this.findAll({
            fields: [
                'user_id',
                'COALESCE(display_name, user_name) AS user_name',
                'timesent'
            ],
            joins: [
                {
                    table: 'members',
                    on: 'firstlist_id.user_id = members.id'
                }
            ],
            orderBy: 'timesent DESC',
            limit
        });
    }

    async getById(id) {
        return await this.findById(id, {
            fields: [
                'user_id',
                'COALESCE(display_name, user_name) AS user_name',
                'timesent'
            ],
            joins: [
                {
                    table: 'members',
                    on: 'firstlist_id.user_id = members.id'
                }
            ]
        });
    }

    async getScore() {
        const query = `
            SELECT 
                members.id AS user_id,
                COALESCE(display_name, user_name) AS user_name, 
                COUNT(*) AS firsts,
                DATEDIFF(NOW(), MAX(timesent)) AS days_since_first
            FROM ${this.tableName}
            JOIN members ON firstlist_id.user_id = members.id
            GROUP BY user_id
            ORDER BY firsts DESC`;
        
        return await this.db.query(query);
    }

    async getCumCount() {
        const query = `
            SELECT
                COALESCE(display_name,user_name) AS user_name,
                UNIX_TIMESTAMP(timesent) AS timesent,
                ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY timesent) AS cum_count
            FROM ${this.tableName}
            JOIN members ON firstlist_id.user_id = members.id
            ORDER BY timesent ASC`;
        
        return await this.db.query(query);
    }

    // New methods for better functionality
    async createFirst(userId) {
        return await this.create({
            user_id: userId,
            timesent: new Date()
        });
    }

    async getFirstsByDateRange(startDate, endDate) {
        return await this.findAll({
            fields: [
                'user_id',
                'COALESCE(display_name, user_name) AS user_name',
                'timesent'
            ],
            joins: [
                {
                    table: 'members',
                    on: 'firstlist_id.user_id = members.id'
                }
            ],
            where: {
                'timesent >=': startDate,
                'timesent <=': endDate
            },
            orderBy: 'timesent DESC'
        });
    }

    async getUserStats(userId) {
        const query = `
            SELECT 
                COALESCE(display_name, user_name) AS user_name,
                COUNT(*) as total_firsts,
                MIN(timesent) as first_occurrence,
                MAX(timesent) as last_occurrence,
                DATEDIFF(NOW(), MAX(timesent)) as days_since_last
            FROM ${this.tableName}
            JOIN members ON firstlist_id.user_id = members.id
            WHERE user_id = ?
            GROUP BY user_id`;
        
        const results = await this.db.query(query, [userId]);
        return results[0];
    }
}