# Tasks

Each numbered section is one Implementation item.

## 1. Counter version and recorded pull request at publication

- [x] 1.1 In `.github/workflows/publish.yml`, compute the first-parent commit count of the selected source commit in the version step, stamp `${base}-dev.${count}` for development publication, and set `publication.pullRequest` and `publication.source` on the application and installer manifests before packing (the installer through `scripts/release/prepare-installer-package.mjs`). Keep the single-association check unchanged. Tests: `test/repository-governance/release-pipeline-policy.test.ts` pins the count derivation and the manifest recording.
- [x] 1.2 In `scripts/release/publication-client.mjs`, derive the same `${base}-dev.${count}` for the development target from the local clone and expose the pull request beside it; `npm run develop` reports it. Tests: `test/repository-governance/publication-client.test.ts` covers the counter version, its count source, the pull request association, and a malformed count.

## 2. Numbered preview by recorded pull request

- [x] 2.1 In `src/foundation/release/update.ts`, resolve `--develop <pr>` from the registry's package document (`queryPublishedVersions` in `latest-release.ts`) by the `publication.pullRequest` recorded in published manifests, with the `-dev.<pr>` suffix as the fallback for older previews, keeping the "more than one preview" and "published no preview" refusals. Tests: a number matching a recorded pull request, one matching only an old suffix, one matching nothing, one matching more than one version, and an unreachable registry.
- [x] 2.2 Apply the same resolution to `packages/a1-install/bin/a1-install.js`, reading the package document only for a numbered preview; a full version still resolves through npm. Tests: the installer's named-preview tests cover the recorded-pull-request path, the suffix fallback, ambiguity, and the document fetch.

## 3. `a1 version` shows the recorded pull request

- [x] 3.1 In `src/cli/version-stats.ts`, append ` (#<pr>)` to `Current` from the installed manifest and to `Develop` from the head version's manifest read through npm, omitting it without a diagnostic when absent or unreachable. Tests: a development build with and without recorded pull requests, a stable build unchanged, and registry failure keeping the existing unavailable behavior.

## 4. Dead owner with a foreign transaction

- [x] 4.1 In `src/foundation/release/update-execution-lease.ts` and `src/foundation/release/update.ts`, when the lease owner is not alive and the active transaction names another target, let a manual update roll that transaction back to its prior cohort, finish it as rolled back, remove the stale lease, print one line naming the interrupted target, and continue with the requested target; automatic mode keeps failing closed. Tests: `test/foundation/release/update-execution-lease.test.ts` and the update tests cover the dead-owner settle, the automatic-mode refusal, and the live-owner refusal.

## 5. Explicit update invalidates the release-check cache

- [x] 5.1 Add `invalidateReleaseCheckCache` to `src/foundation/release/latest-release.ts` and call it from `runSelfUpdate` after a successful explicit update. Tests: the cache file is removed after success and untouched after a refused update.
- [x] 5.2 Describe the counter version and recorded pull request in `docs/ci-release-runbook.md` and `docs/architecture/toolchain.md`.
