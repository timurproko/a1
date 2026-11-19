# Implementation candidate evidence

## Scope

Implements the clean-cutover revision accepted in PR #315 (following the original proposal in #314). The candidate uses `neutral-launch-v1`, neutral private launch keys, explicit external-setting ownership, required PR naming validation, and a whole-codebase naming audit in nightly/full-release validation. No private alias, dual-read/write, old-target encoder, or migration helper was added.

The implementation is not yet accepted. Installed-package CI, supported-platform acceptance, the version-specific first-install handoff, and maintainer manual acceptance remain tracked in `tasks.md`.

## Local evidence

- `npm ci` completed, including the root build and process-guardian build. The host reported two existing moderate dependency advisories and blocked some dependency lifecycle scripts under its install-script policy; no broad script approval or dependency-remediation change was made.
- Typechecking: passed.
- Architecture boundaries: passed.
- Full code documentation governance: passed.
- Product identity boundaries and historical/rejection approval governance: passed without regenerating the historical identity allowlist.
- Full internal naming audit: 671 tracked policy inputs, zero violations.
- Focused Vitest selection: 320 tests total, 319 passed, one platform-specific skip, zero failures. This selection covers the naming inspectors/selection/nightly wiring, validation aggregation/partitioning, current launch context, protected-data cutover fixtures, development launch, guardian behavior, release materialization/certification, live-cohort preservation, update/recovery, and related tooling.
- Rebased onto `f8832106` after PR #319 advanced develop. The newer documentation auto-merge reconciliation was preserved; only its private polling-key spellings changed. Post-rebase verification passed all 140 selected automation/naming tests, the full naming audit, typechecking, and documentation governance. The 319-test run above preceded that rebase.
- Strict validation of the OpenSpec change: passed.

The focused result is local debugging evidence, not a substitute for the required CI or physical/manual acceptance. No local `test:fast`, `test:full`, or `test:release` tier was run.

## Runtime and data boundaries

- Required current private context is not supplied by obsolete branded input.
- Unsupported package, retained-release, activation, rollback, and recovery metadata fails admission rather than selecting an old encoder or deleting state.
- Contract identity participates in release content identity and restart authority.
- Public settings, product command, package identity, and `.a1` user-data addresses are unchanged.
- Cutover tests use isolated temporary directories with settings/session/history sentinels; rejection leaves those sentinels and unsupported records unchanged.
- No global package installation, actual user-data deletion, or runtime reset was performed.

## PR and nightly checks

The `Internal naming validation` PR job is required by the current-head aggregate. It scans whole destination files from the authoritative complete diff and expands to a full tracked audit on policy/integration changes. Inspector and Git-selection regression tests cover both modes and reject stale or forged selection evidence.

The nightly release workflow selects `full-release`, whose mandatory commands now include `internal-naming-full`. This is a whole tracked-source audit without PR selection, including when nightly work verifies an existing immutable package. A regression test checks the workflow, full-release command ownership, publication gating, and detection in unchanged code.

## CI failure follow-up

Run `34690036288` on `f42f39a0` passed naming, changed-file documentation, rendering, Unix containment/package checks, and Windows Node 24 startup. Fast validation failed on two stale governance assertions: the docs-job slice included its new neighboring naming job, and the owner-list fixture omitted `launch-context`. Windows Node 22 reached readiness but exceeded the unchanged warm-start budget for the Pi profile: 3,227 ms versus 3,000 ms, with UI module loading the dominant interval. The preceding develop run passed that budget; the end-to-end excess is not established as solely attributable to context lookup overhead.

The follow-up fixes the job-region assertion and explicit owner fixture without weakening either policy. It also removes overhead introduced by this refactor: private context lookup fetches only relevant values, and each startup trace/cache operation takes one context snapshot. Tests cover unread unrelated getters, one read per current field, inherited/non-enumerable field exclusion, Windows casing conflicts, and the unchanged 3,000/3,001 ms acceptance boundary.

Focused follow-up validation passed all 106 selected tests, build, typechecking, the full naming audit, documentation governance, and identity governance. A local Windows/Node 24 benchmark of 3,000 context reads measured 684 to 232 ms with no private fields and 739 to 256 ms with populated private fields. This is a reader benchmark, not an end-to-end startup result. No budget or timeout was increased and no automatic retry was added. Fresh required CI, especially Windows Node 22 startup, remains necessary.

## Remaining handoff

Use the implementation worktree for local validation; build before launching through `./scripts/dev` or `./scripts/dev pi`. Do not attempt the first global cutover through an old `a1 update` or old recovery launcher. The accepted published version and any separately approved disposable-state reset paths must be supplied at the actual installation handoff. Settings, sessions, history, credentials, and `.a1` user data are not reset candidates.
