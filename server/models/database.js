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
        queueLimit: 0
    });
};

class Database {
    constructor() {
        this.pool = null;
    }

    connect() {
        this.pool = createPool();
        this.pool.on('error', (err) => {
            console.error('Unexpected error on idle client', err);
            if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ETIMEDOUT') {
                console.log('Lost connection. Reconnecting...');
                this.connect();
            }
        });
    }

    async query(sql, params, retries = 1) {
        if (!this.pool) this.connect();
        
        const timeout = 6000; // 5 seconds timeout
        
        const queryPromise = this.pool.execute(sql, params);
        
        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Database query timeout')), timeout);
            });
            
            const [results] = await Promise.race([queryPromise, timeoutPromise]);
            return results;
        } catch (error) {
            if (error.message === 'Database query timeout' || error.code === 'PROTOCOL_CONNECTION_LOST' || error.code === 'ETIMEDOUT') {
                if (retries > 0) {
                    console.log(`Query failed. Retrying... (${retries} attempts left)`);
                    await new Promise(resolve => setTimeout(resolve, 500)); // Wait .5 second before retrying
                    return this.query(sql, params, retries - 1);
                }
            }
            throw error;
        }
    }
}

export const db = new Database();