## Context

The failing publication run `33617331350` built and packed the exact package successfully, then failed six existing parity assertions on `win32-node24`, `darwin-node24`, and `linux-node24`; `win32-node22` passed. The differences are exclusively SGR color grammar: the stored fixtures use declared truecolor sequences such as `38;2;138;190;183`, while pinned components initialized from the non-interactive Node 24 environment use equivalent 256-color sequences such as `38;5;109`. Some builders already pass `truecolor` to A1's theme port, but pinned `initTheme()` still consults Pi-TUI's global terminal capabilities.

The parity contracts intentionally preserve semantic ANSI and must not erase color-depth differences through broad normalization. Pi-TUI publicly exposes `getCapabilities()` and `setCapabilities()`, so tests can control this input without private imports or production patches.

## Goals / Non-Goals

**Goals:**

- Make the three failing parity evidence paths independent of Node version, OS, TTY attachment, and runner color detection.
- Ensure pinned and A1 theme initialization observe one explicitly declared truecolor capability for truecolor fixtures.
- Restore all prior Pi-TUI capability fields after evidence capture, including on throw/rejection and nested LIFO scopes.
- Keep fixture bytes and strict semantic-ANSI comparisons unchanged unless investigation proves a genuine fixture defect.
- Re-establish exact-package validation on every configured Node/platform combination.

**Non-Goals:**

- Changing production terminal capability detection or color mode selection.
- Treating 256-color and truecolor SGR as generally interchangeable in parity assertions.
- Editing pinned Pi, installed packages, package exports, or source-synchronized components.
- Weakening parity coverage, skipping Node 24, or bypassing exact-package validation.

## Decisions

### 1. Scope public Pi-TUI capabilities around parity construction

Add a test-support utility that snapshots `getCapabilities()`, installs a complete copied capability object with `trueColor: true`, runs one synchronous or asynchronous capture callback, and restores the exact snapshot in `finally`. The callback must initialize both pinned and A1 themes after the scoped capability is installed.

This uses a documented public test seam and keeps the mutation wholly outside production. Passing only an environment variable was rejected because capability detection is cached and differs by Node/platform. Changing production `applyPiTheme()` was rejected because the defect is nondeterministic evidence setup, not runtime color selection.

### 2. Make scope restoration composable and observable

The helper will restore the full prior capability object rather than toggling only `trueColor`. Nested scopes naturally restore the inner snapshot and then the outer snapshot in LIFO order. Focused tests will cover synchronous success, synchronous throw, asynchronous success/rejection, nesting, and sequential captures.

A process-global mutation without `finally` was rejected because one parity test could contaminate unrelated image, hyperlink, or terminal-capability tests in the same worker.

### 3. Apply the scope at producer boundaries

Wrap `buildStaticParityCases()`, `buildEventFrameParityResult()`, and the pinned/owned settings row builders at their evidence-construction boundaries. Do not set capability state at module import time. This ensures every theme and component in a capture observes the declared mode while leaving collection/import behavior inert.

For the settings comparison, each independently constructed side receives the same declared mode. For scripted and static builders, the entire capture remains within one scope until disposal and final rows are collected.

### 4. Preserve strict fixtures and diagnose bytes before regeneration

The expected outcome is that current truecolor fixture bytes pass unchanged. Tests will continue preserving SGR parameters, reset boundaries, geometry, ordering, and row content. Fixture regeneration is forbidden as the primary fix; it is allowed only if a separately demonstrated semantic fixture defect exists and provenance is updated.

Broad ANSI stripping or converting arbitrary 256-color values to approximate RGB was rejected because it would hide meaningful regressions and the quantized colors are not byte-equivalent to the source RGB values.

### 5. Validate the same exact-package boundary that failed

Focused local checks cover the helper and three parity files. Required CI remains the merge gate. After integration, a new develop publication must build one exact package and pass Node 22/24 validation across the configured platforms before publication can proceed. Rerunning only the failed old workflow is insufficient because the old immutable package does not contain the correction.

## Risks / Trade-offs

- **Global capability state could leak between tests** → Scope every mutation with `finally`, test failure paths and nesting, and avoid module-level setup.
- **Two Pi-TUI module identities could hold separate capability state** → Reuse the repository's pinned module-identity contract and import the same public `#pi-tui`/package identity consumed by the components; fail focused parity tests if identities diverge.
- **Explicit truecolor could mask a 256-color product defect** → This change fixes a truecolor fixture workload only; production capability tests and any separately declared 256-color workload remain independent.
- **Node 24 may expose another unrelated release failure after this correction** → Keep validation fail-closed and report any next failure separately rather than broadening this change.

## Migration Plan

1. Add and test the bounded capability scope.
2. Apply it to the three parity evidence paths and prove existing fixture bytes pass.
3. Run focused typechecking, architecture, and parity tests, then required CI on a code pull request with auto-merge disabled.
4. After maintainer acceptance and manual merge, dispatch a fresh develop publication for the merged source.
5. If exact-package validation still fails, do not publish; retain the failed artifact and diagnose the remaining platform-specific difference.

Rollback removes the test helper and its producer scopes. No runtime or persisted data migration exists.
