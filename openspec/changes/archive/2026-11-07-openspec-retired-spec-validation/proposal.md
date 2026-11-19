# Proposal

## Why

PR #880 taught finalization and the post-merge snapshot to accept a capability a change retires. Finalized-delivery validation has one more check: every `openspec/specs/` path the PR changes must be one of the specs the delivery digests. A retired spec is deleted by the PR but, by design, is not digested, so the check rejects it with `delivery-unexpected-openspec-path`. PR #879, which retires six capabilities, finalizes but fails `Finalized delivery validation` for this reason. That job runs the trusted policy from `develop`, so the fix has to land there first.

## What Changes

- `inspectVersion3DeliverySnapshot` reports the canonical spec paths the delivery retires.
- `validateVersion3Candidate` allows exactly those paths among the PR's changed spec paths, besides the digested ones, and still refuses any other spec change.

## Impact

- `scripts/governance/openspec-archive-github.mjs`, with a fixture case in `test/repository-governance/openspec-delivery-finalization.test.ts`.
- `change-delivery-workflow`: the retirement requirement also covers ready-candidate validation.
- Deliveries that retire nothing are unchanged: the retired list is empty, so the allowed set is the digested specs as before.
