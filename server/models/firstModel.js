import { pool }  from "./database.js";

export class Firsts {
    constructor(){
        this.connection = pool
    }
    
    async getAll(){
        const [rows] = await pool.query(
            `SELECT * 
            FROM firstlist_id
            ORDER BY timesent DESC;`)
        return rows;
    }

    async getSome(limit){
        const [rows] = await pool.query(
            `SELECT * 
            FROM firstlist_id
            ORDER BY timesent DESC
            LIMIT ?;`, limit);
        return rows;
    }

    async getById(id){
        const [rows] = await pool.query(
            `SELECT * 
            FROM firstlist_id
            WHERE user_id = ?;`, limit);
        return rows;
    }

    async getScore(){
        const [rows] = await pool.query(
            `SELECT 
                COALESCE(display_name, user_name) AS user_name, 
                COUNT(*) AS firsts,
                DATEDIFF(NOW(), MAX(timesent)) AS days_since_first
            FROM firstlist_id
            JOIN members ON firstlist_id.user_id = members.id
            GROUP BY user_id
            ORDER BY firsts DESC;`);
        return rows;
    }
}

export async function queryFirsts(limit){
    const [rows] = await pool.query(
        `SELECT * 
        FROM firstlist_id
        ORDER BY timesent DESC
        LIMIT ?;`, limit);
    return rows;
}

export async function queryScore(){
    const [rows] = await pool.query(
        `SELECT 
            COALESCE(display_name, user_name) AS user_name, 
            COUNT(*) AS firsts,
            DATEDIFF(NOW(), MAX(timesent)) AS days_since_first
        FROM firstlist_id
        JOIN members ON firstlist_id.user_id = members.id
        GROUP BY user_id
        ORDER BY firsts DESC;`);
    return rows;
}