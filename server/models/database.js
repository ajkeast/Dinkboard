import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

export class DatabaseError extends Error {
    constructor(message, originalError = null) {
        super(message);
        this.name = 'DatabaseError';
        this.originalError = originalError;
    }
}

function env(name) {
    const raw = process.env[name] ?? '';
    return raw.replace(/^['"]|['"]$/g, '').trim();
}

/** SQL_HOST may include a ":port" suffix (e.g. "postgres:5432"). */
function parseHost(raw) {
    const [host, port] = (raw ?? '').split(':');
    return { host, port: port ? Number(port) : 5432 };
}

/** Convert mysql2-style `?` placeholders to node-pg `$1, $2, ...`. */
export function toPgParams(sql, params = []) {
    let i = 0;
    const text = String(sql).replace(/\?/g, () => `$${++i}`);
    if (i !== params.length) {
        // Allow queries with no placeholders when params omitted.
        if (!(i === 0 && params.length === 0)) {
            // Still run — pg will error clearly if mismatch; keep lenient for dynamic SQL.
        }
    }
    return { text, values: params };
}

class Database {
    static instance = null;

    constructor() {
        if (Database.instance) {
            return Database.instance;
        }
        const { host, port } = parseHost(env('SQL_HOST'));
        this.pool = new Pool({
            host,
            port,
            user: env('SQL_USER'),
            password: env('SQL_PASSWORD'),
            database: env('SQL_DATABASE'),
            max: 10,
            idleTimeoutMillis: 60000,
            connectionTimeoutMillis: 10000,
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
            const { text, values } = toPgParams(sql, params);
            const result = await this.pool.query(text, values);
            return result.rows;
        } catch (error) {
            throw new DatabaseError('Database query failed', error);
        }
    }

    async transaction(callback) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const tx = {
                query: async (sql, params = []) => {
                    const { text, values } = toPgParams(sql, params);
                    const result = await client.query(text, values);
                    return result.rows;
                },
                execute: async (sql, params = []) => {
                    const { text, values } = toPgParams(sql, params);
                    return client.query(text, values);
                },
            };
            const result = await callback(tx);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw new DatabaseError('Transaction failed', error);
        } finally {
            client.release();
        }
    }
}

export const db = Database.getInstance();
