# Design

## Context

`publish.yml` and `scripts/release/publication-client.mjs` both derive a development version as `${base}-dev.${pullRequest}` from the one merged pull request associated with the selected `develop` commit; the workflow stamps it with `npm version --no-git-tag-version` into both manifests before packing. `latest-release.ts` classifies a version as development with `DEVELOPMENT_BUILD` (`X.Y.Z-dev.N`), `dispatch.ts` accepts `--develop <decimal>` or `X.Y.Z-dev.<decimal>`, `update.ts` and `a1-install.js` resolve a numbered preview with `version.endsWith(`-dev.${requested}`)` over `npm view … versions`, and `version-stats.ts` prints `Current`, `Develop`, and `Release` from the installed manifest and the registry dist-tags.

`runSelfUpdate` refuses an unnamed channel head below the running version ("Channel-head update never downgrades"). The automatic updater (`automatic-update.ts`) requests an exact target from `discoverLatestRelease`, whose result is cached for 24 hours in `update-check.json`; the cache is written only by discovery. `acquireUpdateExecutionLease` reclaims a dead owner's lease only when the durable transaction and the new request name the same target (`staleLeaseMatchesTransaction`), so a dead automatic worker with a foreign target blocks every manual update until someone requests that same target.

## Goals and non-goals

- Goal: a later development publication always sorts above an earlier one, whatever order pull requests merge in.
- Goal: the version string stays one ordinary prerelease counter, as other preview channels use; the pull request remains discoverable through `a1 version`, `a1 update --develop <pr>`, and the release notes.
- Goal: existing published previews and installs keep working: `a1 update --develop 828` still resolves `0.2.7-dev.828`, and the first new-form publication is an ordinary upgrade for every install.
- Goal: a dead update owner never blocks a manual update, and the user is told what was interrupted.
- Goal: a launch directly after an explicit update does not act on a release-check result taken before the update.
- Non-goal: changing stable versioning, the reopening PR, release notes, or the Pi upgrade flow.
- Non-goal: pinning an installation to an older preview against the `Auto` update mode; `Notify` remains the way to hold a version.

## Decisions

1. **Version form `X.Y.Z-dev.<count>`.** `<count>` is `git rev-list --count --first-parent <selected-commit>`. `develop` integrates by squash merge, so its first-parent history is linear and the count rises by one per merge; `0.2.7-dev.1218` sorts above `0.2.7-dev.1217` and above the old `0.2.7-dev.835`. This is the shape Next.js, pnpm, React, and npm use for their preview channels. Encoding the pull request as a second identifier (`-dev.1218.828`) was rejected as unfamiliar; a date was rejected because two merges on one day still land in PR order. The publish workflow computes the count in the version step from its full-history checkout; the publication client computes it with the same git command against the local clone, which already holds the selected `develop` commit, and verifies the registry version the same way it does today.
2. **Pull request and source in the manifest.** The version step sets `publication.pullRequest` (number) and `publication.source` (commit SHA) on both the application and installer manifests with `npm pkg set` before packing; the registry keeps these fields in each version's manifest. Stable publications record `publication.source` only. Reading them needs no new dependency: `npm view <package>@'*' publication.pullRequest --json` returns the recorded pull request per published version in one query, and the installed `package.json` carries the running build's own.
3. **Numbered preview resolves by recorded pull request.** `resolveRequestedPreview` and the installer's equivalent look a positive decimal up as `publication.pullRequest` across published versions, then fall back to the `-dev.<n>` suffix match so previews published before this change stay selectable. More than one match is still refused; a number matching no manifest and no suffix is still "published no preview". The selector grammar, `DEVELOPMENT_BUILD`, and `candidate-evidence.mjs` are untouched because the version keeps one decimal identifier.
4. **`a1 version` shows the pull request.** A development build prints `Current: 0.2.7-dev.1218 (#828)` from its manifest and `Develop: <head> (#<pr>)` from the head version's registry manifest, reached through the existing dist-tag discovery path with one more bounded request; when the field is absent or the request fails, the line prints the bare version and no diagnostic, preserving the existing unavailable rules. Stable lines are unchanged.
5. **Settle a dead owner's foreign transaction.** When the lease file names a process that is not alive and the active transaction's target differs from the requested one, the explicit command rolls the transaction back to its recorded prior cohort through `rollbackPriorCohort`, finishes it as `rolled-back`, removes the stale lease, prints one line naming the interrupted target, then proceeds with the requested target, which reinstalls the npm tree anyway. Rollback rather than resume keeps the user's request authoritative: they asked for another version. Automatic mode keeps its fail-closed behaviour.
6. **Invalidate the release-check cache after an explicit update.** `runSelfUpdate` removes `update-check.json` on success through a `latest-release.ts` helper. Discovery already treats a missing cache as "query in the background", so the next launch compares against the live channel head. Writing a fresh value was rejected because the explicit command resolves through `npm view` while discovery reads the registry's dist-tags document; one source of truth for the cache is simpler.
7. **Known gap, left as is.** `automatic-update.json` can keep `status: running` after the detached worker is killed; the lease and transaction remain the authority, and this change makes them reclaimable, so the stale status only affects the retry cooldown.

## Risks / Trade-offs

- A publication from a commit outside `develop`'s first-parent history would produce an unrelated count; the workflow already requires the selected commit to be a merged `develop` commit with exactly one pull request association, which excludes that.
- `--develop <pr>` now costs one registry query for manifests instead of one for versions; both run only for a named preview.
- Rolling back a dead owner's transaction reactivates the prior cohort for a moment before the requested install; the prior cohort is verified and was the running release when the dead attempt began.

## Migration Plan

No persisted-data migration. The first new-form publication supersedes every `-dev.<pr>` install through the ordinary update path. Rollback is restoring the pull-request version derivation; already published counter versions remain valid semver and resolvable by their recorded pull request.
