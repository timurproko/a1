# Design

## Context

The draft-Release protocol merged through PR #617 correctly kept npm publication behind an authorized-human snapshot, but its first operator exercise exposed an unsafe interaction. Preparation printed duplicate draft guidance and directed the operator back to local `--approve`, while GitHub's nearby native **Publish release** control looked like the natural next step. Native publication created Release database ID `398871347` and `v0.2.2` without publishing either npm package or advancing `master`. The Release was deleted.

The maintainer subsequently chose to delete the orphan tag and publish `0.2.2` through the ordinary current-`develop` path. The release-tag ruleset was disabled only for that deletion and immediately restored. The desired interaction is now: prepare and edit a draft, open **Approve stable release**, enter only the version, and let trusted automation validate npm and completion. No target tag exists while the Release is a draft; successful final publication creates it.

Five disposable-Git fixtures also exceeded their former 20-second per-test limit under ordinary Windows contention despite passing in isolation. Their hang detector needs a realistic finite budget without weakened assertions.

## Goals / Non-Goals

**Goals:**

- Provide one version-only **Approve stable release** button backed by trusted default-branch code.
- Keep an approved Release draft and its target tag absent through every pre-publication failure.
- Let final publication of the source-bound Release create the immutable tag, removing manual failed-tag cleanup.
- Print the draft-editing and approval-workflow URLs exactly once.
- Preserve exact source, body, package, asset, `master`, and authorized-human identity.
- Create one exact manually merged reopening PR from trusted automation.
- Preserve bounded release fixtures on slower Windows filesystems.

**Non-Goals:**

- Giving GitHub's native **Publish release** button or `release.published` event npm authority.
- Recovering or recreating the deleted orphan tag.
- Republishing an npm version, accepting a stale source, weakening exact-package validation, or auto-merging reopening.
- Changing startup acknowledgement, preview suppression, bare A1 ordering, or `a1 pi` ordering.

## Decisions

### 1. Stable approval is a minimal trusted Actions dispatch

`.github/workflows/approve-release.yml` accepts only an exact stable version. Trusted code verifies that `github.actor` resolves to a GitHub `User` with `write`, `maintain`, or `admin`, reads current `develop`, verifies one consistent open `x.y.z-dev` package identity, and locates exactly one unpublished source-bound draft. It rejects an existing target tag or either existing npm package version before package work.

The workflow normalizes and bounds the reviewed body, computes its SHA-256, and uploads one immutable approval artifact. The operator cannot provide source SHA, Release ID, body digest, or recovery mode. Local `--approve`, tag pushes, native publication, Apps, bots, and direct technical-input dispatch provide no stable authority.

### 2. Release publication owns tag creation

Preparation refuses an existing target tag and creates or exactly reuses only a draft Release bound to current authoritative `develop`. Approval and completion recheck that the target tag is still absent. Package assembly overlays the approved note on committed history, validates exact bytes, publishes both npm packages, verifies propagation and the installed pair, uploads the validated asset to the still-draft Release, and fast-forwards `master`.

There is no standalone tag-creation API call. The final PATCH publishes the approved draft with its existing `tag_name` and `target_commitish`; GitHub creates the lightweight tag at that source as part of publication. The workflow then verifies the public Release, exact body, and resulting tag identity. Therefore any failure before final publication leaves the Release draft and the target tag absent. Existing tags are never deleted, moved, or reused by release automation.

### 3. Preparation prints two links exactly once

`npm run release -- <target>` creates or safely reuses an exact draft without overwriting edits. Generated Markdown begins `## [version] - YYYY-MM-DD` and uses applicable Pi-style `### Breaking Changes`, `### New Features`, `### Added`, `### Changed`, and `### Fixed` sections. Successful output contains one direct draft-editing URL and one **Approve stable release** Actions URL; it never recommends local `--approve`.

Bare A1 keeps semantic-version-descending packaged history so the newest release is at the top. `a1 pi` retains Pi's oldest-first feed ordering so the newest entry remains nearest the transcript bottom.

### 4. Trusted automation prepares reopening

After stable completion, App-authenticated automation fetches then-current `develop`, verifies the expected open version and absent note, and creates one commit on `chore/release-<next>-dev`. The commit changes only the application manifest, root lockfile, installer version, and exact approved `docs/releases/<stable>.md`.

An empty-ref lease and strict PR validation prevent overwriting unrelated branches. Existing work is reused only when base, head, paths, versions, note digest, repository, open state, and absence of auto-merge all match. Required CI must pass before an authorized human merges it manually.

### 5. Fixture timing stays bounded

Real-Git fixtures retain caller-work, current-source race, conflicting draft, existing-tag refusal, reopening identity, and failure assertions. One named 45-second per-test integration budget acts as a hang detector under Windows load. Assertion failures remain immediate and are never retried into success.

## Risks / Trade-offs

- GitHub's native button remains visible; documentation must distinguish **Save draft** and the Actions approval button.
- Publishing a Release is an external mutation. All fallible package, asset, and `master` gates run first, and post-publication checks verify rather than establish authority.
- `master` advances before the final Release PATCH so a failed final API call can leave `master` advanced while the Release remains draft and untagged. Retrying the same immutable run is safe because the fast-forward and exact-source checks are idempotent.
- Automated reopening needs scoped contents and pull-request write permission but never merge permission.
- Longer fixture budgets could hide hangs; phase evidence and unchanged assertions keep the bound diagnostic.

## Rollout and Recovery

1. Merge only after exact-head PR CI and manual review.
2. From clean current `develop`, run `npm run release -- patch`; verify it creates one `0.2.2` draft and no tag.
3. Edit and save the draft, then run **Approve stable release** with version `0.2.2`.
4. On any pre-publication failure, verify the Release remains draft and `v0.2.2` remains absent; rerun the same immutable failed jobs when npm may already contain either package.
5. On success, verify the exact npm pair, public Release/body/asset, `master`, and GitHub-created `v0.2.2` all identify current approved source.
6. Let required CI pass on the generated `0.2.3-dev` reopening PR, then merge it manually and verify startup plus both changelog orderings.
