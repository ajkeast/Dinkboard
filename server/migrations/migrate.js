// Tiny plain-SQL migration runner.
//
// - Tracks applied files in `app_schema_migrations`.
// - Applies pending .sql files in lexicographic order.
// - Refuses to run any file touching the protected live tables with
//   destructive statements (belt-and-braces for the additions-only rule).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const FORBIDDEN = /\b(DROP|TRUNCATE|DELETE|UPDATE|ALTER\s+TABLE)\b[\s\S]*?\b(messages|members|channels|emojis|firstlist_id|chatgpt_logs|dalle_3_prompts|dinkcoin_\w*)\b|\b(DROP|TRUNCATE)\s+(TABLE|DATABASE)\b/i;

function connectionConfig() {
    const [host, port] = (process.env.SQL_HOST ?? '').split(':');
    return {
        host,
        port: port ? Number(port) : 3306,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DATABASE,
        multipleStatements: false
    };
}

async function main() {
    const conn = await mysql.createConnection(connectionConfig());
    try {
        await conn.query(`
            CREATE TABLE IF NOT EXISTS app_schema_migrations (
                filename   VARCHAR(255) NOT NULL PRIMARY KEY,
                applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        const [appliedRows] = await conn.query('SELECT filename FROM app_schema_migrations');
        const applied = new Set(appliedRows.map(r => r.filename));

        const files = fs.readdirSync(__dirname)
            .filter(f => f.endsWith('.sql'))
            .sort();

        let ranAny = false;
        for (const file of files) {
            if (applied.has(file)) {
                console.log(`skip    ${file} (already applied)`);
                continue;
            }
            const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
            if (FORBIDDEN.test(sql)) {
                throw new Error(`Refusing to run ${file}: contains a destructive statement against a protected table.`);
            }
            // Split on semicolons at end of statements (files are plain DDL, no
            // procedures/triggers, so this simple split is safe).
            const statements = sql.split(/;\s*(?:\n|$)/).map(s => s.trim()).filter(Boolean);
            console.log(`apply   ${file} (${statements.length} statement${statements.length === 1 ? '' : 's'})`);
            for (const stmt of statements) {
                await conn.query(stmt);
            }
            await conn.query('INSERT INTO app_schema_migrations (filename) VALUES (?)', [file]);
            ranAny = true;
        }
        console.log(ranAny ? 'Migrations complete.' : 'Nothing to migrate.');
    } finally {
        await conn.end();
    }
}

main().catch(err => {
    console.error('Migration failed:', err.message);
    process.exit(1);
});
