## Context

See `proposal.md` for motivation. The local `npm run develop` exception is the publication client propagating `gh run watch --exit-status`; build and pack are not failing.

### Regression evidence

| Evidence | Result |
|---|---|
| Run `33198959119`, source `3db775c`, package `0.1.8-dev.182` | Last successful develop publication before PR #186 |
| PR #186, commit `8c0f4859` | Stopped stripping SGR from static/event comparisons, added settings ANSI parity, and regenerated truecolor diagnostics |
| Run `33488516900`, package `.192` | First publication containing PR #186; same six macOS/Linux parity failures |
| Runs for packages `.203`, `.205`, `.209`, `.210` | Same six macOS/Linux failures repeated |
| Run `33619304128`, package `.210` | Build/pack and both Windows lanes passed; macOS/Linux failed the six parity assertions |
| Forced `trueColor: false` reproduction | 39 static rows differed; first actual `38;5;241`, expected `38;2;102;102;102` |
| Forced `trueColor: true` reproduction | Existing focused parity files passed unchanged |

Before PR #186, `normalizeParityRow()` removed all CSI sequences and `portableFrames()` removed SGR before comparison. The color-depth mismatch already existed as an implicit harness input but could not fail. PR #186 correctly made semantic ANSI part of parity authority, exposing the missing capability declaration.

Pi-TUI 0.84.2 deliberately reports truecolor for modern Windows consoles. On unknown non-Windows terminals it reports truecolor only with a positive hint such as `COLORTERM=truecolor`; non-interactive GitHub macOS/Linux workers therefore select 256-color. This is an operating-system/environment distinction in the configured matrix, not evidence that Node 24 changed ANSI behavior. Linux and macOS are currently tested only on Node 24, so the previous Node-version attribution was unsupported.

`applyPiTheme("dark", false, "truecolor")` explicitly creates the A1-owned theme in truecolor but calls pinned `initTheme("dark", false)`, whose public API has no mode parameter and reads Pi-TUI capabilities. On macOS/Linux this creates a mixed composed frame. Normal product initialization does not force only one side this way; it uses detected terminal capability, so the failure is in deterministic evidence setup rather than demonstrated runtime rendering.

## Goals / Non-Goals

**Goals:**

- Make semantic-ANSI evidence independent of OS, Node version, environment variables, TTY attachment, and fixture-generation host.
- Model truecolor and 256-color as explicit workload inputs and initialize both pinned and owned theme producers consistently.
- Preserve exact SGR grammar within a declared mode rather than equating quantized 256 colors with source RGB.
- Restore the complete Pi-TUI capability state after synchronous, asynchronous, failing, nested, and sequential evidence captures.
- Keep existing truecolor rendered fixture payloads unchanged while making their color-mode contract explicit.
- Run direct pinned-versus-owned parity in both supported color modes on every CI platform.
- Make fixture update commands byte-idempotent under opposing ambient capabilities.
- Restore reliable exact-package develop publication without changing runtime behavior.

**Non-Goals:**

- Forcing truecolor in production or GitHub Actions.
- Changing Pi-TUI capability detection, A1 runtime theme detection, or terminal ownership.
- Treating truecolor and 256-color SGR as byte- or visually-identical.
- Returning to broad ANSI stripping or semantic color normalization.
- Creating OS-specific fixtures or accepting whichever fixture bytes one runner emits.
- Editing pinned Pi, using private/deep runtime imports, patching prototypes, or changing installed packages.
- Increasing global test timeouts based on the non-repeating Windows `.209` timeout.

## Decisions

### 1. Attribute the regression to PR #186, not Node 24 or the validation refactor

The plan retains commit/run evidence and distinguishes the source change from the first later publication that observed it. PR #203 changed validation organization but did not introduce the ANSI mismatch: package `.192` already failed with the same six assertions. Node 24 is common to macOS/Linux lanes, but Pi-TUI's platform capability branch and forced-capability reproduction explain the result without a Node semantic change.

This prevents a false solution such as downgrading Node, removing Node 24, or reverting modular validation.

### 2. Use one test-owned capability scope at producer boundaries

Add a helper under test support that imports public `getCapabilities()` and `setCapabilities()` from canonical `#pi-tui`. It snapshots the complete capability object, installs a copied object with the declared `trueColor` value, executes one callback, and restores the exact snapshot in `finally`.

The helper supports synchronous and asynchronous callbacks. Nested scopes restore inner then outer snapshots in LIFO order. The applicable parity tests remain non-concurrent within a worker; Vitest file workers provide process isolation. The helper must not run at module import time, and focused tests cover return, throw, resolve, reject, nesting, sequential use, and preservation of `images`, `hyperlinks`, and future copied fields.

Using `#pi-tui` rather than a root or deep package path preserves A1's pinned module-identity contract. Existing installed-tree identity tests remain the authority that the alias resolves to the Pi-TUI copy used by pinned Pi.

### 3. Pair declared capability and A1 theme mode in one workload contract

Define a test-level mode mapping:

- `truecolor` → Pi-TUI `trueColor: true` and `applyPiTheme(..., "truecolor")`.
- `256color` → Pi-TUI `trueColor: false` and `applyPiTheme(..., "256color")`.

Both pinned theme initialization and A1 theme initialization occur after entering the scope. Static and event-frame builders own their complete scope through rendering and disposal. Independently constructed pinned/owned settings frames each use the same declared mode. No ambient capability read may decide a deterministic parity workload.

Changing production `applyPiTheme()` to temporarily mutate Pi-TUI capability state was rejected. Its explicit mode is useful to evidence, but public Pi `initTheme()` has no mode argument, and production global mutation would couple runtime theme application to a test-oriented capability override. The mismatch can be fixed at the evidence boundary where the contradictory input is introduced.

### 4. Keep retained diagnostic fixtures truecolor and label that contract

The static and event-frame fixture metadata gains an explicit `colorMode: "truecolor"` (or equivalent declared terminal-capability field). Existing rendered rows and captured ANSI remain unchanged. The fixture schema need not change if its metadata object is extensible; tests and update scripts must agree on the field and fail if it is absent or contradictory.

Truecolor remains the retained diagnostic grammar because it preserves source RGB values without quantization and matches the current bytes. Regenerating fixtures as 256-color would only invert the platform failure. Maintaining duplicate full static/event golden files was rejected as high maintenance with little additional value because direct two-mode parity covers the conversion boundary.

### 5. Exercise both modes directly on every platform

Parameterize direct pinned-versus-owned theme token/component parity, raw terminal parity where applicable, and settings-row parity over `truecolor` and `256color`. Width, row, SGR, reset, and independent-producer assertions remain exact inside each mode.

Static and scripted event-frame golden comparisons run in declared truecolor because their retained fixtures are truecolor. Separate mode-pair assertions verify that both pinned and A1 theme instances report the requested mode before rendering. Existing `terminal-colour-fidelity` coverage continues checking the expected `38;2` and `38;5` grammars.

This makes every OS test both supported modes. The release matrix then supplies packaging and platform coverage rather than accidentally assigning one color mode to Windows and another to macOS/Linux.

### 6. Prove fixture generation is host-independent

The existing component and event-frame update paths consume the scoped builders. Regression tests run each generator/capture under opposing ambient capabilities and compare resulting structured output or hashes. The declared scope must win in both cases, and capability state must be restored afterward.

Do not make fixture generation depend on `TERM`, `COLORTERM`, `FORCE_COLOR`, CI runner labels, or `process.platform`. A developer on Windows and CI on Linux must produce identical diagnostic bytes from the same source.

### 7. Preserve semantic ANSI as parity authority

Existing normalization remains limited to declared portability envelopes such as optional OSC 8 wrappers, absolute paths, product substitutions, and synchronized-output envelopes. SGR parameters, reset boundaries, cursor/clear ordering, row content, geometry, wrapping, and state transitions remain strict.

Rejected alternatives:

- **Strip SGR again**: reintroduces the coverage hole PR #186 intentionally closed.
- **Convert 256-color to RGB before comparison**: quantization loses source values and would hide wrong-mode output.
- **Set `COLORTERM=truecolor` in the workflow**: changes broad process behavior, leaves local fixture generation nondeterministic, and uses CI configuration to conceal a test input.
- **Always emit truecolor at runtime**: breaks supported 256-color terminals and violates terminal capability ownership.
- **Create platform-specific goldens**: treats host environment as authority and permits drift.
- **Retry failed parity tests**: deterministic byte differences are not flakes.

### 8. Keep the Windows `.209` timeout separate unless it recurs

Package `.209` had three 5-second Windows timeouts in release-cohort tests. The same Windows lanes passed packages `.203`, `.205`, and current `.210`, while `.210` reproduced only the macOS/Linux parity failures. The cohort tests were not semantically changed by PR #186.

Therefore this change records `.209` as diagnostic evidence but does not increase global or test-specific timeouts, serialize unrelated suites, or weaken release checks. A recurring timeout with independent evidence requires a separate impact analysis so publication determinism is not conflated with ANSI parity.

### 9. Validate the immutable package boundary

Focused local checks cover capability scoping, truecolor fixtures, two-mode direct parity, fixture idempotence, module identity, typecheck, architecture, and strict OpenSpec validation. Required CI is the code-PR gate. After maintainer acceptance and manual merge, `npm run develop` must create a newly numbered package from the merged commit; rerunning `.209` or `.210` cannot validate changed source.

Publication succeeds only if the same exact tarball passes Windows Node 22/24, macOS Node 24, and Linux Node 24 and the publish job completes.

## Risks / Trade-offs

- **Global capability state could leak or interleave** → Scope every mutation with `finally`, prohibit concurrent use in one worker, test nesting/failure, and restore the complete snapshot.
- **A second Pi-TUI identity could make the override ineffective** → Import only canonical `#pi-tui` and retain source/installed module-identity governance.
- **Truecolor golden fixtures alone could miss 256-color parity** → Run direct pinned-versus-owned token, component, raw-frame, and settings parity in both declared modes on every platform.
- **Fixture metadata could claim a mode different from its bytes** → Assert declared mode during generation and require expected SGR examples in focused tests.
- **A broad helper could migrate into production** → Keep it under test support and add an import-boundary assertion that production does not reference it or `setCapabilities()` for this correction.
- **An unrelated release failure may appear after ANSI parity is fixed** → Keep release fail-closed and analyze any new failure separately rather than expanding normalization or timeouts.

## Migration Plan

1. Add the scoped capability helper and its restoration/module-identity tests.
2. Make static, event-frame, raw parity, theme parity, settings parity, and fixture generation declare color mode at their producer boundaries.
3. Add truecolor fixture metadata and prove existing rendered fixture payloads remain unchanged.
4. Add two-mode direct parity and host-independent fixture-generation evidence.
5. Run focused validation, required CI, and maintainer review on a code pull request with auto-merge disabled.
6. After explicit acceptance and manual merge, invoke `npm run develop` once for the merged commit and require every exact-package lane plus publication to pass.

Rollback removes the test scope, mode parameterization, and fixture metadata. It does not require runtime or persisted-data migration, but rollback would restore the known cross-platform publication failure and is not an acceptable release state.
