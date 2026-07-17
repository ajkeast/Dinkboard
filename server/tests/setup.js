import dotenv from 'dotenv';
import { afterAll } from 'vitest';
import { db } from '../models/database.js';

dotenv.config();

afterAll(async () => {
    // Close the MySQL pool so vitest can exit cleanly.
    if (db?.pool) {
        await db.pool.end();
    }
});
