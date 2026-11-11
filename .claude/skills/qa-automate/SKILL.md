---
name: qa-automate
description: Automate the test cases the human approved in test-cases/catalog.md, run and heal them, then publish them to the GitHub repo in .env as a pull request. Use after /qa-explore and the human's approval.
---

# /qa-automate: approved cases → working tests → pull request

Optional argument: case IDs or features to limit the run (default: every `approved` case).

1. **Collect approved cases.** Read `test-cases/catalog.md`. Take only rows whose Status is
   `approved`. If there are none, stop and repeat the approval instructions from `/qa-explore`.
   Group them by feature.
2. **Build each feature**, one at a time, for the engine in `TEST_ENGINE` (`wdio` default, or
   `playwright`; read only that key from `.env`). Never build for both engines:
   1. `planner` → `plans/<feature>.md`
   2. `generator` → page objects + `test/specs/<feature>.e2e.ts`, runs the spec
   3. `healer` on failures (max 3 attempts). Suspected app bugs become `it.skip` with `// BUG?`.
3. **Run everything together**: `npm run test:ci`. Every spec must pass or be an explained
   `it.skip`. Do not publish a red suite. Report the failures instead.
4. **Update the catalog.** Set each automated case's Status to `automated`. Leave the others.
5. **Publish.** Check `GITHUB_REPO` and `GITHUB_TOKEN` are set in `.env` (never print the token).
   Write the pull-request description to `reports/pr-body.md`: cases automated, cases skipped
   as `BUG?` (with the note), and the local test result. Then run:
   ```bash
   npm run qa:publish -- --branch qa/<yyyy-mm-dd>-<features> --title "QA: automate <features>" --body-file reports/pr-body.md
   ```
   If it reports that the repository is empty, ask the human to confirm the first push to `main`,
   then run it again with `--bootstrap` (no `--branch` needed).
6. **Finish** with the pull-request link, the test result, and what the human must do next:
   review and merge the PR. After merging, GitHub Actions runs smoke tests on every PR and the
   full suite nightly. Repository secrets `BASE_URL` (and `TEST_USER` / `TEST_PASSWORD` if the
   app needs a login) must be set once under **Settings → Secrets and variables → Actions**.
