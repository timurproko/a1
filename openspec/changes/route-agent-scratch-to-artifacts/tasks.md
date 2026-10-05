## 1. Canonical Policy and Agent Guidance

- [ ] 1.1 Add the owning-worktree `.artifacts/` scratch-file requirement to canonical delivery policy and align `openspec/config.yaml` plus the change-delivery skill; verify each surface requires the linked worktree rather than OS temp, home/desktop, another checkout, or another worktree.
- [ ] 1.2 Define the boundary around agent-selected paths, ignored/uncommitted disposable content, durable evidence, and sensitive data without changing tool-internal, product-runtime, or hermetic-test temporary storage.

## 2. Delivery Documentation and Examples

- [ ] 2.1 Update the OpenSpec finalization runbook so pull-request body files and comparable command payloads are created beneath the owning worktree's `.artifacts/agent/` directory and no active example directs an agent to `$TMPDIR`, `%TEMP%`, or `/tmp`.
- [ ] 2.2 Align directly relevant architecture and cleanup wording while preserving the existing exact `.artifacts/` containment, generated-content inspection, and guarded disposal boundaries.

## 3. Governance Verification

- [ ] 3.1 Extend focused change-delivery guidance tests to require the positive `.artifacts/` rule across configuration, skill, runbook, and canonical specification, including linked-worktree ownership and non-authoritative/uncommitted status.
- [ ] 3.2 Add regression assertions that reject active agent guidance selecting OS/user temporary locations for pull-request bodies while allowing explicitly scoped tool-internal and hermetic-test temporary behavior.

## 4. Evidence and Handoff

- [ ] 4.1 Run focused delivery-guidance tests and strict OpenSpec validation; record exact outcomes in implementation evidence without running local `test:fast`, `test:full`, or `test:release` absent separate authorization.
- [ ] 4.2 Prepare implementation-specific acceptance scenarios for PR-body scratch location, linked-worktree isolation, and preserved tool/test exclusions; verify the PR list exactly matches the finalized conditional acceptance manifest.
