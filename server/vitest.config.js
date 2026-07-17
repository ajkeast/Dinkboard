import { defineConfig } from 'vitest/config';

// Discord table read-suite needs the live PebbleHost schema; CI uses a blank MySQL.
const exclude = process.env.CI ? ['tests/data.test.js'] : [];

export default defineConfig({
    test: {
        environment: 'node',
        fileParallelism: false,
        sequence: { concurrent: false },
        testTimeout: 60000,
        hookTimeout: 60000,
        setupFiles: ['./tests/setup.js'],
        include: ['tests/**/*.test.js'],
        exclude,
        env: {
            NODE_ENV: 'test',
        },
    },
});
