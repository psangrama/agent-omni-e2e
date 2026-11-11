# How to use this for your own project

A step-by-step guide to setting up AI-assisted end-to-end tests for **your** website, in **your**
GitHub repository. By the end, Claude will have explored your site, written the tests you approved,
and GitHub will run them on every pull request and every night.

For background on how it works, see the [README](README.md).

## Before you start

You need:

| What | Why |
| --- | --- |
| Access to this repository | It is private. Ask the owner for access, or for a copy. |
| A **test or staging** URL of your site | Tests click around and may create test records. Never use production. |
| [Node.js](https://nodejs.org) 22.23.4+ or 24.22.1+, Google Chrome, Git | To run the tests (older Node versions are not supported) |
| [Claude Code](https://claude.com/claude-code) and a Claude account | Only to **generate** tests. Running them needs no AI. |
| A GitHub account where you can create a repository | Where your tests will live |

And one decision: **WebdriverIO or Playwright.** Pick **one** engine for your project, not both.
If unsure, see [Choose your test engine](README.md#choose-your-test-engine).

> Do you want the tests **inside your application's code repo** instead of a separate test repo?
> Follow [Already have WebdriverIO or Playwright tests in another repo?](README.md#already-have-webdriverio-or-playwright-tests-in-another-repo)
> instead of steps 1–2 below. Steps 3–8 are the same.

## Step 1: Get your own copy

**Option A: "Use this template"** (easiest, if the owner has marked this repository as a template)

1. On this repository's GitHub page, click **Use this template → Create a new repository**.
2. Choose your account, a name, and **Private**.
3. Clone **your** new repository and open the folder.

**Option B: clone and re-point**

1. Create a new, **empty** repository on GitHub (no README, no `.gitignore`, no licence).
2. Clone this repository and point it at yours:
   ```powershell
   git clone https://github.com/psangrama/agent-omni-e2e.git my-qa-tests
   cd my-qa-tests
   git remote set-url origin https://github.com/<you>/<your-repo>.git
   git push -u origin main
   ```

Either way, from now on `origin` must be **your** repository.

## Step 2: Install

In the project folder (the one with `package.json`):

```powershell
npm install
```

## Step 3: Create your `.env`

```powershell
Copy-Item .env.example .env
```

Open `.env` and fill in:

| Setting | Value |
| --- | --- |
| `TEST_ENGINE` | `wdio` or `playwright`, your choice from *Before you start* |
| `BASE_URL` | Your test or staging site, e.g. `https://staging.example.com` |
| `TEST_USER`, `TEST_PASSWORD` | A **test** account, only if the site has a login. Otherwise leave empty. |
| `GITHUB_REPO` | **Your** repository, e.g. `https://github.com/<you>/<your-repo>`. Must match `origin`. |
| `GITHUB_TOKEN` | A GitHub token, see below |

**Creating the token:** GitHub → **Settings → Developer settings → Personal access tokens →
Fine-grained tokens → Generate new token**. Limit it to your repository only, and set *Contents*,
*Pull requests* and *Workflows* to **Read and write**. Everything else stays *No access*.

`.env` holds passwords and the token. It is never committed. Keep it private.

## Step 4: Check that it runs

```powershell
npm run test:smoke
```

Chrome opens your site and runs one example test (`TC-EXAMPLE-001`: the home page opens with a
title and visible content). If it passes, the setup works. If it fails, see
[Troubleshooting](README.md#troubleshooting).

## Step 5: Set up GitHub

In **your** repository: **Settings → Secrets and variables → Actions**.

| Tab | Name | Value |
| --- | --- | --- |
| Secrets | `BASE_URL` | Same as in `.env` |
| Secrets | `TEST_USER`, `TEST_PASSWORD` | Only if the site has a login |
| Variables | `TEST_ENGINE` | Same as in `.env` |

Without `BASE_URL`, every GitHub run fails with `ERR_NAME_NOT_RESOLVED` or `Invalid URL`.

## Step 6: Let Claude find the test cases

Open Claude Code **in the project folder** (otherwise the commands below don't exist):

```powershell
claude
```

Then type:

```
/qa-explore
```

Claude opens your site in a hidden browser, visits every page it can find, and writes
`test-cases/catalog.md`: a list of pages and the test cases it suggests. It only looks around; it
doesn't save, delete or approve anything on your site. Then it **stops and waits for you**.

Large site? Explore one section at a time, e.g. `/qa-explore only the Orders pages`.

## Step 7: Approve the test cases

Open `test-cases/catalog.md` (in VS Code, `Ctrl+Shift+V` shows a readable view). In the last
column, **Status**, change each `new` to:

- `approved`: automate this one
- `rejected`: skip it
- leave `new` to decide later

Save the file. Or ask Claude, e.g. *"approve all P1 cases"*. Tip: start with the **P1** cases
(each page loads and works at all); add more later.

## Step 8: Let Claude write the tests

```
/qa-automate
```

For each approved case, Claude writes the test, runs it, and fixes it if the **test** is wrong. If
the **site** looks wrong, it doesn't hide that: it marks the test as a suspected bug and tells you.

When everything passes, it pushes the tests to a `qa/…` branch in your repository and opens a
**pull request**. It gives you the link.

## Step 9: Review and merge

Open the pull request, look through the new tests, and click **Merge**. That's the "push" to
`main`: nothing reaches `main` without your merge.

## What runs automatically from now on

| When | What runs |
| --- | --- |
| Every pull request | The quick `@smoke` tests |
| Every merge to `main` | All tests |
| Every night | All tests (`30 20 * * *` = 20:30 UTC = 02:00 IST) |
| Every push | A Docker image of the tests is built and published to GitHub Container Registry |

Results and reports are on your repository's **Actions** tab. None of this uses Claude.

**About the nightly schedule:**
- The time is in **UTC**. Change the `cron:` line in `.github/workflows/e2e.yml` for a different time.
- It only runs from the **default branch** (`main`).
- On **public** repositories, GitHub pauses schedules after 60 days without activity. A commit or a
  manual run (**Actions → E2E tests → Run workflow**) turns it back on.

## Later: adding more tests

Run `/qa-explore` again after big site changes (or for a new section), approve the new cases, run
`/qa-automate`, and merge the pull request. Existing tests are not regenerated.

## Costs

Only steps 6 and 8 use Claude. Running the tests, locally or on GitHub, uses no Claude at all.

- **`/qa-explore`** is the heaviest: it reads every page, so it grows with the size of the site.
  Usually needed once per site, and again after big changes.
- **`/qa-automate`** grows with the number of approved cases and any repair attempts.
- **With a Claude subscription** (Pro, Max, Team or Enterprise), runs count towards your plan's
  usage limits, with no extra charge per run. **With an Anthropic API key**, you pay per use.

To keep usage down, explore one section at a time and approve the P1 cases first. Type `/cost` or
`/usage` in Claude Code after a run to see what it used.

## Quick checklist

- [ ] Own copy of the repository, with `origin` pointing at **your** repo
- [ ] `npm install` done
- [ ] `.env` filled in: `TEST_ENGINE`, `BASE_URL`, `GITHUB_REPO`, `GITHUB_TOKEN`
- [ ] `npm run test:smoke` passes
- [ ] GitHub secret `BASE_URL` and variable `TEST_ENGINE` added
- [ ] `/qa-explore` → approve → `/qa-automate` → pull request merged
- [ ] First GitHub Actions run green
