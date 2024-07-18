import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const createPool = () => {
    return mysql.createPool({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DATABASE,
        timezone: 'Z',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
    });
};

class Database {
    constructor() {
        this.pool = null;
        this.pingInterval = null;
    }

    connect() {
        if (this.pool) {
            this.pool.end(() => {
                console.log('Existing pool closed');
                this.createNewPool();
            });
        } else {
            this.createNewPool();
        }
    }

    createNewPool() {
        this.pool = createPool();
        this.pool.on('error', (err) => {
            console.error('Unexpected error on idle client', err);
            this.connect(); // Reconnect on any error
        });

        // Set up ping interval
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        this.pingInterval = setInterval(() => this.pingDatabase(), 30000); // Ping every 30 seconds
    }

    async pingDatabase() {
        try {
            await this.pool.query('SELECT id FROM members LIMIT 1;');
            console.log('Ping successful');
        } catch (error) {
            console.error('Ping failed:', error);
            this.connect(); // Reconnect if ping fails
        }
    }

    async query(sql, params) {
        if (!this.pool) this.connect();
        
        try {
            const [results] = await this.pool.execute(sql, params);
            return results;
        } catch (error) {
            console.error('Query error:', error);
            this.connect(); // Reconnect on any error
            throw error; // Rethrow the error for the caller to handle
        }
    }
}

export const db = new Database();