import { db } from "./database.js";

export class Firsts {

    async getAll() {
        const rows = await db.query(`
            SELECT
                user_id,
                COALESCE(display_name, user_name) AS user_name,
                timesent
            FROM firstlist_id
            JOIN members ON firstlist_id.user_id = members.id
            ORDER BY timesent DESC;`);
        return rows;
    }

    async getFew(limit) {
        const rows = await db.query(`
            SELECT
                user_id,
                COALESCE(display_name, user_name) AS user_name,
                timesent
            FROM firstlist_id
            JOIN members ON firstlist_id.user_id = members.id
            ORDER BY timesent DESC
            LIMIT ?;`, [limit]);
        return rows;
    }

    async getById(id) {
        const rows = await db.query(`
            SELECT
                user_id,
                COALESCE(display_name, user_name) AS user_name,
                timesent
            FROM firstlist_id
            JOIN members ON firstlist_id.user_id = members.id
            WHERE user_id = ?;`, [id]);
        return rows[0]; // Return the first (and should be only) result
    }

    async getScore() {
        const rows = await db.query(`
            SELECT 
                members.id AS user_id,
                COALESCE(display_name, user_name) AS user_name, 
                COUNT(*) AS firsts,
                DATEDIFF(NOW(), MAX(timesent)) AS days_since_first
            FROM firstlist_id
            JOIN members ON firstlist_id.user_id = members.id
            GROUP BY user_id
            ORDER BY firsts DESC;`);
        return rows;
    }

    async getCumCount() {
        const rows = await db.query(`
            SELECT
                COALESCE(display_name,user_name) AS user_name,
                UNIX_TIMESTAMP(timesent) AS timesent,
                ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY timesent) AS cum_count
            FROM
                firstlist_id
            JOIN members ON firstlist_id.user_id = members.id
            ORDER BY timesent ASC;`);
        return rows;
    }
}