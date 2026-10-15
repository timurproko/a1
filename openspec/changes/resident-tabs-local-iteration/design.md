## Context

See `proposal.md` for motivation. Milestone 6 (`resident-tabs-certification`, #750) found about twelve genuine lifecycle defects, each through one randomized 600-second chaos run or one platform's integration lane, and each cost a full validation cycle to confirm because nothing native runs on the developer's machine and nothing random can be replayed. The sans-IO core and its simulator exist, but most lifecycle logic still lives in `native/terminal-host/src/roles/server.rs`; moving it into the core is a later, separately planned change. This change only makes iteration cheap and failures reproducible, so that later change and every fix before it cost minutes instead of twenty-minute cycles.

## Goals / Non-Goals

**Goals:**
- Run any one native integration test locally in minutes on Windows, Linux, and macOS without a Zig toolchain.
- Replay any chaos violation from its seed.
- Catch every fast governance failure before a push.
- Dispatch only the native lanes when only native code changed.

**Non-Goals:**
- Changing the host's behavior, protocol, verification, or packaging.
- Moving lifecycle logic into the sans-IO core (a later change).
- Changing pull-request or nightly validation selection; only manual dispatch gains a subset.
- Weakening any governance gate; preflight runs the same checks with the same identifiers.

## Decisions

### 1. The prebuilt terminal library is a CI artifact consumed by an explicit development override

`build.rs` keeps the Zig build as the only path for release artifacts. When `TERMINAL_HOST_PREBUILT_VT` names a directory holding the static library and headers for the current Cargo target, and the build is not a release build (`CI` unset and `TERMINAL_HOST_LOCAL_BUILD=1`, as today), it links that library and skips Zig. The directory carries a `terminal-vt.manifest.json` with the vendored `libghostty-vt` version, the Zig target and CPU, and the library SHA-256; a manifest that does not match the vendored `VERSION` and the Cargo target fails the build with a one-line reason. The `terminal_hosts` and terminal-host validation jobs upload `terminal-vt-<platform>-<architecture>` from the same build that produced the host, so the local build links exactly what CI linked. A development script downloads the artifact for the current platform from the latest green run of a branch.

Alternatives rejected: an endpoint-protection exclusion (not reproducible for other developers and silently weakens the machine); vendoring prebuilt binaries in the repository (large, unverifiable, and against the provenance policy).

### 2. Preflight is a composition of existing gates, not a new policy

`npm run preflight` runs, in this order and stopping at the first failure: `typecheck`, `check:architecture`, `check:code-documentation:changed`, `check:names:changed`, strict OpenSpec validation of every active change, the delivery-guidance governance test, and the changed test selection. Each step is the same script CI runs with the same rule identifiers, so a preflight failure reads like the CI failure it prevents. The delivery skill and `docs/validation.md` state that a push follows a green preflight. Preflight does not build the native host.

### 3. Chaos is seeded, logged, and replayable

`run-resident-chaos.mjs` derives every random choice from a seeded generator (`--seed <n>`, default a fresh seed printed at start and in the report). The run appends each action with its parameters and timestamp to an action log in the report. `--replay <n>` reruns the recorded action sequence under that seed; timing still varies with the runner, so replay reproduces the schedule, not the clock. A violation message names the seed. The governance test for the chaos report proves that the same seed yields the same action sequence.

### 4. A dispatch may name its lanes

Development validation's `workflow_dispatch` gains a `lanes` input: empty keeps today's selection; `native` selects only the `terminal-host` and `resident-chaos` owners on their platforms. Pull-request and nightly selection ignore the input. The selection is recorded in the run's impact artifact so the aggregate explains what it covered, and a lane-scoped dispatch never emits the protected required aggregate.

### 5. Order of work

Local native tests first, because every other item is verified faster with them; then preflight; then seeded chaos; then the dispatch input. Implementation starts after #750 merges or rebases onto it, since both touch `run-resident-chaos.mjs` and `ci.yml`.

## Risks / Trade-offs

- **[A stale prebuilt library hides a VT regression]** → the manifest binds the vendored version and target, and release artifacts never use the override.
- **[Replay drifts from the original run]** → replay reproduces the action schedule and reports timing separately; the seed and schedule are still enough to reproduce ordering bugs, which were every chaos violation of milestone 6.
- **[Preflight is skipped]** → it is the stated rule in the skill and runbook, and CI remains the authority; preflight only makes failures local.

## Resolved Questions

- A lane-scoped dispatch is diagnostic only: it never satisfies the required pull-request aggregate.
