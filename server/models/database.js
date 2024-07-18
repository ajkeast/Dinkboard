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
        this.isConnecting = false;
    }

    async connect() {
        if (this.isConnecting) {
            console.log('Connection already in progress, waiting...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            return this.connect();
        }

        this.isConnecting = true;
        console.log('Connecting to database...');

        try {
            if (this.pool) {
                console.log('Closing existing pool...');
                await this.pool.end();
                console.log('Existing pool closed');
            }

            this.pool = createPool();
            console.log('New pool created');

            this.pool.on('error', (err) => {
                console.error('Unexpected error on idle client', err);
                this.connect().catch(console.error);
            });

            // Test the connection
            await this.pool.query('SELECT 1');
            console.log('Connection successful');

            // Set up ping interval
            if (this.pingInterval) {
                clearInterval(this.pingInterval);
            }
            this.pingInterval = setInterval(() => this.pingDatabase(), 30000); // Ping every 30 seconds

            this.isConnecting = false;
        } catch (error) {
            console.error('Error connecting to database:', error);
            this.isConnecting = false;
            throw error;
        }
    }

    async pingDatabase() {
        try {
            if (!this.pool || this.pool._closed) {
                throw new Error('Pool is closed');
            }
            await this.pool.query('SELECT 1');
            console.log('Ping successful');
        } catch (error) {
            console.error('Ping failed:', error);
            this.connect().catch(console.error);
        }
    }

    async query(sql, params) {
        if (!this.pool || this.pool._closed) {
            console.log('Pool is closed or not initialized. Reconnecting...');
            await this.connect();
        }
        
        try {
            const [results] = await this.pool.execute(sql, params);
            return results;
        } catch (error) {
            console.error('Query error:', error);
            if (error.message.includes('Pool is closed')) {
                console.log('Pool was closed. Reconnecting...');
                await this.connect();
                // Retry the query once after reconnecting
                const [results] = await this.pool.execute(sql, params);
                return results;
            }
            throw error;
        }
    }
}

export const db = new Database();