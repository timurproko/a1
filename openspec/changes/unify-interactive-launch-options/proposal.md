## Why

Ordinary A1 and the opt-in Pi-compatible executable already launch the same normal A1 product, but their interactive option interfaces differ. Ordinary dispatch can silently ignore a leading `--model` or `-e`, leaving users with confusing launcher-specific instructions even though runtime features are shared. Consolidate the implemented interactive contract without confusing A1 maintenance commands with Pi-style instructions.

## What Changes

- Share authoritative interactive option parsing, normalization and validation between two small grammar adapters: ordinary A1 retains control commands and requires `--` for prompts; the Pi-compatible entry retains positional instructions and its existing literal boundary.
- Support model/provider/thinking, repeated explicit extensions, tool exclusions, session selection/storage, invocation color and registered extension long flags through ordinary `a1`, with equivalent normal-profile launch intents.
- Expose the existing model catalog through ordinary `a1 --list-models [search]`, retaining its effective A1 profile, factory behavior and Firstmate-scoped safety refusal.
- Advertise the supported subset through shared interactive help metadata while preserving each entry's identity, help/version side-effect restrictions and ordinary maintenance documentation. Malformed or unknown launch flags fail visibly and nonzero; unrelated legacy reserved word spaces retain their existing behavior.
- Carry supported options through existing development and authenticated immutable-release/bootstrap/guardian transport without shell concatenation, option loss or public access to internal `--runtime-options` payloads.
- Reuse the existing normal-product lifecycle and focused offline integration fixtures for startup ordering, prompt delivery, public APIs, task-copy isolation and replacement behavior.

This is a planning-only delivery. Implementation requires explicit plan approval and an implementation request in this same PR; integration and deployment are not authorized.

## Capabilities

### New Capabilities

None. This consolidates existing CLI and launch owners rather than introducing a compatibility subsystem.

### Modified Capabilities

- `launch-profiles`: broaden normal interactive routing and discovery while retaining command, literal-prompt, comparison and legacy reserved-word boundaries.
- `pi-compatible-launch`: require a shared interactive-options implementation and equivalent normal-product intents without erasing the two instruction grammars.

## Impact

Expected owners: `src/cli`, `src/features/launch`, the existing neutral `src/foundation/launch-context` transport contract, shipped `bin` entries, development launch routing and their focused tests. Engine-specific model discovery and option application remain in `src/integrations/pi/engine`; composition and owned-UI lifecycle are reused, not redesigned. User documentation will cover ordinary launch options, the literal boundary and the continuing opt-in `pi` executable.

Baseline: freshly fetched `origin/develop` at `2d5c3646`, containing merged PR #927, whose reviewed head was `cd079581e906b37073d46b080a69a50bb96fe51e`. Its finalized artifacts are immutable and outside this change. No stacked PR or cherry-pick dependency is needed.

No pinned Pi upgrade, global `pi` registration, alternate runtime/profile, daemon, API proxy, Firstmate/Herdr change, credential migration, live-state repair, governance change or broad framework rewrite is included. Compatibility remains the tested supported interactive subset for pinned Pi 1.5.2, not full Pi CLI/RPC or external-tool certification.
