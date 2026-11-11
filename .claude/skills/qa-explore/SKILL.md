---
name: qa-explore
description: Explore the whole app at BASE_URL, generate the test-case catalog and test data, then stop for human approval. Use when the user asks to find pages, discover or list test cases, or start the QA pipeline.
---

# /qa-explore: discover pages and propose test cases

Optional argument: a URL or a scope (e.g. "only Onboard and Operate"). Default: `BASE_URL`, whole app.

1. **Check setup.** Confirm `.env` exists and `BASE_URL` is set (read only that key; never print
   `TEST_PASSWORD` or `GITHUB_TOKEN`). If `node_modules` is missing, run `npm install`. Refuse to
   continue if `BASE_URL` looks like production and tell the user why.
2. **Explore.** Run the `explorer` agent on the URL and scope. It writes `test-cases/catalog.md`.
3. **Test data.** Run the `test-data` agent on the new catalog.
4. **Stop for approval.** Do not run planner, generator or publish. Reply with:
   - pages found and cases per priority (from the explorer's summary)
   - anything that could not be reached, and any `QA-AUTO-` records not cleaned up
   - these instructions, verbatim:

     > **Your turn: approve the test cases**
     > 1. Open `test-cases/catalog.md` (press `Ctrl+Shift+V` in VS Code for a readable preview).
     > 2. In the **Status** column, change `new` to `approved` for cases to automate, or `rejected`.
     > 3. Save the file and run `/qa-automate`.
