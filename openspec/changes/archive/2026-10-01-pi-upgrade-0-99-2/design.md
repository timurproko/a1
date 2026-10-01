# Design

## Context

A1 already adopted Pi 0.99.1 through the owned engine, shell, and presentation boundaries. Pi 0.99.2 is a patch release whose packaged owned-presentation sources are unchanged; their provenance headers move to the new package identity while the runtime package carries MCP, provider, reload, and reliability corrections.

## Decisions

### Preserve the 0.99.1 owned presentation implementation

The 0.99.2 source comparison changes no vendored body under A1 ownership. Keep the accepted 0.99.1 bodies and update their package/version provenance to `0.99.2` and `005af57d88ee23b33778f343a9595b32e67ff788`. Refresh the source ledger, inventories, startup budget, command resources, and component/event parity fixtures against that identity.

### Adopt runtime corrections through the public SDK path

A1 creates services with `createAgentSessionServices` and sessions with `createAgentSessionFromServices`. Pi 0.99.2's SDK now supplies `usesDefaultTools` when no explicit tool override is present, so A1's existing `/reload` route—which calls the public session reload capability—adopts newly configured default tools without a private adapter or duplicated state. MCP namespace descriptions, deferred connection behavior, OAuth/provider-token options, Anthropic federation, provisional native-provider availability, and the release's validation/performance/error fixes remain package-owned and flow through the same public service/session path.

### Disposition the changed public API without widening A1 coupling

Six exports changed. `AgentSession`/`AgentSessionConfig` add the optional default-tool provenance described above and are satisfied by the SDK factory A1 already uses. `ModelRuntime` adds private provisional-provider bookkeeping and requires no A1 call-site change. `McpExposure`, `ToolNamespace`, and `truncateToVisualLines` are not consumed by A1. Typecheck, engine conformance, owned workflow coverage, and parity suites therefore provide the adoption evidence without new concrete runtime imports.

## Risks / Trade-offs

- **Upstream runtime behavior could be shadowed by A1's shell** → Existing owned `/reload` delegates to `AgentSession.reload`, and startup delegates service/session creation to Pi's public factories; focused workflow and engine-conformance coverage protect those seams.
- **Package growth could exceed the startup artifact budget** → Re-pin the measured evaluated-byte ceiling to the exact 0.99.2 artifact and retain the first-attempt startup gate.
- **Identity-only presentation changes could stale evidence** → Regenerate both parity fixtures and bind all provenance, integrity, command-resource, and deprecated-dependency records to the exact package versions and commit.
