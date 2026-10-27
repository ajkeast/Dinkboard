import { BaseModel } from "./BaseModel.js";
import { currentMessageTextSql } from "./messageText.js";

// Custom-emoji counts follow the text currently shown in Discord.
// strpos cannot use the btree indexes on messages, and COALESCE does not add a filter.
const CURRENT_TEXT = currentMessageTextSql('m');

export class Emojis extends BaseModel {
    constructor() {
        super('emojis');
    }

    async getAll() {
        // Postgres: strpos(haystack, needle) replaces MySQL LOCATE(needle, haystack).
        const query = `
            SELECT
                e.id,
                e.emoji_name,
                e.url,
                e.created_at,
                e.last_updated,
                COALESCE(subquery.occurences, 0)::int AS occurrences
            FROM ${this.tableName} AS e
            LEFT JOIN (
                SELECT
                    emojis.id,
                    COUNT(*) AS occurences
                FROM ${this.tableName} AS emojis
                JOIN messages m
                  ON strpos(${CURRENT_TEXT}, ':' || emojis.emoji_name || ':') > 0
                GROUP BY emojis.id
            ) AS subquery ON e.id = subquery.id`;

        return await this.db.query(query);
    }

    async getCount() {
        const query = `
            SELECT
                emojis.emoji_name,
                COUNT(*)::int AS occurences
            FROM ${this.tableName} AS emojis
            JOIN messages m
              ON strpos(${CURRENT_TEXT}, ':' || emojis.emoji_name || ':') > 0
            GROUP BY emojis.id, emojis.emoji_name`;

        return await this.db.query(query);
    }

    async getById(id) {
        return await this.findById(id);
    }
}
