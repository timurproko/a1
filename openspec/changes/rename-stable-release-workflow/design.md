## Context

`publish.yml` is the sole package publisher. It runs directly for scheduled nightly publication and is called by `develop.yml` for numbered previews, `release-candidate.yml` for stable candidate validation, and `finalize-release.yml` after an authorized human publishes the prepared GitHub Release. npm trusted publishing binds the OIDC identity to the exact *calling* workflow filename, so both package settings expose these wrapper names directly.

The repository formerly used `release.yml` for the shared publisher itself. That workflow was renamed to `publish.yml`, while provenance readers retained the exact historical `Release`/`release.yml` pair. Reusing `release.yml` for today's stable-only wrapper is safe only if current identity checks use the active workflow's distinct name/event and historical readers continue to require exact supported pairs.

## Goals / Non-Goals

**Goals:**

- Make the native stable-release wrapper's filename `release.yml`.
- Keep stable source, actor, tag, package, rollback, and reopening authority unchanged.
- Update every active exact-path consumer atomically.
- Preserve bounded historical provenance compatibility.
- Give the maintainer an explicit two-package npm migration with no ambiguous publication window.

**Non-Goals:**

- Renaming `publish.yml`, `develop.yml`, or `release-candidate.yml`.
- Changing npm channels, package bytes, validation depth, workflow display names, or release semantics.
- Making repository automation mutate npm account settings.
- Repairing or rerunning development publication run 36860638548; that run requires the separate `develop.yml` trusted-publisher entry already named by its failure.

## Decisions

### Rename only the stable wrapper path

Move `.github/workflows/finalize-release.yml` to `.github/workflows/release.yml` with its contents otherwise unchanged. Keep the display name `Publish stable release`, which distinguishes the active native-release wrapper from historical runs whose workflow name was exactly `Release` when `release.yml` was the shared scheduled publisher.

Update `publish.yml`'s exact `GITHUB_WORKFLOW_REF` expectation to `.github/workflows/release.yml@refs/tags/v<version>`. Update repository-governance path recognition and inventory, the runbook, source comments, and all focused tests that read or assert the stable wrapper path. Rename the wrapper-specific identify test file for source-tree consistency.

### Preserve historical identity as an exact pair

Do not rewrite archives or remove `Release`/`release.yml` compatibility from regression provenance readers. The old identity remains an exact legacy pair. The new active workflow is `Publish stable release`/`release.yml`, has only `release: published`, and is not a scheduled full-regression source. Tests will continue rejecting mismatched names/files so the reused filename alone grants no historical authority.

### Coordinate npm configuration after merge

Both npm packages must replace their trusted publisher entry for `finalize-release.yml` with `release.yml`, retaining owner `timurproko`, repository `a1`, and environment `npm-publish`. Repository code cannot perform this account mutation. No stable draft may be published after the repository rename merges and before both package settings are updated.

A prepared draft bound to a pre-rename source is also unsafe: its tagged commit does not contain the new `release.yml` wrapper. Land this change while no stable draft is pending, then prepare the next stable draft only from a `develop` source that contains the rename.

Development and nightly callers are independent. Their npm entries remain `develop.yml` and `publish.yml`; the failed development run can be retried as soon as `develop.yml` is trusted on both packages, without waiting for this rename.

## Risks / Trade-offs

- GitHub may associate the reintroduced `release.yml` path with old workflow history. The distinct current display name and trigger make active runs identifiable, while old records remain immutable.
- A missed exact-path reference could prevent stable publication or governance recognition. Active-content search and focused workflow/governance tests will cover every current reference.
- npm rejects stable OIDC during the post-merge settings window. The migration forbids stable publication until both packages show `release.yml`.
- A pre-rename draft would tag a commit without the new wrapper and may not trigger publication. The migration requires discarding/repreparing such a draft rather than publishing it.

## Migration Plan

1. Confirm no stable draft Release is pending.
2. Merge the coordinated repository rename.
3. On both npm packages, edit the trusted publisher from `finalize-release.yml` to `release.yml`, retaining repository `timurproko/a1` and environment `npm-publish`.
4. Verify `develop.yml` and `publish.yml` remain registered for both packages.
5. Prepare future stable drafts only from a post-rename `develop` source.

Rollback requires restoring `finalize-release.yml`, its exact repository references, and both npm trusted-publisher settings before another stable publication.

## Evidence

- `.github/workflows/finalize-release.yml` is renamed to `.github/workflows/release.yml` with the workflow body unchanged; `publish.yml` now requires that exact path at the source-bound release tag.
- Repository-governance inference/inventory, reopening provenance documentation, and the CI release runbook identify `release.yml`. The runbook requires both npm package settings and the draft's bound source to contain the new identity before stable publication.
- Production and active-documentation paths contain no `finalize-release.yml` reference. Its only remaining test references are negative assertions that the obsolete file and runbook name stay absent.
- Historical `Release`/`release.yml` triage compatibility remains unchanged. A focused assertion confirms the active `Publish stable release` workflow is not reclassified as the historical scheduled publisher.
- Seven focused release/governance test files pass with 106 tests, including wrapper identity, npm trust diagnostics, governance inference, runbook references, historical provenance, and executable release tag/ID extraction.
- Every workflow YAML file parses; strict OpenSpec validation, `tsgo -p tsconfig.json --noEmit`, release documentation governance, and `git diff --check` pass.
- GitHub reports no pending draft Release during implementation. No live Release was published and no npm package setting was mutated; after merge the maintainer must edit both package entries from `finalize-release.yml` to `release.yml` before preparing/publishing a stable draft.
