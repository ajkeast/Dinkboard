// Tiny plain-SQL migration runner (Postgres).
//
// - Tracks applied files in `app_schema_migrations`.
// - Applies pending .sql files in lexicographic order.
// - Refuses to run any file touching the protected live tables with
//   destructive statements (belt-and-braces for the additions-only rule).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const FORBIDDEN = /\b(DROP|TRUNCATE|DELETE|UPDATE|ALTER\s+TABLE)\b[\s\S]*?\b(messages|members|channels|emojis|firstlist_id|chatgpt_logs|dalle_3_prompts|dinkcoin_\w*)\b|\b(DROP|TRUNCATE)\s+(TABLE|DATABASE)\b/i;

/** Strip optional wrapping quotes people often paste into secrets/.env. */
function env(name) {
    const raw = process.env[name] ?? '';
    return raw.replace(/^['"]|['"]$/g, '').trim();
}

function connectionConfig() {
    const [host, port] = env('SQL_HOST').split(':');
    return {
        host,
        port: port ? Number(port) : 5432,
        user: env('SQL_USER'),
        password: env('SQL_PASSWORD'),
        database: env('SQL_DATABASE'),
    };
}

async function main() {
    const client = new Client(connectionConfig());
    await client.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS app_schema_migrations (
                filename   VARCHAR(255) NOT NULL PRIMARY KEY,
                applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const appliedResult = await client.query('SELECT filename FROM app_schema_migrations');
        const applied = new Set(appliedResult.rows.map(r => r.filename));

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
            console.log(`apply   ${file}`);
            await client.query(sql);
            await client.query(
                'INSERT INTO app_schema_migrations (filename) VALUES ($1)',
                [file]
            );
            ranAny = true;
        }
        console.log(ranAny ? 'Migrations complete.' : 'Nothing to migrate.');
    } finally {
        await client.end();
    }
}

main().catch(err => {
    console.error('Migration failed:', err.message || err);
    if (err.code) console.error('code:', err.code);
    process.exit(1);
});
