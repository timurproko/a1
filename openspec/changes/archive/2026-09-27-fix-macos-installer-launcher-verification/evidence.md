# Implementation evidence

## Pre-implementation incident

- Development run: [36335398692](https://github.com/timurproko/a1/actions/runs/36335398692), source `329522874ace9cb90b7949ecf25b9c3d89ab8a26`, version `0.2.1-dev.602`.
- Publish job `108666764247` succeeded. Both packages were published through GitHub Actions OIDC with SLSA provenance and their exact registry bytes were verified:
  - `@timurproko/a1@0.2.1-dev.602`: shasum `c423abcaf71b82a26fe76252d4b3782a38994651`, integrity `sha512-If9NXXOZEd1jko9b2+4WKv3iqj055L+Rz+smwcxnj1FyB3L0FXQ+PNJRvfcQhAuSIAlycnNKKB+LRiNVCx7FNA==`.
  - `@timurproko/a1-install@0.2.1-dev.602`: shasum `ec634130f09beb9367beee1fdbadf6f5f8f20741`, integrity `sha512-v5e9pNUcvZaFQfQLE/5J1wt8eJRucGAfGvVwAcY6p1sNSgGZ7pzIRrbCwIkA2dWXdHiNgyDQh9185ixoGMms/A==`.
- Both npm `next` tags resolve to `.602`.
- Published-pair jobs succeeded on Ubuntu (`108667582769`) and Windows (`108667582854`). macOS job `108667582781` reached the exact-pair smoke and failed with `installation failed: launcher verification failed`; the evidence upload then reported no file because the smoke exited before writing a success record.
- macOS temporary paths expose `/var/...` lexically and resolve beneath `/private/var/...`. The installer canonicalized the npm symlink target but compared it with an uncanonicalized expected package entry. These names identify the same file but compared unequal. The aggregate `Publication result` failed and `Complete release records` was skipped, so `.602` is not treated as a completed release.
- All three jobs displayed as `Published pair /` because the workflow referenced nonexistent `matrix.label`; API runner labels were required to identify the failed macOS lane.

## Implementation results

The installer now lazily canonicalizes the expected installed `bin/cli.js` entry whenever it verifies a symbolic launcher and compares that canonical identity with the launcher's canonical target. Missing entries and launchers resolving to another file continue to produce launcher-verification failure. Regular Windows npm shims retain their bounded content check, and package identity, version, activation, launcher completeness, and command precedence are unchanged.

A Unix-only orchestration regression materializes a valid installed package, replaces its launcher with npm-shaped symlink indirection, reaches the same prefix through a lexical parent alias, and requires exact silent success. The same test retargets the launcher to a foreign entry and requires rejection. It runs on Linux/macOS CI; Windows skips it along with the existing Unix-symlink execution test.

The published-pair workflow name now uses the authoritative `matrix.platform` and `matrix.node` fields. Focused governance coverage rejects the former nonexistent field without changing runner selection, matrix composition, artifact naming, or aggregation.

Validation on the implementation worktree:

- `npm ci` — passed; lifecycle build completed. npm reported two moderate dependency audit advisories and the environment check noted that `gh` is not on `PATH`; neither changes candidate behavior.
- `npx vitest run test/foundation/release/installer-bootstrap.test.ts test/repository-governance/release-pipeline-policy.test.ts` — passed, 31 tests with two Unix-only tests skipped on Windows.
- `npm run typecheck` — passed.
- `npm run check:code-documentation:changed` — passed with no violations.
- `node D:/Git/a1/node_modules/@fission-ai/openspec/bin/openspec.js validate fix-macos-installer-launcher-verification --strict` — passed.
- `git diff --check` — passed.

The first focused-test attempt preceded the worktree-local dependency installation and failed because its linked dependency tree lacked a Pi distribution file. After `npm ci`, the Windows checkout's CRLF executable source triggered a local Vite shebang parse error; normalizing those two working files to repository LF bytes produced the passing result above without changing the Git diff.

Per repository policy, no local full or release suite was run. Current `origin/develop` remained `329522874ace9cb90b7949ecf25b9c3d89ab8a26`, so no reconciliation merge was needed before implementation completion.

## Known gaps

- `.602` remains valid OIDC publication, registry integrity, Linux installation, and Windows installation evidence, but its failed macOS lane and aggregate remain failed. This change does not reclassify or mutate those immutable packages.
- A Windows workstation cannot execute the new Unix alias regression locally. Exact-head PR CI must run it on supported Unix lanes.
- Full native publication proof remains post-merge: one newly numbered candidate must pass both OIDC publications, registry-byte verification, Windows/Linux/macOS published-pair smoke, completion, and the aggregate before development publication is considered repaired.
