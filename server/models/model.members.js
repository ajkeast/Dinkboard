import { db } from "./database.js";

export class Member {

    async getAll(){
        const rows = await db.query(
            `SELECT 
                id,
                user_name,
                COALESCE(display_name,user_name) AS display_name,
                avatar,
                DATE_FORMAT(created_at, '%b %e, %Y') AS created_at,
                DATE_FORMAT(last_updated, '%b %e, %Y %h:%i%p UTC') AS last_updated
            FROM members;`);
        return rows;
    }

    async getByID(id){
        const rows = await db.query(
            `SELECT 
                id,
                user_name,
                COALESCE(display_name, user_name) AS display_name,
                avatar,
                DATE_FORMAT(created_at, '%b %e, %Y') AS created_at,
                DATE_FORMAT(last_updated, '%b %e, %Y %h:%i%p UTC') AS last_updated
            FROM members
            WHERE id = ?;`, id);
        return rows;
    }
}

