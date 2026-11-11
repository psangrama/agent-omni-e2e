# test-cases/

Input for the agents. Two sources land here:

1. **Discovered** — `catalog.md`, written by the `explorer` agent from an app URL.
2. **Imported** — manual cases exported from Excel / Jira / TestRail as `.csv` or `.md`.

## `catalog.md` format

```markdown
# Test case catalog — <app> — <date>

## <Feature name>

| ID | Title | Priority | Type | Preconditions | Steps (short) | Expected result | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-LOGIN-001 | Login with valid user | P1 | positive | User exists | Open login, enter creds, submit | Dashboard shown | new |
| TC-LOGIN-002 | Login with wrong password | P2 | negative | User exists | ... | Error "Invalid credentials" | new |

### Field rules — <page>
| Field | Type | Required | Rules | Validation message |
| --- | --- | --- | --- | --- |
| email | email | yes | maxlength 100 | "Enter a valid email" |
```

- **Priority:** P1 core/smoke, P2 important variation, P3 edge case
- **Type:** positive, negative, boundary
- **Status:** new, automated, duplicate, approved, rejected

The human sets `approved` / `rejected` during the checkpoint review.

## Imported CSV columns

`ID,Title,Priority,Preconditions,Steps,Expected`
