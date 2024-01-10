import { pool }  from "./database.js";

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
            user_name, 
            count(*) as firsts,
            DATEDIFF(NOW(), MAX(timesent)) AS days_since_first
        FROM firstlist_id
        JOIN members ON firstlist_id.user_id = members.id
        GROUP BY user_id
        ORDER BY firsts DESC;`);
    return rows;
}