import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

class DatabaseError extends Error {
    constructor(message, originalError = null) {
        super(message);
        this.name = 'DatabaseError';
        this.originalError = originalError;
    }
}

class Database {
    static instance = null;

    constructor() {
        if (Database.instance) {
            return Database.instance;
        }
        this.pool = null;
        this.refreshInterval = null;
        this.isConnecting = false;
        Database.instance = this;
    }

    static getInstance() {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }

    createPool() {
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
    }

    async connect() {
        if (this.isConnecting) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return this.connect();
        }

        this.isConnecting = true;

        try {
            if (this.pool) {
                try {
                    await this.pool.end();
                } catch (err) {
                    console.log('Error closing existing pool:', err.message);
                }
            }

            this.pool = this.createPool();
            await this.pool.query('SELECT 1');
            
            // Set up periodic pool refresh
            if (!this.refreshInterval) {
                this.refreshInterval = setInterval(() => {
                    console.log('Proactively refreshing connection pool');
                    this.connect().catch(console.error);
                }, 120000); // Refresh every 2 minutes
            }

            this.isConnecting = false;
        } catch (error) {
            this.isConnecting = false;
            throw new DatabaseError('Failed to connect to database', error);
        }
    }

    async query(sql, params = []) {
        if (!this.pool) {
            await this.connect();
        }
        
        try {
            const [results] = await this.pool.execute(sql, params);
            return results;
        } catch (error) {
            // If query fails, try one more time with a fresh connection
            await this.connect();
            const [results] = await this.pool.execute(sql, params);
            return results;
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