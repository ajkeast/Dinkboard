import { BaseModel } from "./BaseModel.js";

export class Emojis extends BaseModel {
    constructor() {
        super('emojis');
    }

    async getAll() {
        const query = `
            SELECT
                e.id,
                e.emoji_name,
                e.url,
                DATE_FORMAT(e.created_at, '%b %e, %Y') AS created_at,
                e.last_updated,
                COALESCE(occurences, 0) AS occurrences
            FROM ${this.tableName} as e
            LEFT JOIN (
                SELECT
                    emojis.id,
                    emojis.emoji_name,
                    COUNT(*) AS occurences
                FROM ${this.tableName}
                JOIN messages m ON LOCATE(CONCAT(':', emojis.emoji_name, ':'), m.content) > 0
                GROUP BY emojis.id
            ) AS subquery ON e.id = subquery.id`;
        
        return await this.db.query(query);
    }

    async getCount() {
        const query = `
            SELECT
                emoji_name,
                COUNT(*) AS occurences
            FROM ${this.tableName}
            JOIN messages ON LOCATE(CONCAT(':',emoji_name,':'), content) > 0
            GROUP BY emojis.id`;
        
        return await this.db.query(query);
    }

    async getById(id) {
        return await this.findById(id);
    }
}
