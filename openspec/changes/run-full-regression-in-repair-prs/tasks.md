## 1. Approval and selection

- [x] 1.1 Obtain explicit approval of this plan and an implementation request; continue in this same draft PR and worktree.
- [x] 1.2 Reconcile current develop, including any integrated #536 workflow/toolchain changes, without altering that separate delivery.
- [x] 1.3 Implement base-controlled full-regression selection with exact-head/path/association/label reasons, complete rename handling, planning-only draft exemption, and fail-closed input validation.
- [x] 1.4 Define and test the initial release/publishing, shared-support, prerequisite, and validation-authority trigger paths and additive `ci:full-regression` opt-in.

## 2. Shared execution and required PR checks

- [x] 2.1 Extract one reusable complete-regression implementation with an explicit source SHA and invocation/selection identity; preserve all four native lanes and retained suites, deadlines, artifacts, startup modes, and install/build receipts.
- [x] 2.2 Preserve the existing named scheduled/manual Full regression wrapper and compatible triage/artifact readers.
- [x] 2.3 Invoke complete regression from PR Development validation, expose stable per-lane checks, and handle implementation drafts and selection-changing PR events without running planning-only drafts.
- [x] 2.4 Require current selected full results in the existing protected aggregate; reject failed, cancelled, skipped, missing, mismatched, stale, or ambiguous evidence.
- [x] 2.5 Isolate concurrency and permissions across PR, manual, and scheduled callers; preserve no-publication/no-recursive-triage boundaries.

## 3. Delivery policy and regression coverage

- [x] 3.1 Update skill, workflow context, delivery/release/validation guidance, and affected task templates so selected PR full evidence replaces separate mandatory dispatch without a self-invalidating final-run-ID commit.
- [x] 3.2 Add classifier, workflow/matrix, aggregate-negative, lifecycle-ordering, cadence-exemption, fork-permission, and triage-compatibility fixtures from design.md.
- [x] 3.3 Verify ordinary PR cadence, standalone docs behavior, existing startup/runtime assertions, exact-package authority, and numbered-package nightly recovery requirements remain intact.
- [ ] 3.4 Complete implementation evidence and known-gap disposition; reconcile the target and acceptance scenarios for finalization. Do not mark future final-head workflow outcomes as already completed tasks.

## 4. Live validation and handoff gates

- [ ] 4.1 Verify native full-regression lane visibility in the implementation PR's actual Checks rollup and record pre-finalization observations without asserting they certify a later head.
- [ ] 4.2 Verify standalone Full regression caller compatibility and retained schedule/triage contracts; record this implementation evidence before finalization.

After these substantive tasks and evidence are complete, automated finalization and one exact-head PR validation run must succeed, including selected Full regression, before manual handoff. That final remote gate is reported through Actions evidence and the handoff, not through an extra committed task or run-ID edit. No auto-merge or publication is part of this change.
