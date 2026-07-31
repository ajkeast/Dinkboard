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
                members.avatar AS avatar,
                COUNT(*) AS firsts,
                (CURRENT_DATE - MAX(timesent)::date) AS days_since_first
            FROM ${this.tableName}
            JOIN members ON firstlist_id.user_id = members.id
            GROUP BY members.id, display_name, user_name, members.avatar
            ORDER BY firsts DESC`;
        
        return await this.db.query(query);
    }

    async getCumCount() {
        const query = `
            SELECT
                COALESCE(display_name,user_name) AS user_name,
                EXTRACT(EPOCH FROM timesent)::bigint AS timesent,
                ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY timesent) AS cum_count
            FROM ${this.tableName}
            JOIN members ON firstlist_id.user_id = members.id
            ORDER BY timesent ASC`;
        
        return await this.db.query(query);
    }
}
