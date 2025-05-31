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

    // New methods for better functionality
    async createEmoji(data) {
        const { emoji_name, url } = data;
        return await this.create({
            emoji_name,
            url,
            created_at: new Date(),
            last_updated: new Date()
        });
    }

    async updateEmoji(id, data) {
        const updateData = {
            ...data,
            last_updated: new Date()
        };
        return await this.update(id, updateData);
    }

    async getEmojiUsage(emojiName) {
        const query = `
            SELECT
                m.id as message_id,
                m.content,
                COALESCE(display_name, user_name) AS user_name,
                m.created_at
            FROM messages m
            JOIN members ON m.member_id = members.id
            WHERE LOCATE(CONCAT(':',?,':'), m.content) > 0
            ORDER BY m.created_at DESC`;
        
        return await this.db.query(query, [emojiName]);
    }

    async getTopEmojis(limit = 10) {
        const query = `
            SELECT
                e.emoji_name,
                e.url,
                COUNT(*) as usage_count
            FROM ${this.tableName} e
            JOIN messages m ON LOCATE(CONCAT(':',e.emoji_name,':'), m.content) > 0
            GROUP BY e.id
            ORDER BY usage_count DESC
            LIMIT ?`;
        
        return await this.db.query(query, [limit]);
    }

    async searchEmojis(searchTerm) {
        return await this.findAll({
            fields: ['id', 'emoji_name', 'url', 'created_at'],
            where: {
                'emoji_name LIKE': `%${searchTerm}%`
            },
            orderBy: 'emoji_name ASC'
        });
    }
}
