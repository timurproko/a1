# Tasks

Each numbered section is one Implementation item.

## 1. Monotonic preview version at publication

- [ ] 1.1 In `.github/workflows/publish.yml`, compute the first-parent commit count of the selected source commit in the version step and stamp `${base}-dev.${count}.${pullRequest}` for development publication; keep the existing single-association check and the stable path unchanged.
- [ ] 1.2 In `scripts/release/publication-client.mjs`, derive the same `${base}-dev.${count}.${pullRequest}` for the development target from the local clone, and update `scripts/governance/candidate-evidence.mjs` to accept both preview shapes. Tests: `test/repository-governance/publication-client.test.ts` covers the two-part version, the count source, and registry verification of that version; the policy test covers the candidate check.

## 2. Preview grammar accepts both shapes

- [ ] 2.1 Accept `X.Y.Z-dev.<n>` and `X.Y.Z-dev.<n>.<n>` in `DEVELOPMENT_BUILD` (`src/foundation/release/latest-release.ts`), `isDevelopmentTarget` (`src/cli/dispatch.ts`), and the installer patterns in `packages/a1-install/bin/a1-install.js`. Tests: channel detection, selector parsing, and installer version validation for both shapes.
- [ ] 2.2 Resolve `--develop <pr>` in `src/foundation/release/update.ts` and the installer against published versions ending in `-dev.<pr>` or `-dev.<count>.<pr>`, keeping the "more than one preview" refusal. Tests: a numbered selector matches each shape, and a number present in both shapes is refused as ambiguous.
- [ ] 2.3 Describe the version form where `docs/` names `-dev.N`.

## 3. Dead owner with a foreign transaction

- [ ] 3.1 In `src/foundation/release/update-execution-lease.ts` and `src/foundation/release/update.ts`, when the lease owner is not alive and the active transaction names another target, let a manual update roll that transaction back to its prior cohort, finish it as rolled back, remove the stale lease, print one line naming the interrupted target, and continue with the requested target; automatic mode keeps failing closed. Tests: `test/foundation/release/update-execution-lease.test.ts` and the update tests cover the dead-owner settle, the live-owner refusal, and the automatic-mode refusal.

## 4. Explicit update invalidates the release-check cache

- [ ] 4.1 Add a cache-invalidation helper to `src/foundation/release/latest-release.ts` and call it from `runSelfUpdate` after a successful explicit update. Tests: the cache file is removed after success and untouched after a failed or refused update.
