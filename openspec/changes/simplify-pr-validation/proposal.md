## Why

Ordinary pull-request feedback still takes too long and consumes broad integration coverage even when a change cannot affect those contracts, while brittle regression tests can fail on archived planning evidence or equivalent policy wording instead of current behavior. The current attempt-bound aggregate also prevents GitHub's failed-jobs-only rerun from reusing successful exact-head jobs, forcing unnecessary repeated work after infrastructure failures.

## What Changes

- Replace the complete fast test population on every code pull request with a small mandatory PR core plus directly changed tests and coarse, reviewed path-owned test scopes; unknown inputs and changes to CI authority still select complete validation.
- Select package, startup, rendering, compatibility, and cross-platform integration only when their reviewed owners are affected, while retaining complete multi-platform coverage in Full regression, nightly, preview/release, and explicit conservative runs.
- Support failed-jobs-only reruns for an unchanged head by binding reusable success to the run, head, and selection rather than requiring every result to share the latest attempt; never reuse results across commits or changed selections.
- Remove permanent regression assertions that merely reread one-time OpenSpec implementation evidence or exact prose. Validate generators and policy semantics with hermetic fixtures, and leave historical evidence validation to OpenSpec finalization/audit.
- Narrow custom receipts and aggregate evidence to boundaries where exact artifact identity is material, especially package and publication gates; rely on native Actions conclusions for ordinary checkout-bound test execution.
- Retain fail-closed outcomes, first-attempt performance semantics, current product assertions, and no automatic retry of semantic failures.
- Let one successful finalized exact-head Implementation run satisfy the stable protected check so manual review can proceed directly to a human merge without a PR-body phase promotion or second workflow run.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Define a bounded mandatory PR core, coarse reviewed ownership selection, same-head failed-job reruns, simpler aggregation, and complete conservative fallback/cadence.
- `isolated-regression-testing`: Require durable regression tests to protect current behavior without depending on mutable planning evidence or exact policy prose, while preserving hermetic integration and release coverage.
- `change-delivery-workflow`: Keep finalized version-3 deliveries in Implementation through authorized manual merge, with green exact-head CI enabling review rather than requiring a metadata transition.
- `github-repository-governance`: Validate the finalized Implementation body and expose the stable protected aggregate in the same workflow run as product validation.

## Impact

Implementation would affect development workflow topology under `.github/workflows/`, validation ownership and suite configuration under `config/`, selection/tier/aggregate tooling under `scripts/release/`, version-3 delivery policy and candidate readers, brittle governance tests, and validation/delivery documentation. It may remove or rewrite tests whose only oracle is archived change evidence, but it will not remove current product assertions, weaken release/package identity, increase product timeouts, add success retries, change publication authority, or alter the public API.
