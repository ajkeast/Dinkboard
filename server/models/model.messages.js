import { pool }  from "./database.js";

export class Messages {

    constructor(){
        this.connection = pool
    }

    async getAll(){
        const [rows] = await this.connection.query(
            `SELECT 
                CAST(messages.id AS VARCHAR(20)) AS id,
                COALESCE(display_name, user_name) AS user_name,
                CONCAT('#', channel_name) AS channel_name,
                content,
                messages.created_at,
                messages.last_updated
            FROM messages
            JOIN members ON messages.member_id = members.id
            JOIN channels ON messages.channel_id = channels.id
            ORDER BY created_at DESC;`)
        return rows;
    }

    async getByChannel(){
        const [rows] = await this.connection.query(
            `SELECT 
                channel_name,
                COUNT(*) AS messages
            FROM messages
            JOIN channels on channel_id = channels.id
            GROUP BY channel_id
            ORDER BY COUNT(*);`)
        return rows;    
    }

    async getById(id){
        const [rows] = await this.connection.query(
            `SELECT 
                CAST(messages.id AS VARCHAR(20)) AS id,
                COALESCE(display_name, user_name) AS user_name,
                CONCAT('#', channel_name) AS channel_name,
                content,
                messages.created_at,
                messages.last_updated
            FROM messages
            JOIN members ON messages.member_id = members.id
            JOIN channels ON messages.channel_id = channels.id
            WHERE messages.id = ?`,id)
        return rows;
    }

    async getByMember(){
        const [rows] = await this.connection.query(
            `SELECT
                members.id AS 'user_id',
                COALESCE(display_name, user_name) AS user_name,
                COUNT(*) AS 'messages'
            FROM messages
            JOIN members ON messages.member_id = members.id
            GROUP BY messages.member_id;`)
        return rows;
    }

    async getByMonth(){
        const [rows] = await this.connection.query(
            `SELECT
                DATE_FORMAT(messages.created_at, '%b %Y') AS 'month',
                COUNT(*) AS 'messages'
            FROM messages
            JOIN members ON messages.member_id = members.id
            WHERE messages.created_at > '2017-08-01'
            GROUP BY DATE_FORMAT(messages.created_at, '%Y-%m');`)
        return rows;
    }

    async getByMonthByMember(){
        const [rows] = await this.connection.query(
            `SELECT
                DATE_FORMAT(messages.created_at, '%b %Y') AS 'month',
                COALESCE(display_name, user_name) AS user_name,
                COUNT(*) AS 'messages'
            FROM messages
            JOIN members ON messages.member_id = members.id
            GROUP BY DATE_FORMAT(messages.created_at, '%Y-%m'), user_name;`)
        return rows;
    }

    async getStats(){
        const [rows] = await this.connection.query(
            `SELECT
                (
                SELECT COUNT(*) 
                FROM messages 
                WHERE DATE_FORMAT(created_at, '%Y-%m-%d') BETWEEN DATE_FORMAT(NOW(), '%Y-%m-01') AND NOW()
                ) AS thisMTD,
                (
                SELECT COUNT(*) 
                FROM messages
                WHERE DATE_FORMAT(created_at, '%Y-%m-%d') BETWEEN DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y-%m-01') AND DATE_SUB(NOW(), INTERVAL 1 MONTH)
                ) AS lastMTD,
                (
                SELECT COUNT(*) 
                FROM messages 
                WHERE DATE_FORMAT(created_at, '%Y-%m-%d') BETWEEN DATE_FORMAT(NOW(), '%Y-01-01') AND NOW()
                ) AS thisYTD,
                (
                SELECT COUNT(*) 
                FROM messages
                WHERE DATE_FORMAT(created_at, '%Y-%m-%d') BETWEEN DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 YEAR), '%Y-01-01') AND DATE_SUB(NOW(), INTERVAL 1 YEAR)
                ) AS lastYTD;`)
        return rows;
    }

}

