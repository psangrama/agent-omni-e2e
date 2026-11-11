import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

/** One ID per worker run, so parallel runs never collide. */
export const RUN_ID = `${Date.now().toString(36)}${randomUUID().slice(0, 4)}`;

let counter = 0;
const next = () => `${RUN_ID}${(counter++).toString(36)}`;

const generators: Record<string, () => string> = {
    'unique.id': () => next(),
    'unique.email': () => `qa+${next()}@example.test`,
    'unique.name': () => `QA User ${next()}`,
    'unique.phone': () => `9${Math.floor(100000000 + Math.random() * 899999999)}`,
};

function resolve(value: unknown): unknown {
    if (typeof value === 'string') {
        return value.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
            const gen = generators[key];
            if (!gen) throw new Error(`Unknown fixture placeholder {{${key}}}`);
            return gen();
        });
    }
    if (Array.isArray(value)) return value.map(resolve);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolve(v)]));
    }
    return value;
}

/** Load the data for one case from test/fixtures/<feature>.json, with placeholders resolved. */
export function loadFixture<T = Record<string, any>>(feature: string, caseId: string): T {
    const file = join(process.cwd(), 'test', 'fixtures', `${feature}.json`);
    const all = JSON.parse(readFileSync(file, 'utf-8'));
    if (!all[caseId]) throw new Error(`No fixture for ${caseId} in ${file}`);
    return resolve(all[caseId]) as T;
}
