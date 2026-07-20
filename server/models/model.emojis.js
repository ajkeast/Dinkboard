import { BaseModel } from "./BaseModel.js";
import { sqlMessageUsesCustomEmoji } from "../utils/emojiUsage.js";

export class Emojis extends BaseModel {
    constructor() {
        super('emojis');
    }

    async getAll() {
        const usesEmoji = sqlMessageUsesCustomEmoji('m', 'emojis');
        const query = `
            SELECT
                e.id,
                e.emoji_name,
                e.url,
                e.created_at,
                e.last_updated,
                COALESCE(occurences, 0) AS occurrences
            FROM ${this.tableName} as e
            LEFT JOIN (
                SELECT
                    emojis.id,
                    emojis.emoji_name,
                    COUNT(*) AS occurences
                FROM ${this.tableName}
                JOIN messages m ON ${usesEmoji}
                GROUP BY emojis.id
            ) AS subquery ON e.id = subquery.id`;

        return await this.db.query(query);
    }

    async getCount() {
        const usesEmoji = sqlMessageUsesCustomEmoji('messages', 'emojis');
        const query = `
            SELECT
                emoji_name,
                COUNT(*) AS occurences
            FROM ${this.tableName}
            JOIN messages ON ${usesEmoji}
            GROUP BY emojis.id`;

        return await this.db.query(query);
    }

    async getById(id) {
        return await this.findById(id);
    }
}
