# Proposal

## Why

Development publication of `0.2.7-dev.750` (run 38742695792) failed on Linux and Windows in `test/foundation/release/session-resume.integration.test.ts`. #750 was the first release to pack the terminal host, so a bare or `--session` launch now always takes the resident route, and that route has no interactive-terminal precondition. A piped launch on Linux exits because the attach client cannot read the outer terminal size (`os error 11`). On Windows the tab runs in its own pseudo-terminal, so the project trust dialog opens inside it and readiness never arrives. Real users hit this with piped or scripted `a1`.

#750's own pull-request validation passed the same suite, because pull-request and Full regression candidates are packed without a terminal host. A missing host falls back silently to the direct UI, so every packaged suite before publication tested a route no release ships.

## What Changes

- Bare and session-selected A1 launches take the resident route only when standard input and standard output are both terminals; otherwise they run the direct UI with the fallback reason `no interactive terminal`, without probing or starting the resident host.
- Every pull-request validation lane that packs a candidate, and both Full regression packing jobs, build the release terminal host for their platform into `dist/native` before recording the build receipt.
- On CI, validation packing fails when the candidate lacks this platform's verified native artifacts, so the gap cannot silently reopen.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `multi-agent-tabs`: resident routing requires an interactive terminal.
- `continuous-integration`: validation candidates carry the release terminal host of the lane that packs them.

## Impact

- `src/foundation/resident-tabs/routing.ts`, `ensure-terminal-host.ts`, and `src/foundation/release/bootstrap.ts`.
- `.github/workflows/ci.yml` modular lanes (selection output `packs_candidate`, a 35-minute bound for non-native lanes) and `.github/workflows/full-regression-shared.yml`.
- `scripts/release/resolve-validation-job.mjs`, a dependency-free `scripts/release/validation-scopes.mjs` shared with `validation-tier.mjs`, and `prepare-validation-package.mjs`.
- Packaging lanes gain a cached release host build. The shipped package, publication, and selection rules are otherwise unchanged.
