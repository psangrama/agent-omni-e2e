import 'dotenv/config';
import { defineConfig } from '@playwright/test';

/**
 * Playwright engine. Selected with TEST_ENGINE=playwright (see scripts/run-tests.mjs).
 * Mirrors wdio.conf.ts / wdio.ci.conf.ts: same .env, same reports/ folder, same tags.
 */
const ci = process.env.CI === 'true';
const headless = ci || process.env.HEADLESS === 'true';

export default defineConfig({
    testDir: './test/playwright/specs',
    testMatch: '**/*.spec.ts',
    outputDir: 'reports/playwright-results',

    // e.g. GREP=@smoke, same as the WDIO engine (the runner script also passes --grep).
    grep: process.env.GREP ? new RegExp(process.env.GREP) : undefined,

    fullyParallel: true,
    workers: Number(process.env.MAX_INSTANCES ?? (ci ? 4 : 2)),
    // Retry a failed test once in CI; every retry is a flake to investigate.
    retries: ci ? 1 : 0,
    timeout: 60_000,
    expect: { timeout: 10_000 },

    reporter: [
        ['list'],
        ['html', { outputFolder: 'reports/playwright-report', open: 'never' }],
        ['junit', { outputFile: 'reports/junit/playwright-results.xml' }],
    ],

    use: {
        baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
        // Use the installed Google Chrome (present locally, on GitHub runners and in the Docker image),
        // so no separate Playwright browser download is needed.
        channel: 'chrome',
        headless,
        viewport: { width: 1440, height: 900 },
        launchOptions: { args: ['--no-sandbox', '--disable-dev-shm-usage'] },
        actionTimeout: 10_000,
        navigationTimeout: 30_000,
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
    },
});
