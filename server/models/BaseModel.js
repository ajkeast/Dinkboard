import { db } from "./database.js";

export class BaseModel {
    constructor(tableName) {
        this.tableName = tableName;
        this.db = db;
    }

    async findAll(options = {}) {
        const {
            fields = ['*'],
            where = {},
            orderBy = null,
            limit = null,
            joins = []
        } = options;

        let query = `SELECT ${fields.join(', ')} FROM ${this.tableName}`;
        
        // Add joins
        for (const join of joins) {
            query += ` ${join.type || 'JOIN'} ${join.table} ON ${join.on}`;
        }

        // Add where clauses
        const whereConditions = [];
        const params = [];
        for (const [key, value] of Object.entries(where)) {
            whereConditions.push(`${key} = ?`);
            params.push(value);
        }
        if (whereConditions.length > 0) {
            query += ` WHERE ${whereConditions.join(' AND ')}`;
        }

        // Add order by
        if (orderBy) {
            query += ` ORDER BY ${orderBy}`;
        }

        // Add limit
        if (limit) {
            query += ` LIMIT ?`;
            params.push(limit);
        }

        return await this.db.query(query, params);
    }

    async findById(id, options = {}) {
        const results = await this.findAll({
            ...options,
            where: { [`${this.tableName}.id`]: id }
        });
        return results[0];
    }

    async count(where = {}) {
        const whereConditions = [];
        const params = [];
        for (const [key, value] of Object.entries(where)) {
            whereConditions.push(`${key} = ?`);
            params.push(value);
        }

        let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
        if (whereConditions.length > 0) {
            query += ` WHERE ${whereConditions.join(' AND ')}`;
        }

        const result = await this.db.query(query, params);
        return result[0].count;
    }

    async transaction(callback) {
        return await this.db.transaction(callback);
    }
} 