import 'dotenv/config';
import { mkdirSync } from 'node:fs';

const headless = process.env.HEADLESS === 'true';

export const config: WebdriverIO.Config = {
    runner: 'local',
    tsConfigPath: './tsconfig.json',

    specs: ['./test/wdio/specs/**/*.e2e.ts'],
    exclude: [],
    maxInstances: Number(process.env.MAX_INSTANCES ?? 2),

    capabilities: [{
        browserName: 'chrome',
        'goog:chromeOptions': {
            args: headless
                ? ['--headless=new', '--disable-gpu', '--no-sandbox', '--window-size=1440,900']
                : ['--window-size=1440,900'],
        },
    }],

    logLevel: 'warn',
    bail: 0,
    baseUrl: process.env.BASE_URL ?? 'http://localhost:3000',
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,

    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000,
        // e.g. GREP=@smoke npm test
        grep: process.env.GREP,
    },

    reporters: [
        'spec',
        ['allure', { outputDir: 'reports/allure-results', disableWebdriverStepsReporting: true }],
    ],

    onPrepare() {
        mkdirSync('reports/screenshots', { recursive: true });
    },

    async afterTest(test, _context, { passed }) {
        if (!passed) {
            const name = `${test.parent}-${test.title}`.replace(/[^\w-]+/g, '_').slice(0, 120);
            await browser.saveScreenshot(`reports/screenshots/${name}.png`);
        }
    },
};
