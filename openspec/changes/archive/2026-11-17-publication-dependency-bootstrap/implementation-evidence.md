# Implementation evidence

## Shared inspection and bounded repair

- Commit `e43919ee` extracts the doctor's dependency inspection, detects missing/stale package manifests and declared entry files without executing dependency code, and adds a builtins-only publication bootstrap with an offline npm tree check.
- A necessary repair runs literal Node/npm CLI arguments for one `npm ci --include=dev --no-audit --no-fund` in the canonical checkout, then rechecks. Ordinary npm lifecycle scripts remain enabled; doctor/build inspection does not recursively repair anything.
- Checkout-local locking, a recheck under ownership, configuration fingerprints, external-link refusals and finite query/install/wait budgets prevent ambiguous setup from reaching publication. Cancellation settles the owned npm process tree; unverified settlement retains the lock and exits with guidance instead of releasing repair authority.
- Direct tests use disposable filesystem fixtures and injected npm/termination ports, including simultaneous callers, foreign locks, a healthy-looking tree while a repair remains active, installer failures, incomplete rechecks, manifest drift and external links. The healthy worktree was also inspected with the actual offline npm query and required no installation.

## Public develop/release entries

- `develop.mjs` and `release.mjs` import only dependency-free helpers at startup and delay their dependency-bearing publication imports until setup succeeds.
- Release argument syntax is factored into a builtins-only helper and remains mutation-free for absent/invalid targets, including the retired approval flag and noncanonical/overflowing stable versions. Existing release-target exports remain available. Semver arithmetic stays in the existing release planner.
- Side-effect-free entry imports, exact argument forwarding, original failure outcomes and the ordinary release draft/validation/human-publication boundary are preserved. No package-script paths, version pins, root manifest or root lockfile are changed.
- Subprocess fixtures copy the actual entry/guard modules into dependency-empty disposable checkouts. A fake npm CLI supplies fake semver entry files; fake publication services require that package, proving imports occur after setup. They record exactly one continuation, no reinstall on a healthy subsequent call, no continuation on failure and no setup effects on library import.
- The Windows fixture explicitly removes case-duplicate inherited npm_execpath environment keys before selecting its fake npm CLI. An initial fixture attempt exposed this environment collision; the corrected final fixtures cannot accidentally select the parent's npm CLI.

## Validation

- Focused Vitest: dependency bootstrap/process, environment prerequisites/probes, actual entry fixtures, develop publication, release targets/command and validation-impact ownership: 199 tests across nine files passed.
- Repository build, complete typecheck, architecture boundaries and changed-file code/release documentation checks passed.
- Strict OpenSpec change validation and delivery body validation passed. Required metadata is included from proposal creation.
- No develop publication, release preparation, tag creation, registry publication, credential change, system-tool installation, live dependency deletion or running-agent restart was performed. Actual package installation was limited to development setup for this task checkout and the initial disposable fixture-environment issue described above, never the user's primary dependency tree.

## Known gaps and disposition

No unresolved implementation gaps. Automatic repair intentionally refuses unsafe links, foreign/ambiguous locks, malformed configuration and unverified process settlement; those require explicit operator inspection rather than unsafe cleanup or retry.

Full real-registry repair through a public publishing command was not exercised because it would continue into a live publication request. The final subprocess fixtures exercise the actual entry/guard chain with isolated fake installers/services; they are not presented as a real release. This is repository source, not an installed-product update, and the user's primary checkout gains it only after maintainer integration and pulling the change.
