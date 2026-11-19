## Why

A1 currently confines direct Pi imports to adapter directories, but production still relies on Pi package-layout paths, permissive hand-written API mirrors, reflected construction of public components with structural substitutes, and Pi-specific feature composition. This must be hardened before multi-agent workspace task 5.5 so Pi coupling does not spread into structured tabs and future Pi upgrades remain contained, explicit compatibility migrations.

## What Changes

- Introduce vendor-neutral A1 engine, session, presentation, component, and terminal-runtime ports consumed by owned UI and workspace features.
- Move all Pi selection and adapter construction into a composition root; feature and workspace modules no longer import concrete `Pi*` adapters or factories.
- Replace production Pi package-layout reads with public APIs or A1-owned assets and content.
- Replace reflected construction and structural substitutes for Pi classes with compile-time checked public API adaptation or A1-owned implementations.
- Replace permissive optional Pi runtime mirrors with capability-scoped adapters using official exported Pi types, explicit validation, and fail-fast compatibility diagnostics.
- Separate A1-owned UI behavior from pinned-source synchronization so updating the Pi engine does not implicitly require adopting upstream private UI changes.
- Strengthen candidate-version conformance across engine lifecycle, session replacement, models/authentication, settings, resources, extensions, workflows, public components, and TUI behavior.
- Make the explicit vanilla Pi oracle launch the dependency selected by A1 through a supported public entry point rather than an ambient `pi` executable from `PATH`.
- Centralize Pi compatibility metadata and isolate source/provenance inspection to non-production synchronization tooling.
- Establish permanent repository-global naming governance that forbids product-prefixed internal identifiers, inventories existing occurrences, preserves only exact external identity tokens, and enforces responsibility-based names in every future change.
- Make completion of this change a prerequisite for `evolve-bare-a1-into-multi-agent-workspace` task 5.5.

## Capabilities

### New Capabilities
- `pi-api-boundary`: Defines vendor-neutral ownership, public-API-only production integration, strict compatibility validation, exact explicit-oracle selection, and bounded Pi upgrade impact.

### Modified Capabilities

- `project-structure-governance`: Adds a repository-global semantic-identifier rule and deterministic enforcement against product-name ownership prefixes.

## Impact

- Affected production areas: `src/features/owned-ui`, the future workspace-to-owned-UI composition, Pi engine/component/TUI adapters, launch composition, and the transparent vanilla-Pi entry path.
- Affected governance: architecture checks, compatibility/conformance suites, package/version authority, source-port provenance tooling, parity fixtures, semantic identifier naming, and release gates.
- Dependencies remain exactly pinned during implementation; no Pi upgrade is included in this change.
- Existing user-visible owned-UI behavior and explicit profile semantics remain unchanged except that `a1 pi` becomes deterministically bound to A1's selected upstream Pi dependency.
