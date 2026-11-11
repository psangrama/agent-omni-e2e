#!/usr/bin/env node
/**
 * Runs the test suite with the engine chosen by TEST_ENGINE (wdio | playwright).
 *
 *   node scripts/run-tests.mjs                     # all tests, local settings
 *   node scripts/run-tests.mjs --grep @smoke       # only tagged tests
 *   node scripts/run-tests.mjs --ci                # CI settings: headless, retries, JUnit
 *   node scripts/run-tests.mjs --report            # open the engine's HTML report
 *   node scripts/run-tests.mjs -- <extra args>     # passed straight to the engine
 *
 * TEST_ENGINE comes from the environment or .env. Default: wdio.
 */
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const ENGINES = ['wdio', 'playwright'];
const engine = (process.env.TEST_ENGINE || 'wdio').trim().toLowerCase();
if (!ENGINES.includes(engine)) {
    console.error(`run-tests: TEST_ENGINE must be one of ${ENGINES.join(', ')} (got "${engine}").`);
    process.exit(1);
}

// Parse our own flags; everything after "--" (or unknown) goes to the engine.
const argv = process.argv.slice(2);
let ci = false, report = false, grep;
const passthrough = [];
for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') { passthrough.push(...argv.slice(i + 1)); break; }
    else if (a === '--ci') ci = true;
    else if (a === '--report') report = true;
    else if (a === '--grep') grep = argv[++i];
    else passthrough.push(a);
}

const bin = {
    wdio: join('node_modules', '@wdio', 'cli', 'bin', 'wdio.js'),
    playwright: join('node_modules', '@playwright', 'test', 'cli.js'),
};

const env = { ...process.env, TEST_ENGINE: engine };
if (ci) { env.CI = 'true'; env.HEADLESS = 'true'; }
if (grep) env.GREP = grep;

function run(script, args) {
    if (!existsSync(script)) {
        console.error(`run-tests: ${script} not found. Run "npm install" in this folder first.`);
        process.exit(1);
    }
    console.log(`run-tests: engine=${engine}${ci ? ' (ci)' : ''}${grep ? ` grep=${grep}` : ''}`);
    const res = spawnSync(process.execPath, [script, ...args], { stdio: 'inherit', env });
    process.exit(res.status ?? 1);
}

if (report) {
    if (engine === 'playwright') run(bin.playwright, ['show-report', 'reports/playwright-report']);
    // Allure's CLI is a shell script, so start it through the shell.
    const res = spawnSync('npx allure generate reports/allure-results --clean -o reports/allure-report && npx allure open reports/allure-report',
        { stdio: 'inherit', env, shell: true });
    process.exit(res.status ?? 1);
}

if (engine === 'wdio') {
    // WDIO reads GREP from the environment (see wdio.conf.ts).
    run(bin.wdio, ['run', ci ? './wdio.ci.conf.ts' : './wdio.conf.ts', ...passthrough]);
} else {
    run(bin.playwright, ['test', ...(grep ? ['--grep', grep] : []), ...passthrough]);
}
