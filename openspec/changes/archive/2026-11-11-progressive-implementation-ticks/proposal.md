# Tick Implementation outcomes while implementing

## Why

Pull-request task progress is the maintainer's live view of an implementation, but agents usually write every outcome in one pass and tick all items in a burst just before handoff. The rule that asks for prompt ticking is complete only in `CLAUDE.md`, which the A1 runtime never loads because `AGENTS.md` takes precedence, and nothing asks for the per-outcome commit that gives a tick its moment.

## What Changes

- Add one shared `Implementation progress` paragraph to `AGENTS.md`: plan one task group per outcome, deliver one outcome at a time, and tick it in the PR body right after its push and before starting the next.
- Reduce `CLAUDE.md` to an import of `AGENTS.md`, and point the delivery skill at the shared paragraph, so every agent reads the same single rule instead of separate drifting copies.
- Align the delivery runbook's planning and implementation steps with that order.
- Pin the paragraph and its single ownership with a guidance regression test.

## Impact

Repository instructions, the delivery skill and runbook, the change-delivery-workflow specification, and one guidance test. No product code, automation, readiness, finalization, validation, or merge-authority change. A tick still means written code and tests; nothing new blocks a push, a checkbox, or finalization. XR Build receives the same paragraph through its own repository's pull request.
