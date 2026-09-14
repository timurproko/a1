## Why

Every non-documentation, non-version-only PR currently waits for serialized Windows Node 22 and Node 24 startup jobs, each installing/building the package and running startup, image, and history checks. Keeping one Windows startup lane on PRs while retaining Node 24 coverage in existing nightly/release validation removes duplicate work from the development critical path without deleting its tests or relaxing their limits.

## What Changes

- Run the Development validation startup job on Windows Node 22 only, including manually dispatched Development validation; remove the Node 24 matrix entry rather than reporting a skipped Node 24 job as a pass.
- Keep the complete existing Node 22 startup job required for applicable PRs, including exact-package first-attempt startup, enabled Defender, image preparation, durable history, and uploaded evidence. Preserve docs-only/version-only exemptions and every other required PR check.
- Retain Windows Node 24 and Node 22 in the existing nightly/release pipeline and manual Full regression workflow, with the same exact-package validation, assertions, startup limits, failure gates, and runtime support. No new nightly workflow or schedule is needed.
- Keep the aggregate `Development validation required` check bound to the current head and successful Node 22 startup; it must neither wait for the removed PR lane nor accept a skipped/failed required startup job.
- Update workflow policy tests and runbook coverage descriptions, and verify the reduced PR matrix and retained nightly/release coverage with live run evidence.
- Accept the explicit trade-off that a Node-24-specific regression can merge into `develop` before nightly detects it. Release publication must still fail when its required Node 24 validation fails.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `isolated-regression-testing`: Define the reduced PR startup runtime matrix, retained nightly/release/manual coverage, and evidence needed to accept that cadence change.

## Impact

- Planned implementation: `.github/workflows/ci.yml`, affected workflow/gate policy tests, and `docs/ci-release-runbook.md`; review the declarative GitHub inventory and update it only if its actual governed fields change.
- Verify `.github/workflows/release.yml`, `.github/workflows/full-regression.yml`, `config/validation-suites.json`, and `scripts/release/require-development-validation.mjs` remain consistent. Prefer no edits where their existing behavior already satisfies this proposal.
- No production code, Node support, performance thresholds, retries, branch-protection bypass, release schedule, or publication permission changes. Do not fold in unrelated failures or the OpenSpec archive implementation.
- This delivery is OpenSpec-only planning. It does not alter currently running jobs or activate the reduced matrix; implementation requires a separate explicit request under the active delivery rules.
