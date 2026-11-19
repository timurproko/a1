# Disposition: abandoned, implementation not accepted

Date: 2026-09-08

## Maintainer decision

The maintainer tested the implementation from [PR #284](https://github.com/timurproko/a1/pull/284), commit `fe67ec5d5c8e7c8188ba541dabf1bb77d16961cb`, and reported the same perceived suggestion delay as before. After reviewing the correctness benefits, additional state/compatibility machinery, and lack of demonstrated latency improvement, the maintainer decided not to adopt the change.

The maintainer explicitly approved closing #284 without merging and preparing an OpenSpec-only cancellation/archive PR without delta-spec synchronization, preserving unfinished tasks and historical evidence. This records approval of that administrative disposition, **not acceptance of the implementation** and not successful completion of the latency objective.

PR #284 was closed unmerged. Its required CI passed, but passing automated checks is not evidence that perceived delay improved. No controlled real-provider baseline/corrected latency measurements were completed. The user's observation is a manual finding for the tested configuration, not proof that every possible configuration would receive no benefit.

## Historical evidence and task accounting

- [PR #281](https://github.com/timurproko/a1/pull/281) introduced the original proposal.
- [PR #282](https://github.com/timurproko/a1/pull/282) recorded the broader API prerequisite audit, preserved verbatim here as `implementation-evidence.md`.
- [PR #283](https://github.com/timurproko/a1/pull/283), merged as `916cdf939ff9971e39c330027fd766e29859b2a4`, narrowed the plan to current public APIs.
- The unmerged implementation and its [implementation evidence](https://github.com/timurproko/a1/blob/fe67ec5d5c8e7c8188ba541dabf1bb77d16961cb/openspec/changes/fix-prompt-suggestion-cache-parity/current-api-implementation-evidence.md) remain available at #284. That branch recorded 13/16 checked tasks before the final CI results and subsequent rejection; it did not establish release acceptance.
- This archive preserves the merged planning baseline's checklist: two completed historical audit tasks and 14 unchecked tasks. It deliberately does not import the rejected implementation's completion checkboxes. The unchecked tasks are retained history, not an active instruction to resume work.
- The implementation branch `fix/supported-suggestion-parity` and worktree `D:/Git/a1/.worktrees/implement-supported-suggestion-parity` are retained. This administrative change does not delete or edit them.

The proposal, design, and delta requirements describe the abandoned plan. Their future-tense implementation instructions and the earlier audit's recommendations are historical, not current authorization or a pending upstream prerequisite.

## Archive and specification treatment

Archive destination: `openspec/changes/archive/2026-09-08-fix-prompt-suggestion-cache-parity/`.

- Archive as abandoned with incomplete tasks, using the maintainer's explicit disposition rather than the automatic completed-change workflow.
- **Do not synchronize** `specs/prompt-suggestion-request-parity/spec.md` into the main specifications.
- `openspec/specs/prompt-suggestion-request-parity/spec.md` did not exist at cancellation. No main capability was adopted and no main-spec rollback is necessary.
- Preserve all existing delta requirements as historical evidence rather than rewriting them to claim success or deleting inconvenient requirements.
- Leave `add-contextual-prompt-suggestions`, its acceptance work, and existing shipped suggestion behavior unchanged.
- Do not carry production code, tests, dependency changes, or generated implementation artifacts into the cancellation PR.

Revisiting any of these fixes requires a fresh explicit decision and appropriately scoped OpenSpec work. This archive does not authorize a smaller implementation, additional provider calls, or continued optimization.

## Administrative validation

- Targeted `openspec validate fix-prompt-suggestion-cache-parity --strict` passed after recording the disposition and before moving the directory.
- The design, delta specification, original audit, and `.openspec.yaml` were compared byte-for-byte with `origin/develop` and are unchanged apart from location. Task checkbox counts remain two checked and 14 unchecked.
- Repository-wide `openspec validate --all --strict --no-interactive` after the move reported 43 passing items and one existing failure: the placeholder Purpose in `openspec/specs/extension-packages/spec.md`. That file is identical to the base and was not changed in this stream.
- Documentation governance and `git diff --check` passed. No implementation test suite, provider request, or interactive UI was run for this administrative change.
