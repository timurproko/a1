# Design

## Context

Pi 1.0.0 changes the system-theme color anchoring and startup logo fallback, expands `quietStartup` from a boolean to `boolean | "header"`, and adds runtime-owned codemode, authentication, MCP, and fullscreen behavior. It also introduces package-private logo-animation and Radius-specific selector components that do not fit A1's owned shell boundaries.

## Decisions

### Merge the reusable presentation changes

Keep A1's public-backed theme adapter while adopting Pi's chroma cap in the system theme. Adopt Pi's Apple Terminal wordmark fallback in A1's startup header, preserving the fixed two-line logo elsewhere.

### Keep authentication and startup behavior behind owned boundaries

Expose `quietStartup: "header"` through the settings bridge and preserve manual-code authentication prompts through A1's provider-neutral workflow controller. Do not copy Pi's package-private fullscreen logo easter egg or Radius-only animated selector and post-login MCP mutation; Radius remains available as an ordinary OAuth provider through the pinned model runtime.

### Adopt package-owned runtime changes through public APIs

Pi's fullscreen default, leaner codemode, codemode image generation, and MCP OAuth hardening stay in the pinned service/session implementation. A1 continues to create Pi services and sessions through public factories, so these changes require no deep import or duplicate state.

### Refresh exact identity and parity evidence

Regenerate package resources, source provenance, inventories, public API, startup graph, component/event parity fixtures, and command/session evidence against Pi 1.0.0 and commit `a13d35a742c6ef8462812a28fbe1d8c8b7431c32`.

## Risks / Trade-offs

- **A changed union value could be rejected as a boolean** → The settings bridge exposes all three exact choices and verifies persistence.
- **Headless Anthropic login could lose its specialized prompt** → Workflow coverage verifies `manual_code` maps to A1's owned `manual-code` interaction.
- **Private visual additions could widen coupling** → The ledger records explicit non-adoption while startup and provider parity tests retain A1's owned behavior.
- **Theme changes could drift from upstream** → Source-synchronized ports, regenerated hashes, and focused parity suites bind the merged implementation.
