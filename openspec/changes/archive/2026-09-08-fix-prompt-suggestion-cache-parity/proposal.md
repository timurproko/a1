## Disposition

**Abandoned on 2026-09-08; implementation not accepted or merged.** The maintainer reported no noticeable delay improvement and rejected the added complexity. Archive without synchronizing the delta specification. See [disposition.md](disposition.md) for the decision, evidence, and task accounting. The proposal below is preserved as historical context, not an active implementation plan.

## Why

A1's prompt-suggestion requests drop summaries and other model-visible messages and omit settings such as custom thinking budgets and provider cache-routing identity. These are concrete, locally fixable differences that can hurt suggestion quality and cache reuse; fixing them does not require solving exact reuse of every extension-transformed provider request first.

## What Changes

- Replace three-role filtering with the existing public message converter, retaining compaction/branch summaries, custom context, included user-run bash results, and the completed assistant response. Apply the same supported image-blocking policy as the main request.
- Capture a transient, identity-bound copy of publicly available session inputs and relevant settings at the eligible completed-response boundary. This is a reconstructed suggestion context, not a claim to capture the exact final parent wire request.
- Copy the selected model, system prompt, tool schemas, reasoning level, configured thinking budgets, and applicable public provider settings. Resolve credentials and provider/model defaults through the existing authenticated runtime.
- Supply the native provider session identity for supported cache routing. For Codex suggestions, use the public independent SSE request path with that identity, deliberately foregoing primary WebSocket reuse and leaving the main transport unchanged.
- Conservatively skip suggestions when active request-mutating extension hooks make faithful reconstruction unsupported. Report a bounded reason through the generator/diagnostic boundary; do not replay hooks, bypass their policies, or disable otherwise supported configurations globally.
- Keep small opt-in cache/latency observations and extend the existing explicit provider probe. Measure request time and result availability relative to settlement without requiring a new terminal-paint acknowledgement or general telemetry subsystem.
- Preserve existing generation timing, editor checks, cancellation, tool-free execution, separate accept/submit actions, and primary session/usage isolation.

### Explicit deferrals

Exact post-transformation request snapshots, arbitrary provider-payload/header rewrite reuse, and shared WebSocket continuation optimization are deferred. A new Pi API or dependency upgrade is **not a prerequisite for this revision**. A different suggestion model, lowered reasoning, suggestion-only output caps, speculative generation during streaming, cold-context suppression thresholds, and custom cache-marker manipulation remain out of scope. Zero visible delay is an objective for prepared results, not a guarantee for network-generated results.

## Capabilities

### New Capabilities

- `prompt-suggestion-request-parity`: Bounded parity of reconstructible suggestion inputs and settings, explicit unsupported extension handling, safe provider cache routing, and private cache/latency evidence using existing public APIs.

### Modified Capabilities

None. This capability supplements the still-active `add-contextual-prompt-suggestions` change. Its lifecycle remains unchanged except for the explicit unsupported-configuration suppression defined here; this revision does not rewrite or accept that change's outstanding work.

## Impact

- Expected implementation areas: `src/integrations/pi/engine/adapter.ts`, public runtime/resource/settings integration, neutral suggestion outcomes/diagnostic metadata, and existing controller invalidation seams.
- Validation areas: focused conversion/settings/provider-payload tests, unsupported-extension and lifecycle tests, Codex transport isolation, diagnostic privacy, and the existing credential-gated provider probe.
- `openspec/specs/pi-api-boundary/spec.md` remains authoritative. Production code uses current documented public APIs, without private-state access, method/prototype patches, dependency-file inspection, new providers, or a replacement inference pipeline.
- Only bare-A1 suggestion behavior changes. Primary payloads, extension execution, transport choice, session persistence, ordinary usage/footer accounting, and `a1 pi` remain unchanged.
- This revision supersedes the all-or-nothing public snapshot prerequisite from PR #281. `implementation-evidence.md` from PR #282 remains an unchanged historical audit of that original scope, including its then-valid paused status; it does not block the narrower implementation. The completed inventory tasks remain historical, not proof of implementation or acceptance.
