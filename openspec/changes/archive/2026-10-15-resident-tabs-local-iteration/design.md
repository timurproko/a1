## Context

See `proposal.md` for motivation. Milestone 6 (`resident-tabs-certification`, #750, now merged) found about twelve genuine lifecycle defects, each through one randomized 600-second chaos run or one platform's integration lane, and each cost a full validation cycle to confirm because nothing native runs on the developer's machine and nothing random can be replayed. The sans-IO core and its simulator exist, but most lifecycle logic still lives in `native/terminal-host/src/roles/server.rs`; moving it into the core is a later, separately planned change. This change only makes iteration cheap and failures reproducible.

## Goals / Non-Goals

**Goals:**
- Catch fast governance failures before a push.
- Replay any chaos run's action schedule from its report.
- Run one native integration test locally on Windows without a Zig toolchain, if endpoint protection permits the linked binary.

**Non-Goals:**
- Changing the host's behavior, protocol, verification, or packaging.
- Moving lifecycle logic into the sans-IO core (a later change).
- Changing pull-request, nightly, or dispatch validation selection. A lane-scoped dispatch was considered and dropped: once native tests run locally, a native-only CI cycle saves little, and it would add a new selection path to the protected aggregate.
- Weakening any governance gate; preflight runs the same checks with the same identifiers.

## Decisions

### 1. Preflight is a composition of existing gates, not a new policy

`npm run preflight` (`scripts/development/run-preflight.mjs`) runs, in this order and stopping at the first failure: the core job's install build (`npm run build`, which `npm ci` runs as `prepare`) and its build receipt, `typecheck`, `check:architecture`, changed-file code documentation, release documentation, changed-file naming, docs governance, strict OpenSpec validation with the workflow's pinned validator, the delivery-guidance governance test, and the core job's `pr-core-tests` and `pr-selected-tests` scopes with its selected tests. Each step invokes the script and arguments its workflow job runs, differing only in local selection and result paths, so a failure reports the same rule identifier and path; a governance test compares every step with `ci.yml` and `config/validation-suites.json`. The selection comes from the same `selectValidationImpact` CI uses, written to `.artifacts/validation/local-impact.json`, for the committed merge-base diff only: changed-file naming accepts nothing else, and a push carries committed bytes. Uncommitted paths are reported, not checked. The build is required because `typecheck` checks `bin/` against `dist/`. Preflight does not build the native host. It narrows the gap with CI but does not guarantee CI parity: CI computes its selection from the pull request's base, and validation remains the authority. The delivery skill and `docs/validation.md` state that a push follows a green preflight.

### 2. Chaos replay re-executes the recorded schedule, not just the seed

`run-resident-chaos.mjs` derives every random choice from one seeded generator (`--seed <n>`, default a fresh seed printed at start and stored in the report). A seed alone does not reproduce a run: whether a draw happens and its range depend on live state (`random(6)` is drawn only while tabs are open, `random(open.length)` depends on which tabs survived kills, and process timing changes both). So the report records the executed action schedule: each action with its kind, its resolved parameters (target tab by its schedule-local ordinal, stream mode, byte count, delay), and its timestamp. `--replay <report.json>` re-executes that schedule in order, resolving each tab ordinal against the replay's own tabs, and reports actions it could not apply (for example, a target that no longer exists) as divergence rather than silently substituting another. Every violation names the seed and the report path. The governance test proves the generator is deterministic for a seed, the schedule round-trips through the report, and a replay of a recorded schedule issues the same actions.

### 3. The prebuilt terminal library is gated on a spike, then a development-only override

Endpoint protection deleted a file the local Zig build touched; it is unproven whether linking a prebuilt `libghostty-vt` into a locally compiled Rust test binary is accepted. The outcome therefore starts with a spike, and only continues if the spike passes.

- **Publish.** When `TERMINAL_HOST_EXPORT_VT=<dir>` is set, `build.rs` copies the static library, headers, and a `terminal-vt.manifest.json` (vendored `libghostty-vt` version, Zig target and CPU, library SHA-256) into that directory after its Zig build; the build itself is unchanged. The terminal-host validation job sets it and uploads `terminal-vt-<platform>-<architecture>`, so the published library is exactly what CI linked.
- **Spike gate.** On the maintainer's Windows machine, with the artifact fetched by hand and a minimal development override, build and run one `role_integration` test with endpoint protection active. Record the result in `implementation-evidence.md`. If the link step, the test binary, or the library is quarantined, stop: remove this outcome and its requirement through scope refinement in this pull request, and keep the CI export only if it is useful on its own.
- **Override.** If the spike passes: when `TERMINAL_HOST_PREBUILT_VT` names a directory and the build is a local development build (`CI` unset and `TERMINAL_HOST_LOCAL_BUILD=1`, as today), `build.rs` verifies the manifest against the vendored `VERSION` and the Cargo target, links that library, and skips Zig; a mismatch fails with one line and never falls back. CI and release builds ignore the variable. `scripts/development/fetch-terminal-vt.mjs` downloads the artifact for the current platform from a named branch's latest successful validation run into `.artifacts/terminal-vt/`.

Alternatives rejected: an endpoint-protection exclusion (not reproducible for other developers and silently weakens the machine); vendoring prebuilt binaries in the repository (large, unverifiable, and against the provenance policy).

### 4. Correct the full-regression exclusion rule

The `continuous-integration` requirement says the only permitted `fullReleaseExclusion` is `terminal-host`, but `config/validation-suites.json` also excludes `resident-chaos` since #750. This change modifies resident chaos, so it corrects the requirement to name both and keeps the rule that any further exclusion needs a reviewed change. No selection changes.

### 5. Order of work

Preflight first, because it shortens every later push; then seeded chaos; then the prebuilt-library spike and, only if it passes, the override and fetch script.

## Risks / Trade-offs

- **[Endpoint protection still quarantines the linked binary]** → the spike gate decides before the override and fetch script are built; the outcome is removed rather than left half-built.
- **[A stale prebuilt library hides a VT regression]** → the manifest binds the vendored version and target, and CI and release builds never read the override.
- **[Replay diverges from the original run]** → replay re-executes the recorded schedule and reports any action it could not apply; timing is reported separately. Ordering bugs, which were every chaos violation of milestone 6, reproduce from the schedule.
- **[Preflight passes but CI fails]** → CI's base and selection can differ from the local merge base; preflight reports which base it used, and CI remains the authority.

## Resolved Questions

- No lane-scoped dispatch in this change (see Non-Goals).
