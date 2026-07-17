import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

export class DatabaseError extends Error {
    constructor(message, originalError = null) {
        super(message);
        this.name = 'DatabaseError';
        this.originalError = originalError;
    }
}

// SQL_HOST may include a ":port" suffix (e.g. "example.com:3306"); mysql2
// expects host and port separately, so parse defensively.
function parseHost(raw) {
    const [host, port] = (raw ?? '').split(':');
    return { host, port: port ? Number(port) : 3306 };
}

class Database {
    static instance = null;

    constructor() {
        if (Database.instance) {
            return Database.instance;
        }
        const { host, port } = parseHost(process.env.SQL_HOST);
        // Keepalive + idle recycling handle the shared host's idle-connection
        // culling; no manual pool refresh needed.
        this.pool = mysql.createPool({
            host,
            port,
            user: process.env.SQL_USER,
            password: process.env.SQL_PASSWORD,
            database: process.env.SQL_DATABASE,
            timezone: 'Z',
            waitForConnections: true,
            connectionLimit: 10,
            maxIdle: 4,
            idleTimeout: 60000,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 10000
        });
        Database.instance = this;
    }

    static getInstance() {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }

    async query(sql, params = []) {
        try {
            const [results] = await this.pool.execute(sql, params);
            return results;
        } catch (error) {
            throw new DatabaseError('Database query failed', error);
        }
    }

    async transaction(callback) {
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();
            const result = await callback(connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw new DatabaseError('Transaction failed', error);
        } finally {
            connection.release();
        }
    }
}

export const db = Database.getInstance();
