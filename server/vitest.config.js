import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        fileParallelism: false,
        sequence: { concurrent: false },
        testTimeout: 60000,
        hookTimeout: 60000,
        setupFiles: ['./tests/setup.js'],
        include: ['tests/**/*.test.js'],
        env: {
            NODE_ENV: 'test',
        },
    },
});
