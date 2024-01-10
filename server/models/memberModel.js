import { pool }  from "./database.js";

export async function queryMembers(){
    const [rows] = await pool.query(
        `SELECT * 
        FROM members;`);
    return rows;
}

export async function queryMember(id){
    const [rows] = await pool.query(
        `SELECT * 
        FROM members
        WHERE ID = ?;`, id);
    return rows;
}

