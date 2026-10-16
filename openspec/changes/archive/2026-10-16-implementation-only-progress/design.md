## Context

The delivery rules check an Implementation item only after its "focused pre-ready evidence" is complete. Agents therefore write items and tasks such as "…with focused regression coverage" or "verify Rust unit tests cover…". Native tests run only in CI and drafts run no test suites, so such an item can never be checked truthfully before readiness. PR #781 stalled this way with its code and tests already committed.

## Goals / Non-Goals

**Goals:** an Implementation item tracks only delivered code, is checked once code and tests are written, and neither CI results nor manual validation are preconditions for the checkbox, finalization, or merge. Validation-style items are refused before promotion.

**Non-Goals:** changing CI gates, the ready mutation, Acceptance semantics, or how merged bodies are read after integration.

## Decisions

### Refuse validation items only before promotion

`assertImplementationOnlyProgress` in `openspec-acceptance-checklist.mjs` throws `implementation-progress-validation` when an item starts with `Manually`, `Validate`, `Verify`, `Confirm`, `Prove`, `Run`, `Smoke-test`, or `Test`, mentions manual testing, records, captures, or collects evidence, or delivers work "with" coverage, evidence, or validation.

Only `promoteCompletedDraft` and `check-delivery-body.mjs` call it. `parseImplementationAcceptanceScenarios`, which post-merge verification and receipts use, does not, so bodies merged under the earlier rule stay valid. Promotion runs after every item is checked, so the refusal is `blocked` and shows as a red check with the reason.

### Generated regression repair item

`TRIAGE_IMPLEMENTATION_ITEMS` drops "and record the focused evidence in the change design", which the new check would refuse. Open repair candidates keep their bodies; only new candidates use the new text.

### Guidance

`CLAUDE.md`, `AGENTS.md`, the change-delivery skill, `openspec/config.yaml`, and the runbook replace "focused pre-ready evidence" with written code and tests, say that CI runs the tests after readiness, and say that manual validation never gates a checkbox, finalization, or merge. The validation order in `config.yaml` marks maintainer validation optional.

## Risks / Trade-offs

- The check matches wording, so an item about validation policy itself can be refused. The author rewords it; the reason names the rule.
- An agent could check an item whose tests later fail in CI. CI still gates integration, and the fix goes into the same PR.

## Planned Evidence

Governance tests cover refused and accepted items in the body check, a blocked promotion, unchanged merged-body parsing, the generated repair body, and the guidance wording. Run those tests, strict OpenSpec validation, and preflight.
