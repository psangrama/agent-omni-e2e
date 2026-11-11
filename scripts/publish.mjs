#!/usr/bin/env node
/**
 * Publish the working tree to GitHub as a pull request.
 *
 *   npm run qa:publish -- --branch qa/2026-11-06-overview --title "QA: automate Overview" [--body-file reports/pr-body.md]
 *   npm run qa:publish -- --bootstrap      # first push to an EMPTY repository only (goes to the base branch)
 *
 * Reads from .env:
 *   GITHUB_REPO         https://github.com/<owner>/<repo>
 *   GITHUB_TOKEN        token with Contents: read/write and Pull requests: read/write on that repo
 *   GITHUB_BASE_BRANCH  optional, default "main"
 *
 * The token is passed to git per command as an HTTP header. It is never written to the remote
 * URL, git config, files or commits, and it is removed from any error output.
 *
 * Works in two layouts:
 *   - Standalone test repo: run from the repository root (the folder becomes a repo if it isn't one).
 *   - Test folder inside a code repo (e.g. <repo>/e2e): run from that folder. Only that folder is
 *     stashed, staged and committed; changes elsewhere in the repository are left untouched.
 */
import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
    options: {
        branch: { type: 'string' },
        title: { type: 'string' },
        'body-file': { type: 'string' },
        bootstrap: { type: 'boolean', default: false },
    },
});

const token = process.env.GITHUB_TOKEN ?? '';
const repoUrl = process.env.GITHUB_REPO ?? '';
const base = process.env.GITHUB_BASE_BRANCH || 'main';

function fail(message) {
    console.error(`publish: ${message}`);
    process.exit(1);
}

function redact(text) {
    let out = String(text ?? '');
    if (token) out = out.split(token).join('***');
    if (token) out = out.split(Buffer.from(`x-access-token:${token}`).toString('base64')).join('***');
    return out.trim();
}

const match = repoUrl.match(/github\.com[/:]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/);
if (!match) fail('GITHUB_REPO must be set in .env, e.g. https://github.com/<owner>/<repo>');
if (!token) fail('GITHUB_TOKEN must be set in .env');
const [, owner, repo] = match;
const remoteUrl = `https://github.com/${owner}/${repo}.git`;

if (!args.bootstrap && (!args.branch || !args.title)) {
    fail('usage: npm run qa:publish -- --branch qa/<name> --title "<PR title>" [--body-file <file>]');
}
if (args.branch && !/^qa\/[\w.\-/]+$/.test(args.branch)) fail('--branch must start with "qa/"');

/** Run git. `auth` adds the token as a per-command header for network operations. */
function git(gitArgs, { auth = false, allowFail = false } = {}) {
    const header = Buffer.from(`x-access-token:${token}`).toString('base64');
    const full = auth
        ? ['-c', `http.https://github.com/.extraheader=AUTHORIZATION: basic ${header}`, ...gitArgs]
        : gitArgs;
    try {
        return execFileSync('git', full, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    } catch (err) {
        if (allowFail) return null;
        fail(`git ${gitArgs[0]} failed: ${redact(err.stderr || err.message)}`);
    }
}

async function github(method, path, body) {
    const res = await fetch(`https://api.github.com${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'agent-omni-e2e',
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
}

// 1. Local repository and remote (remote URL never contains the token).
// Only create a repository when this folder is not inside one already. Inside a code repo the
// test folder must not become a second, nested repository.
if (!git(['rev-parse', '--show-toplevel'], { allowFail: true })) git(['init', '-b', base]);
const repoRoot = git(['rev-parse', '--show-toplevel']);
const prefix = git(['rev-parse', '--show-prefix']);   // '' at the root, e.g. 'e2e/' in a subfolder
if (prefix) console.log(`publish: test folder "${prefix}" inside ${repoRoot}; only this folder will be committed.`);

if (!git(['config', 'user.email'], { allowFail: true })) {
    fail('git user is not configured. Run: git config --global user.name "Your Name" && git config --global user.email "you@company.com"');
}
// Accept any URL form of the same repository (https or ssh); never overwrite a different remote.
const sameRepo = (url) => {
    const m = String(url).match(/github\.com[/:]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/);
    return !!m && m[1].toLowerCase() === owner.toLowerCase() && m[2].toLowerCase() === repo.toLowerCase();
};
// Read the URL as stored (not `git remote get-url`, which applies url.*.insteadOf rewrites
// that some companies use, e.g. https://github.com/ → ssh).
const currentRemote = git(['config', '--get', 'remote.origin.url'], { allowFail: true });
if (!currentRemote) git(['remote', 'add', 'origin', remoteUrl]);
else if (!sameRepo(currentRemote)) {
    fail(`the "origin" remote points to ${currentRemote}, not ${owner}/${repo}. ` +
         'Fix GITHUB_REPO in .env, or the remote, then run publish again.');
}
const startBranch = git(['branch', '--show-current'], { allowFail: true });

// 2. Is the remote empty?
const heads = git(['ls-remote', '--heads', 'origin'], { auth: true });
const remoteEmpty = heads === '';

// Every add / stash / commit is limited to this folder ('.'): the whole repository at the root,
// only the test folder inside a code repo.
function stageAndCheck() {
    git(['add', '-A', '--', '.']);
    const staged = git(['diff', '--cached', '--name-only', '--', '.']).split('\n').filter(Boolean);
    const secret = staged.find((f) => /(^|\/)\.env$/.test(f));
    if (secret) {
        git(['reset', '-q', '--', '.']);
        fail(`refusing to commit ${secret}. Check that .gitignore lists .env`);
    }
    return staged;
}
const commit = (message) => git(['commit', '-q', '-m', message, '--', '.']);

if (remoteEmpty) {
    if (!args.bootstrap) {
        fail(`${owner}/${repo} is empty. The first push must go to "${base}". ` +
             'Ask the human to confirm, then run: npm run qa:publish -- --bootstrap');
    }
    const staged = stageAndCheck();
    if (staged.length) commit('Initial commit: QA automation framework');
    git(['push', '-u', 'origin', `HEAD:refs/heads/${base}`], { auth: true });
    console.log(`publish: pushed the framework to ${owner}/${repo} (${base}).`);
    console.log(`publish: next, add repository secrets at https://github.com/${owner}/${repo}/settings/secrets/actions`);
    process.exit(0);
}
if (args.bootstrap) fail(`${owner}/${repo} is not empty; --bootstrap is only for the first push.`);

// 3. Start the branch from the latest remote base branch, carrying the working-tree changes along.
git(['fetch', '-q', 'origin', base], { auth: true });
if (!git(['rev-parse', '--verify', '-q', 'HEAD'], { allowFail: true })) {
    // Local folder has no commits yet: adopt the remote history, keep the files as they are.
    git(['reset', '-q', `origin/${base}`]);
}
const stashesBefore = git(['stash', 'list']).split('\n').filter(Boolean).length;
git(['stash', 'push', '-q', '--include-untracked', '--', '.']);
const stashed = git(['stash', 'list']).split('\n').filter(Boolean).length > stashesBefore;
if (git(['checkout', '-q', '-B', args.branch, `origin/${base}`], { allowFail: true }) === null) {
    // Usually uncommitted changes elsewhere in the repository that the switch would overwrite.
    if (stashed) git(['stash', 'pop', '-q'], { allowFail: true });
    fail(`could not switch to ${args.branch}: uncommitted changes outside the test folder would be ` +
         'overwritten. Commit or stash them first, then run publish again.');
}
if (stashed && git(['stash', 'pop', '-q'], { allowFail: true }) === null) {
    fail(`your changes conflict with the latest ${base}. They are kept in "git stash"; ` +
         'resolve the conflict, then run publish again.');
}

// 4. Commit and push.
const staged = stageAndCheck();
if (!staged.length) fail('nothing to publish: no changes compared with the last commit.');
commit(args.title);
git(['push', '-q', '-u', 'origin', args.branch], { auth: true });

// 5. Open (or find) the pull request.
let body = args['body-file'] ? readFileSync(args['body-file'], 'utf-8') : '';
body += '\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n';
let { status, data } = await github('POST', `/repos/${owner}/${repo}/pulls`, {
    title: args.title, head: args.branch, base, body,
});
if (status === 422) {
    ({ status, data } = await github('GET', `/repos/${owner}/${repo}/pulls?head=${owner}:${encodeURIComponent(args.branch)}&state=open`));
    data = Array.isArray(data) ? data[0] : undefined;
}
if (!data?.html_url) fail(`pushed ${args.branch}, but could not open a pull request (HTTP ${status}): ${redact(data?.message ?? '')}`);

console.log(`publish: ${staged.length} file(s) on ${args.branch}`);
console.log(`publish: pull request ${data.html_url}`);
if (startBranch && startBranch !== args.branch) {
    console.log(`publish: you are now on ${args.branch}. To go back: git checkout ${startBranch}`);
}
