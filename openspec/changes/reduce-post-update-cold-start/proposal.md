## Why

A successful update materializes the runtime under a new immutable path, after which Windows can spend tens of seconds scanning and loading the newly addressed dependency graph before the first interactive frame. The current release contains 13,557 files and 93.1 MiB, while a measured update changed only 214 paths and left 98.42% of the payload byte-identical, so release storage and startup work should reuse certified unchanged content and load only the runtime surface needed for the selected command.

## What Changes

- Add phase-level startup evidence covering mutable bootstrap, guardian startup, owned-UI module loading, Pi services, resources, session creation, and first render, including separate cold-path and warm-path acceptance budgets on Windows.
- Split immutable release content into release-specific product files and separately certified immutable dependency layers whose stable content identity and path can be reused across updates.
- Bind each release manifest and certification to every dependency layer it uses, preserve layers while any retained or live release references them, and collect an unreferenced layer through the bounded release-retention mechanism.
- Materialize only a validated runtime payload: executable modules, package metadata, native binaries, and declared runtime assets. Exclude development-only declarations, source maps, source trees, examples, and documentation only when generated payload evidence and exact-package launch tests prove they are not runtime inputs.
- Reduce eager startup evaluation by consuming supported narrow Pi runtime/component entry points or an equivalent certified build-time facade, while continuing to prohibit private Pi implementation imports and preserving one shared Pi TUI module identity for extensions.
- Enable a persistent Node compile cache in an A1-owned cache location keyed by compatible Node and immutable content identity, with safe invalidation and non-fatal fallback.
- Warm the newly activated common startup graph as a visible, bounded update phase when evidence shows that this prevents a delayed first interactive launch; warmup must not open a terminal, create a session, prompt for trust, load project-local executable resources, or perform network work.
- Preserve old full-copy releases for rollback and live cohorts while introducing the optimized layout without requiring users to delete state manually.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `a1-shell`: Require installed interactive launch to expose measurable startup phases and reach its first usable frame within cold and warm responsiveness budgets.
- `agent-supervision`: Permit certified shared immutable dependency layers while preserving release identity, live-cohort isolation, rollback, and ownership-safe collection.
- `cli-self-update`: Require reuse of unchanged certified runtime content, validated minimal payload materialization, and bounded noninteractive post-activation warmup where needed.
- `pi-api-boundary`: Require startup graph reduction to remain on supported public Pi APIs and preserve the single Pi TUI module identity.
- `isolated-regression-testing`: Add exact-package cold-path/warm-path startup, dependency-layer reuse, minimal-payload, rollback, and tamper-isolation evidence.

## Impact

- Affects release identity/manifests, materialization and certification, dependency resolution, garbage collection, bootstrap and UI entry points, build/package metadata, Pi integration imports, and performance evidence.
- Introduces managed dependency-layer and compile-cache storage beneath A1-owned data/cache roots and a compatibility path for existing full-copy releases.
- May require a pinned Pi release with narrower public exports or an A1 build-time facade that consumes only existing public exports; private `dist` subpath imports remain prohibited.
- Does not change `a1` or `a1 pi` command syntax, profile ownership, session locations, extension APIs, or update channel selection.
