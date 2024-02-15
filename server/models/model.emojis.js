import { pool }  from "./database.js";

export class Emojis {

    constructor(){
        this.connection = pool
    }

    async getAll(){
        const [rows] = await this.connection.query(
            `SELECT * FROM emojis;`)
        return rows;
    }

    async getCount(){
        const [rows] = await this.connection.query(
            `SELECT
                emoji_name,
                COUNT(*) AS occurences
            FROM
                emojis
            JOIN
                messages ON LOCATE(CONCAT(':',emoji_name,':'), content) > 0
            GROUP BY
                emojis.id;`)
        return rows;
    }

    async getById(id){
        const [rows] = await this.connection.query(
            `SELECT * FROM emojis
            WHERE id = ?;`,id)
        return rows;
    }
}
