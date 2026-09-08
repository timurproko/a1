## Why

Prompt suggestions can arrive noticeably after the agent finishes because A1 reconstructs a background request from raw session state rather than preserving the parent request's model-visible context and cache-relevant configuration. Investigation confirmed dropped context messages, missing provider session identity, and conditional thinking-budget and extension-transform mismatches; these warrant correction before changing models, reducing reasoning, or speculating from incomplete answers.

## What Changes

- Introduce an identity-bound, transient parent-request snapshot behind the engine integration boundary, preserving the actual model-visible prefix, final assistant response, system prompt, tools, and compatible effective request settings.
- Preserve compaction/branch summaries, included bash results, custom messages, image policy, and supported extension transformations instead of filtering the parent history to three raw message roles.
- Preserve provider session/cache-routing identity, configured thinking budgets, transport policy, and other cache-relevant options without retaining credentials or sharing mutable parent execution state.
- Require a documented public integration seam for snapshot capture and isolated completion. Explicitly report unsupported capability when faithful capture cannot be implemented; do not deep-import, patch dependencies, replay stateful hooks, or silently fall back to lossy requests.
- Add bounded, opt-in diagnostics and deterministic provider-payload comparisons that separate prefix/configuration correctness, provider cache usage, generation latency, settlement overlap, and actual presentation delay.
- Preserve selected-model behavior, eligibility, cancellation, one-current-request policy, tool-free execution, session isolation, same-cycle presentation of prepared results, and late-result presentation when still eligible.

This change does not introduce streaming speculation, a separate suggestion model, reasoning/output-cap reductions, a cold-context suppression threshold, custom Anthropic cache-marker manipulation, or a guarantee that network-generated suggestions always finish before settlement.

## Capabilities

### New Capabilities

- `prompt-suggestion-request-parity`: Faithful parent-request reuse for isolated suggestion inference, public capability negotiation, provider-aware routing/transport isolation, and privacy-bounded cache/latency evidence.

### Modified Capabilities

None. This capability supplements the suggestion lifecycle defined by the existing `add-contextual-prompt-suggestions` change without rewriting that still-active change or its eventual `contextual-prompt-suggestions` main specification.

## Impact

- Expected implementation areas: `src/integrations/pi/engine/adapter.ts`, `runtime-integration.ts`, engine conformance, neutral suggestion contracts, and suggestion-controller/shell timing observation.
- Validation areas: engine request-conformance fixtures, suggestion lifecycle/race tests, privacy checks, the credential-gated provider probe, and physical-terminal acceptance.
- Public API boundary: `openspec/specs/pi-api-boundary/spec.md` remains authoritative. The first implementation gate must establish a documented public snapshot/completion seam against the repository's exact dependency set. If Pi lacks one, implementation is blocked pending a separately reviewed upstream/API or A1-owned alternative; this proposal does not authorize a dependency upgrade or installed-code workaround.
- Compatibility: only bare-A1 suggestion inference changes. Main-agent execution, extension behavior, persisted sessions, ordinary usage/footer accounting, and the explicit `a1 pi` oracle remain unchanged.
- Prerequisite: the contextual suggestion implementation must be present in the eventual implementation base; this proposal neither accepts nor archives its outstanding manual/provider validation.
