# BOPIS Playwright CI/CD Implementation Status

## 1) Objective
Set up an automated CI/CD pipeline to run Playwright regression for BOPIS, generate reports, and keep credentials/session data secure.

## 2) Current CI/CD Design

### Workflow File
- `.github/workflows/playwright-on-tag.yml`

### Trigger
- Manual: `workflow_dispatch`
- Auto: on push to `main` and on tag push

### Job Structure
1. **playwright-tests** (matrix shards)
- Runs in parallel with shard matrix:
  - `1/3`
  - `2/3`
  - `3/3`
- Uses Node 20
- Builds `.env` from `.env.example` and GitHub secrets
- Installs dependencies + Playwright browsers
- Runs:
  - `npx playwright test --reporter=blob,json --shard=<x/3>`
- Uploads artifacts per shard:
  - `blob-report/`
  - shard JSON report (`test-results-<shard>.json`)
- Prints post-run summary in logs:
  - failed test list
  - skipped test list with skip reason (if annotated)

2. **merge-reports**
- Downloads all blob artifacts
- Merges them into one HTML report via:
  - `npx playwright merge-reports --reporter html all-blob-reports`
- Uploads merged `playwright-report/` artifact

## 3) Playwright Configuration Implemented

### Config File
- `playwright.config.mjs`

### Important Settings
- `retries`: CI only (`process.env.CI ? 1 : 0`)
- `workers`: `1`
- `timeout`: `180000`
- `trace`: `retain-on-failure`
- `video`: `retain-on-failure`

### Project Split
- `setup` project:
  - runs `tests/specs/auth.setup.js`
  - creates shared auth storage state
- `chromium` project:
  - depends on setup
  - reuses storage state (`playwright/.auth/user.json`)
- `login-flow` project:
  - dedicated login validations
  - no storage state reuse (fresh auth checks)

## 4) Secrets and Environment Handling

### Required GitHub Actions Secrets
- `CURRENT_APP_URL`
- `OMS_NAME`
- `USERNAME`
- `PASSWORD`

### Runtime `.env` Generation
- CI creates `.env` dynamically from `.env.example`
- Values are upserted from GitHub secrets at run-time
- No plaintext credentials committed

## 5) Security and Repository Hygiene

### `.gitignore` Controls Added/Verified
- `.env`
- `playwright-report/`
- `test-results/`
- `auth*.json`
- `playwright/.auth/`
- `node_modules/`

### Why
- Prevent leaking:
  - credentials
  - Playwright auth/session storage
  - generated artifacts

## 6) Application Coverage Implemented So Far

### Apps/Areas Covered
1. **Launchpad login + BOPIS app selection**
2. **BOPIS Orders module**
   - Open tab flows
   - Packed tab flows
   - Completed tab flows
3. **Order detail flows**
   - pack / ready-for-pickup
   - handover
   - reject/cancel
   - edit picker
   - gift card activation
   - picklist / packing slip print flows
4. **Lifecycle and negative scenarios**
   - open -> packed -> completed lifecycle
   - empty-state and failure-tolerant checks

### Specs currently present
- `tests/specs/login-flow.spec.js`
- `tests/specs/order/bopis-lifecycle.spec.js`
- `tests/specs/order/bopis-negative.spec.js`
- `tests/specs/order/bopis-order-details.spec.js`
- `tests/specs/order/completed-page-print-packingslip.spec.js`
- `tests/specs/order/edit-picker.spec.js`
- `tests/specs/order/generate-packing-slip.spec.js`
- `tests/specs/order/gift-card-activation.spec.js`
- `tests/specs/order/handover.spec.js`
- `tests/specs/order/open-detail-print-picklist.spec.js`
- `tests/specs/order/open-details-pack.spec.js`
- `tests/specs/order/open-orders-pack.spec.js`
- `tests/specs/order/open-orders-print-picklist.spec.js`
- `tests/specs/order/reject-cancel.spec.js`

## 7) Known CI Failure Pattern (Latest)

### Observed
- CI setup/login can remain on:
  - `.../login?oms=...&token=...`
- Fails expectation to reach `/tabs/orders`

### Primary Cause
- Environment/domain mismatch in CI (example: prod redirect vs dev credentials/OMS).
- Local works because local `.env` and domain are aligned.

## 8) Current Definition of Done for Stable CI
1. Secrets point to same environment family (domain + OMS + user).
2. `setup` auth test passes and saves storage state.
3. Sharded test jobs finish and upload blob/json artifacts.
4. Merge job publishes consolidated HTML report artifact.
5. No sensitive auth JSON or generated artifacts are tracked in Git.

---

## Notes for Manager/Stakeholders
- CI/CD foundation is implemented and production-ready in structure (sharding, artifacts, merged report, secret-driven env).
- Remaining instability is environment alignment and test-data flakiness, not pipeline architecture.
