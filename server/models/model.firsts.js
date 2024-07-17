import { pool }  from "./database.js";

export class Firsts {
    constructor(){
        this.connection = pool
    }
    
    async getAll(){
        const [rows] = await this.connection.query(
            `SELECT
                user_id,
                COALESCE(display_name, user_name) AS user_name,
                timesent
            FROM firstlist_id
            JOIN members ON firstlist_id.user_id = members.id
            ORDER BY timesent DESC;`)
        return rows;
    }

    // Not sure if this will ever get used
    async getFew(limit){
        const [rows] = await this.connection.query(
            `SELECT
                user_id,
                COALESCE(display_name, user_name) AS user_name,
                timesent
            FROM firstlist_id
            JOIN members ON firstlist_id.user_id = members.id
            ORDER BY timesent DESC
            LIMIT ?;`, limit);
        return rows;
    }

    async getById(id){
        const [rows] = await this.connection.query(
            `SELECT *
                user_id,
                COALESCE(display_name, user_name) AS user_name,
                timesent
            FROM firstlist_id
            JOIN members ON firstlist_id.user_id = members.id
            WHERE user_id = ?;`, id);
        return rows;
    }

    async getScore(){
        const [rows] = await this.connection.query(
            `SELECT 
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

    async getCumCount(){
        const [rows] = await this.connection.query(
            `SELECT
                COALESCE(display_name,user_name) AS user_name,
                UNIX_TIMESTAMP(timesent) / (24 * 60 * 60) AS timesent,
                ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY timesent) AS cum_count
            FROM
                firstlist_id
            JOIN members ON firstlist_id.user_id = members.id
            ORDER BY timesent ASC;`)
        return rows;
    }
}