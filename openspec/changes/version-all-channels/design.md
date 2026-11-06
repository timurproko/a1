## Context

`runVersionStats` already resolves both npm dist-tags but gates rendering and preview-head pull-request discovery on whether the installed version is a prerelease. Stable output is deliberately limited by the current a1-shell requirement and assertions in `test/cli/version-stats.test.ts`.

## Goals / Non-Goals

**Goals:** Give stable and development installations the same three-line overview; preserve accurate preview attribution and graceful discovery failure.

**Non-Goals:** Change the running version, switch channels, publish a release, alter update defaults, enumerate arbitrary npm tags, or start any interactive runtime.

## Decisions

1. Always render Current, Develop, Release in the existing development-output order. Keep the installed-version prerelease check solely for Current's optional recorded pull request.
2. Query the development head's recorded pull request whenever its version is available, including on stable installations. Preserve silent omission for absent, invalid, or unreadable records.
3. Reuse existing dist-tag discovery and fallback unchanged. A missing next tag displays Develop: unavailable without a diagnostic; total discovery failure displays both remote lines unavailable and one diagnostic with exit code zero.
4. Update focused tests for stable success, preview attribution, absent next, and discovery failure; retain development behavior, npm output compatibility, fallback, and dependency-light invariants. Exercise the stable path for npm fallback and record lookup failures without real network access.

## Risks / Trade-offs

Stable version commands will also perform the existing best-effort preview attribution lookup when next is available. This is the same mechanism already used by development builds and does not introduce another discovery path.

## Validation strategy

After implementation approval, use TypeScript checking, focused CLI version tests, and strict validation of this OpenSpec change. Required CI remains authoritative after finalization. No implementation or tests are changed in this planning PR.

## Known gaps

None identified in the proposed scope. Already-installed stable binaries will retain their old output until the fix is distributed and installed.
