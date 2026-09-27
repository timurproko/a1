## Context

PR #604 intentionally removed installer compatibility aliases `--version`, `--latest`, and `--next` while aligning fresh installation with `a1 update`: bare selects the release, `--develop` selects develop, and `--develop <preview-or-version>` selects an immutable preview. Source and package tests verified that removed options fail.

Post-merge run `36342374957` successfully built, validated, OIDC-published, and registry-verified `@timurproko/a1@0.2.1-dev.604` and `@timurproko/a1-install@0.2.1-dev.604`. Every native published-pair job then ran `scripts/release/smoke-published-installer.mjs`, which still selected `['--version', version]` for npm's internal `next` channel. Each installer exited with `installation failed: unsupported option` before writing evidence, and the publication aggregate correctly failed.

## Goals / Non-Goals

**Goals:**

- Invoke newly published develop installers through `--develop <exact-preview-version>`.
- Retain bare invocation for release published-pair smoke.
- Prevent repository smoke tooling from reintroducing a removed installer target option.
- Obtain complete native installation evidence from a new immutable development candidate.

**Non-Goals:**

- No republish, tag movement, or mutation of `.604`.
- No restoration of `--version`, `--latest`, or `--next` compatibility in the installer.
- No change to installer target resolution, presentation, package identities, trusted publishing, matrix breadth, or aggregate requirements.
- No weakening or bypass of published-pair smoke.

## Decisions

### 1. Correct the consumer, not the public interface

For `RELEASE_CHANNEL=next`, pass `--develop` followed by the exact `RELEASE_VERSION` already bound to the registry-verified pair. For `latest`, continue passing no target arguments. This mirrors the accepted public contract while preserving exact-package validation: the harness still requires the installed manifest to equal the requested immutable version.

Restoring `--version` as an alias is rejected because #604 explicitly accepted its removal. Passing bare `--develop` is also rejected because it would resolve a moving tag instead of expressing the exact candidate that the smoke lane is charged with validating.

### 2. Guard the release consumer at pull-request time

Extend focused release-policy coverage to inspect the published-installer smoke contract. It must require the develop channel's exact `--develop <version>` argument pair and reject removed option spellings. This small static contract complements native execution, which occurs only after registry publication and is too late to prevent another immutable candidate from carrying a harness-only failure.

A broad refactor or mock-process integration harness is rejected for this correction: package behavior already has direct argument-parser and orchestration tests, while this defect is the literal argument adapter in release tooling.

### 3. Preserve failed evidence and publish a new candidate

Run `36342374957` and `.604` remain immutable evidence: publication and registry checks succeeded; all three native installation lanes and the aggregate failed. After this corrective PR merges, one newly numbered development publication must pass both OIDC publications, exact registry verification, Windows/Linux/macOS published-pair smoke, completion, and aggregate. Rerunning `.604` cannot validate changed repository tooling because its selected source remains the merged #604 commit.

## Validation Matrix

| Layer | Evidence |
| --- | --- |
| Release policy | Develop smoke maps to `--develop <exact version>` and removed target options are absent |
| Stable contract | Release smoke retains bare installer invocation |
| Focused repository checks | Release-policy tests, typechecking, changed-code documentation governance, strict OpenSpec validation, and diff checks pass |
| PR | Exact-head selected CI validates the corrective source and finalized delivery record |
| Post-merge | A newly numbered candidate passes OIDC publication, registry verification, all native published-pair jobs, completion, and aggregate |

## Risks / Trade-offs

- **Static policy mirrors a small source contract.** The adapter is one literal branch and native post-publication execution remains authoritative; the focused assertion catches this exact pre-publication regression cheaply.
- **Exact preview resolution performs registry lookup.** That is the public interface being validated and the harness already runs after registry verification; manifest equality still rejects selection drift.
- **Another candidate is required.** Immutable npm versions cannot be repaired, and a new source commit is necessary to exercise the corrected harness.

## Migration Plan

1. After explicit plan approval and implementation request, continue in this worktree, branch, and draft PR.
2. Add the focused policy regression and change the smoke harness target arguments.
3. Complete evidence, acceptance scenarios, finalization, and exact-head CI before authorized manual merge.
4. After merge, publish one newly numbered development candidate and require all native published-pair lanes, completion, and aggregate to pass.

Rollback uses a later corrective PR and never restores compatibility aliases or mutates published versions.
