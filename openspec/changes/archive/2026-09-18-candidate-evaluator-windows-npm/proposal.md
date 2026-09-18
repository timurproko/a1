## Why

`scripts/governance/pi-candidate-evaluator.mjs` starts `npm.cmd` through `execFile` on Windows, which Node refuses with `spawn EINVAL` because a `.cmd` shim needs the command interpreter. The first dispatched run of the nightly sync (run 35362409929, 2026-09-18) completed every proposal step and then failed in its commit step because the staging command named the ignored artifacts directory. The dry run of the upgrade driver against 0.85.1 on 2026-09-18 therefore recorded the `evaluate` step as failed on the maintainer's machine while it passes on the Linux runner, so a proposal cannot be reproduced locally where the conflicts are resolved.

## What Changes

- The nightly workflow stages the proposal with `git add -A`: the previous `:!.artifacts` exclusion named an ignored directory, which makes `git add` exit 1 ("Use -f if you really want to add them") before the commit, so the first dispatched run against 0.85.1 produced a full proposal and then failed to push it. `.artifacts` is ignored, so no exclusion is needed.
- The evaluator runs its install, compile, and runtime stages through `cross-spawn`, which resolves the `.cmd` shim without a shell, with the same abort signal, timeout, and captured output; a non-zero exit becomes an error naming the executable, the exit code or signal, and the captured stderr. The repository already depends on `cross-spawn` for the validation tiers and release scripts.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pi-api-boundary`: the candidate evaluator runs on every supported development platform.

## Impact

No runtime or CI behavior changes on Linux; on Windows the evaluator now completes: against the current pin it reports three passed stages, and against a version that does not exist it reports the `install` stage failed with npm's `ETARGET` message. The 4-case evaluator suite passes unchanged.
