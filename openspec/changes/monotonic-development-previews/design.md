# Design

## Context

`publish.yml` and `scripts/release/publication-client.mjs` both derive a development version as `${base}-dev.${pullRequest}` from the one merged pull request associated with the selected `develop` commit. `latest-release.ts` classifies a version as development with `DEVELOPMENT_BUILD` (`X.Y.Z-dev.N`), `dispatch.ts` accepts `--develop <decimal>` or `X.Y.Z-dev.<decimal>`, `update.ts` resolves a named preview with `version.endsWith(`-dev.${requested}`)`, `a1-install.js` repeats those patterns, and `candidate-evidence.mjs` requires `-dev.\d+$`.

`runSelfUpdate` refuses an unnamed channel head below the running version ("Channel-head update never downgrades"). The automatic updater (`automatic-update.ts`) requests an exact target from `discoverLatestRelease`, whose result is cached for 24 hours in `update-check.json`; the cache is written only by discovery. `acquireUpdateExecutionLease` reclaims a dead owner's lease only when the durable transaction and the new request name the same target (`staleLeaseMatchesTransaction`), so a dead automatic worker with a foreign target blocks every manual update until someone requests that same target.

## Goals and non-goals

- Goal: a later development publication always sorts above an earlier one, whatever order pull requests merge in, while the pull request number remains readable in the version.
- Goal: existing published previews and installs keep working: `a1 update --develop 828` still resolves `0.2.7-dev.828`, and the first new-form publication is an ordinary upgrade for every install.
- Goal: a dead update owner never blocks a manual update, and the user is told what was interrupted.
- Goal: a launch directly after an explicit update does not act on a release-check result taken before the update.
- Non-goal: changing stable versioning, the reopening PR, release notes, or the Pi upgrade flow.
- Non-goal: pinning an installation to an older preview against the `Auto` update mode; `Notify` remains the way to hold a version.

## Decisions

1. **Version form `X.Y.Z-dev.<count>.<pr>`.** `<count>` is `git rev-list --count --first-parent <selected-commit>`. `develop` integrates by squash merge, so its first-parent history is linear and the count rises by one per merge; semver compares dot-separated numeric identifiers left to right, so `0.2.7-dev.1218.828` sorts above `0.2.7-dev.1217.842` and above the old `0.2.7-dev.835`. A bare count was rejected because it points at nothing a reader can open; a date was rejected because two merges on one day still land in PR order. The publish workflow computes the count in the version step from its full-history checkout; the publication client computes it with the same git command against the local clone, which already holds the selected `develop` commit, and verifies the registry version the same way it does today.
2. **Grammar accepts both shapes.** `DEVELOPMENT_BUILD`, `isDevelopmentTarget`, the installer patterns, and `candidate-evidence.mjs` accept `-dev.<n>` and `-dev.<n>.<n>`. `--develop <pr>` resolves against published versions whose suffix is `-dev.<pr>` or `-dev.<count>.<pr>`; a pull request number is unique, so a match in both shapes is still the ambiguity the existing "more than one preview" refusal reports. `--develop <count>.<pr>` is not a selector; the full version remains the exact form.
3. **Settle a dead owner's foreign transaction.** When the lease file names a process that is not alive and the active transaction's target differs from the requested one, the explicit command rolls the transaction back to its recorded prior cohort through `rollbackPriorCohort`, finishes it as `rolled-back`, removes the stale lease, prints one line naming the interrupted target, then proceeds with the requested target, which reinstalls the npm tree anyway. Rollback rather than resume keeps the user's request authoritative: they asked for another version. Automatic mode keeps its fail-closed behaviour.
4. **Invalidate the release-check cache after an explicit update.** `runSelfUpdate` removes `update-check.json` on success through a `latest-release.ts` helper. Discovery already treats a missing cache as "query in the background", so the next launch compares against the live channel head. Writing a fresh value was rejected because the explicit command resolves through `npm view` while discovery reads the registry's dist-tags document; one source of truth for the cache is simpler.
5. **Known gap, left as is.** `automatic-update.json` can keep `status: running` after the detached worker is killed; the lease and transaction remain the authority, and this change makes them reclaimable, so the stale status only affects the retry cooldown.

## Risks / Trade-offs

- A publication from a commit outside `develop`'s first-parent history would produce an unrelated count; the workflow already requires the selected commit to be a merged `develop` commit with exactly one pull request association, which excludes that.
- The two-part suffix makes `0.2.7-dev.1218.828` longer than before; `a1 version` and the update lines print it unchanged.
- Rolling back a dead owner's transaction reactivates the prior cohort for a moment before the requested install; the prior cohort is verified and was the running release when the dead attempt began.

## Migration Plan

No persisted-data migration. The first new-form publication supersedes every `-dev.<pr>` install through the ordinary update path. Rollback is restoring the single-identifier version derivation; already published two-part versions remain valid semver and resolvable by their pull request number.
