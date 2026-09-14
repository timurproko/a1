# Implementation evidence

## Source and incident

- Accepted planning PR: [#371](https://github.com/timurproko/a1/pull/371), merged as `6f906271f22c890b055c4021cc93b4f31c7c6c02`, with required CI passing.
- Implementation base: that current `origin/develop` commit, in `D:/Git/a1/.worktrees/implement-nightly-platform-validation`.
- Implementation PR: [#374](https://github.com/timurproko/a1/pull/374), branch `fix/nightly-platform-validation`, implementation commit `70c5207d`. Auto-merge is disabled; the PR remains open for acceptance.
- Original [nightly run 34825707734](https://github.com/timurproko/a1/actions/runs/34825707734), source `ffdf7b92465a5e4e19bc6621d4b496c2d8197f3e`, immutable package `0.1.8-dev.368`.
- [Darwin job 103917595348](https://github.com/timurproko/a1/actions/runs/34825707734/job/103917595348): `prompt-input-ux.test.ts` / `derives startup and shortcut help from live resolved bindings` expected `alt+m`, received `option+m`.
- [Windows Node 22 job 103917595423](https://github.com/timurproko/a1/actions/runs/34825707734/job/103917595423): `dependency-certification.test.ts` / `coordinates independent publishers recovering the same abandoned lease` failed with `EPERM` at the release rename; `pi-event-frame-parity.test.ts` / `produces one truecolor diagnostic hash under opposing ambient capabilities` observed two hashes.

## Before/after diagnostics

### Certification release

Fault-injection tests run against the old release callback failed on transient release errors, permanent-contention budget assertions, missing/replaced ownership, successor preservation, and combined publication/release failures. The old `finally` masked a publication `ENOSPC` with release `EIO`.

The implementation retries only release contention (`EPERM`, `EACCES`, `EBUSY`) under one shared 1,000 ms budget, rechecks active ownership before each retirement attempt, and never returns to the active path after retiring its own generation. Tests advance backoff time without wall-clock sleeps. Both canonical and legacy certification bytes and restart-bound metadata remain unchanged. Independent abandoned-lease recovery runs three separately named rounds, each launching three real publishers; delayed reclamation cannot overwrite the retained generation tombstone.

### Event-frame capture

Adding first-divergence diagnostics without changing capture timing reproduced the original hash failure locally on Windows Node 24:

```text
repetition=11 ambient=256color
frames[3] stage=completed serialized offset=67
expected capturedAnsi prefix: \u001b[3A\r\u001b[2K\u001b[38;2;129;162;190m...
actual capturedAnsi:          \u001b[1G\u001b[?25l
```

The missing evidence was the completed redraw, not a 256-color substitution. The old capture mixed explicit `renderNow` checkpoints with wall-clock paint timers and treated any terminal write, including cursor housekeeping, as completion of the checkpoint. This left its captured byte boundary dependent on asynchronous paint timing. A first separately delayed run happened to pass; it is not claimed as a deterministic reproduction of the original failure.

The fixture now uses the same Node mock-timer approach already used by the repository's independent rendering producer: declare a fixed clock, hold timeout/interval paints, leave cooperative next-tick/immediate event delivery real, and render at explicit checkpoints. No production renderer or pinned package changes are made. The fixture disposes resources, resets timer state, and restores theme/capabilities on success and failure. Structured first-difference diagnostics remain strict; negative tests cover SGR, clear/addressing, cursor visibility, and missing-state mutations.

After correction, both normal and delayed test cases each perform at least 12 captures per ambient color mode, comparing against an ordinary capture and requiring one hash. Delayed cases yield between events and cross the real 16 ms paint interval before completion without advancing the declared diagnostic clock. Full independent producer/parity gates remain required CI evidence; these diagnostics do not replace them.

## Local focused validation

No local `test:fast`, `test:full`, or `test:release` suite was run.

- Windows Node 24.16.0: focused certification release/migration, shortcut help, and event-frame tests passed, **61 passed / 1 existing Windows file-symlink skip**.
- Windows Node 22.23.2: the same four files passed, **61 passed / 1 existing Windows file-symlink skip**. No new skip, retry, or timeout increase was introduced.
- Related capability scoping, pinned theme/raw-terminal parity, and parity-governance checks: **32 passed** across five focused files on Windows Node 24.
- Typecheck, full code-documentation governance, architecture/provenance checks, strict OpenSpec validation, and whitespace checks passed before pushing.
- The fixture generator was executed under ambient truecolor and 256-color. Both outputs and the tracked original have SHA-256 `f1e0fd6f1e3512c2512b9f41771b47b660d050c47bab4573099632e3eda34bba`. No generated baseline is changed.

Focused command (from the implementation worktree):

```sh
npx vitest run test/foundation/release/dependency-certification-release.test.ts test/foundation/release/dependency-certification.test.ts test/integrations/pi/components/prompt-input-ux.test.ts test/features/owned-ui/pi-event-frame-parity.test.ts
```

Node 22 uses the same command via `npx --yes --package=node@22.23.2 node node_modules/vitest/vitest.mjs run ...`.

## Remaining gates

- Passing required implementation CI and native four-lane full regression evidence, with Windows Defender retained.
- Maintainer local acceptance and explicit manual merge authorization; code-PR auto-merge must stay disabled.
- Full nightly-equivalent validation of the newly numbered merged implementation package, recording its exact source, version, digest, and all four outcomes. Existing `.368` must not be mutated or republished.
- Accepted implementation archival in a specification-only follow-up.

Dependency installation emitted an existing `node-domexception@1.0.0` deprecation warning and reported two moderate audit findings. No dependency or lockfile change is included; if this blocks a required gate, it needs separate attribution and scope rather than a silent package upgrade here.
