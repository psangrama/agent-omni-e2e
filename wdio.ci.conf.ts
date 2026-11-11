import { config as base } from './wdio.conf.js';

process.env.HEADLESS = 'true';

export const config: WebdriverIO.Config = {
    ...base,
    maxInstances: Number(process.env.MAX_INSTANCES ?? 4),
    capabilities: [{
        browserName: 'chrome',
        'goog:chromeOptions': {
            args: ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'],
        },
    }],
    // Retry a failed spec file once in CI; every retry is a flake to investigate.
    specFileRetries: 1,
    specFileRetriesDeferred: true,
    reporters: [
        'spec',
        ['allure', { outputDir: 'reports/allure-results', disableWebdriverStepsReporting: true }],
        ['junit', { outputDir: 'reports/junit', outputFileFormat: (o) => `results-${o.cid}.xml` }],
    ],
};
