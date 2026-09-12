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

## Remaining handoff

Use the implementation worktree for local validation; build before launching through `./scripts/dev` or `./scripts/dev pi`. Do not attempt the first global cutover through an old `a1 update` or old recovery launcher. The accepted published version and any separately approved disposable-state reset paths must be supplied at the actual installation handoff. Settings, sessions, history, credentials, and `.a1` user data are not reset candidates.
