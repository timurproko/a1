## Context

See `proposal.md` for the narrowed scope and `specs/prompt-suggestion-request-parity/spec.md` for its contract. The original plan in PR #281 required an exact post-transformation request snapshot and isolated derived completion. The audit in PR #282 (`implementation-evidence.md`) established that this combined public API was not available in the selected Pi version.

**This revision replaces that prerequisite, not the factual audit.** The audit's paused status and recommendation for an upstream API apply to the original scope. They are retained as historical evidence and no longer block the bounded reconstruction defined here. The first two completed tasks remain inventory work only. The original `add-contextual-prompt-suggestions` change's unfinished acceptance work remains unfinished.

Relevant existing APIs are sufficient for the narrowed implementation: public `AgentSession` state/model/session identity, the package-root `convertToLlm` export, public settings getters and loaded-extension metadata, and authenticated `ModelRuntime.completeSimple`. The integration remains behind neutral A1 contracts; no existing agent method is replaced or patched.

Investigation references: Pi `v0.84.2` at `914cf1472e715297caa30db4b9535d534a9eb718`, particularly `packages/coding-agent/src/core/sdk.ts`, `messages.ts`, `extensions/runner.ts`, and `packages/ai/src/api/openai-codex-responses.ts`. Claude Code at `d43bd40690853fd323758e038cb686930d53a39f` demonstrates preserving cache-compatible context/options, but its fork pipeline is not being recreated. Earlier offline payload checks used installed transitive `pi-ai`/agent-core `0.84.4`; tests for implementation must use A1's lockfile-resolved family, audited at `0.84.2`.

## Goals / Non-Goals

**Goals:**
- Correct message loss, custom-budget omission, and missing supported cache-routing identity using APIs available now.
- Keep supported sessions generating suggestions while explicitly excluding configurations whose request transforms cannot be reconstructed.
- Protect primary execution, image policy, credentials, and continuation state.
- Measure the remaining request latency without adding a new telemetry or terminal-observation project.

**Non-Goals:**
- Exact replay or fork of arbitrary final provider payload/header transformations.
- Shared primary WebSocket connection/continuation optimization for suggestions.
- An upstream snapshot API, dependency upgrade, new provider, or A1-owned replacement inference pipeline.
- Changing reasoning/model selection, output limits, cold-cache eligibility, or streaming/presentation policy.
- Guaranteeing a cache hit or a zero-delay result from an asynchronous provider.

## Decisions

### 1. Reconstruct supported public inputs, not an exact wire snapshot

At the existing eligible completed-assistant-response boundary, capture one private immutable copy of the current public messages, system prompt, serializable tool schemas, selected model, native session identity, and relevant public settings. Bind it to the existing session generation/run/response identity. The matching completed response is already part of the captured history; verify its association and include it exactly once before appending the prediction instruction. If the authoritative response cannot be matched, return a bounded unavailable/stale outcome rather than append it twice or use a later response.

Use public `convertToLlm` instead of the current three-role filter. It converts compaction/branch summaries, custom messages, and included bash execution to model-visible content, and excludes non-context entries. Apply the same image-blocking behavior as Pi's main SDK wrapper: disabled images become the supported text placeholder with the same deduplication semantics. Enabled image data is preserved under the converter's normal public representation. Keep image handling in the integration, not the shell.

Capture/projection must preserve provider-relevant schema metadata without cloning executable tool functions or connecting a tool execution loop. Do not mutate `session.agent.state`, persist the prediction instruction, rerun `context` hooks, or call an agent's mutable transform function. Snapshot once per eligible response, not per streamed token; retain at most the current candidate and release it when no longer needed.

Record the relevant public configuration and extension inventory revision at run start and compare it at candidate preparation and result publication. Known changes during the run or while pending invalidate that candidate; later stable runs remain eligible. This guard prevents copying new thinking/image settings onto a response made under an older configuration. It is not a claim to capture every hidden provider decision.

Alternative rejected: revive the exact finalized-request snapshot gate. That was the identified scope blocker and is unnecessary for these concrete corrections. Replaying transformation hooks is also rejected because stateful effects cannot be reproduced safely.

### 2. Define a conservative, configuration-local extension policy

Read the current public loaded-extension results through the runtime resource owner, using the exported extension metadata and registered handler inventory. Keep classification typed at the integration boundary, not based on guessed dependency paths, reflection, extension source parsing, or function-body inspection.

Treat these active hook surfaces as unsupported for this release:
- `context`;
- `before_provider_request`;
- `before_provider_headers`.

Presence on one of these surfaces is enough to skip; do not try to infer that a handler is observation-only, idempotent, safe for a particular provider, or irrelevant to a request. This intentionally includes payload/header loggers. Extensions that only add UI, ordinary tools, or persistent context remain supported. `before_agent_start` effects already represented in public system/messages are not themselves an exclusion. Custom provider configurations that retain the public runtime's normal context/options contract can use the same reconstruction; opaque custom request/transport behavior that cannot meet that contract is explicitly unsupported, not emulated.

The generation outcome distinguishes a valid empty prediction from `unsupported-transformation`, `unsupported-provider`, `unknown-extension-metadata`, `configuration-changed`, and stale/cancelled outcomes as applicable. Reasons are enums, never extension paths, names, source, or thrown provider text. No extra UI row or persistent setting change is introduced. The existing diagnostic seam/probe can explain why a candidate was skipped.

Reclassify after extension reload and for later candidates, and recheck support before publishing a pending result. Unknown inventory fails closed for the affected configuration only. Do not impose a global dependency/API prerequisite: ordinary built-in Anthropic, OpenAI Responses, and Codex configurations with inspectable metadata and no excluded hooks must remain supported and have positive tests. Missing support for an opaque custom configuration must not make those tests or the entire feature unavailable.

Alternative rejected: silently bypass active hooks or replay them on the background request. Blanket suppression merely because any extension is installed would unnecessarily exclude ordinary A1 sessions.

### 3. Copy the public settings that the existing request path omits

Use the selected public model and system/tools from the captured context and dispatch through the same authenticated `ModelRuntime`. Pass the existing reasoning level together with `SettingsManager.getThinkingBudgets()`, and preserve applicable request policy exposed through public getters. Let the unchanged model and runtime resolve model sampling defaults, provider configuration, environment/cache-retention defaults, and fresh authentication in the same way as the main path. Do not snapshot credentials, authorization headers, resolved secret environment values, or raw HTTP requests.

Use the actual Pi session ID (`session.sessionId` or its public session-manager equivalent), not the adapter's unrelated UI identity, as the provider `sessionId`. Both identities have distinct roles: the neutral identity prevents stale UI publication, while the native identity supplies supported provider cache routing.

Do not add a suggestion-only token cap, lower thinking, remove tools, or force output equality near the model context limit. Provider-owned serialization and context-window clamping remain authoritative after adding the instruction. Unknown extension payload overrides are outside the support envelope, not values to scrape or reconstruct.

Alternative rejected: only copy the named thinking level. The offline custom-budget example showed that `high` alone can mean 16384 tokens instead of the user's configured 4096. `completeSimple` versus `streamSimple` is not a cache discrepancy: the former awaits the latter's result.

### 4. Use independent SSE for Codex suggestions

For the `openai-codex-responses` API, set suggestion `transport: "sse"` while preserving the native `sessionId`. This is an explicit, reviewed exception to inheriting the parent's transport: the main agent retains its existing `auto`, WebSocket, or SSE setting unchanged.

Pi's Codex SSE path can send the session-derived prompt cache key without acquiring the primary WebSocket cache entry. Therefore suggestion success, failure, or cancellation must not write or clear that entry's `continuation`, even when the primary connection is idle. Do not try to borrow a busy connection, change the native ID to fake isolation, or patch continuation state after the request. Reusing the routing identity is not a guarantee of a server cache hit.

For other normal public provider paths, preserve compatible public transport selection. Tests must cover the built-in Anthropic and OpenAI Responses paths as well as Codex. If an opaque custom transport cannot support independent execution with the public contract, return `unsupported-provider` for that configuration; do not introduce a new inference implementation.

Alternative rejected: pass the same session ID with Codex's default WebSocket/auto suggestion path. The audit showed successful requests replace the shared continuation bookkeeping. A new ID avoids that sharing but drops the intended cache-routing identity. Explicit SSE is the bounded current-API trade-off; shared WebSocket optimization is deferred.

### 5. Leave controller behavior intact and keep observation small

Retain the controller's existing generation trigger, timeout, epochs, prepared-result handoff, editor checks, and late-result behavior. Extend only the support/configuration invalidation and result metadata needed by this correction. Keep tool schemas but reject tool-call output without executing it. Preserve separate Tab acceptance and Enter submission, ordinary autocomplete priority, and disabled/comparison/non-interactive behavior.

Use an optional metadata-only observer on the existing integration/generator and test/probe path; do not add a telemetry service, new UI setting, generic export command, or a mandatory 128-record runtime buffer. With no observer, retain no diagnostic history. Any probe collector uses a fixed sample bound and drops/releases records on completion/disable; callback errors are contained and never awaited as I/O on the input or settlement path.

Observe bounded outcome/reason, an ephemeral local correlation number, generation start/completion duration, available parent/suggestion usage separately, and logical inference invocation counts. Distinguish unobserved provider retries from those counts. Use provider capability knowledge to distinguish missing counters from meaningful zero; where the library normalizes absent counters and cannot establish availability, mark them unknown rather than infer a cache miss.

If the controller/probe observes both matching settlement and result completion, report result availability before/after settlement. This is **not terminal paint latency**. No new terminal acknowledgement API is required. Existing deterministic frame tests verify ready-result inclusion; physical-terminal review judges user-visible delay. Do not export credentials, headers, model customization secrets, session/cache IDs, prompts, suggestions, paths, images, tool content, or content hashes. Suggestion usage remains separate from session/footer accounting.

Alternative rejected: block these cache-input fixes on full presentation telemetry, raw payload logging, or an extensive diagnostics UI.

### 6. Test the support envelope and then measure benefit

Build focused synthetic comparisons from two paths: an ordinary supported Pi request producer and the corrected A1 reconstruction. Use public fake providers/request inspection with network disabled; full payload comparison is permitted only for synthetic fixtures in memory. Compare reconstructible message prefixes, system/tools, thinking budgets, and cache-routing options. Allow only named differences for the extra assistant/instruction tail, fresh volatile request/auth identifiers, provider cache markers, required context-limit clamping, and the deliberate Codex SSE transport. Do not erase the original omissions in normalization.

Required positive cases: no extensions; UI-only/persistent-context extensions; compaction/branch summaries; custom messages; included/excluded bash; images enabled/blocked; default and custom thinking budgets; normal model/provider defaults; native provider cache identity. Required negative cases: each excluded hook (including a logger), unknown metadata, mid-run configuration changes, and reload while a result is pending. Verify skipped configurations issue zero suggestion requests and their main hooks still run normally once.

Codex tests must establish that suggestion transport remains SSE regardless of main transport and idle/busy primary state, while the cache key remains present. Exercise primary-suggestion-primary, failure, and cancellation through a mocked public transport/provider boundary, with assertions that the primary continuation is not touched. Do not assert connection isolation solely from an A1-authored options object; exercise the pinned provider dispatch path.

Retain lifecycle races, settings disable, tool rejection, no-transcript mutation, separate usage, and comparison-profile regressions. Add observer-failure, privacy, absent-counter, and bounded-probe cases. A deliberate summary/budget/cache-key omission must make conformance fail.

Extend the existing credential-gated provider probe rather than create a general benchmarking subsystem. With explicit approval, establish eligible fixture turns, collect a bounded set of baseline/corrected samples in equivalent independent sessions, and report sample count, known inference counts, available cache counters, generation times, and result-versus-settlement timing where available. Alternate run order and distinguish warm-cache results from cold fixtures. No paid provider request is a default CI test. Report observed improvement, no improvement, or insufficient evidence honestly; request corrections alone do not establish that all visible delay is gone.

## Risks / Trade-offs

- **[Some extensions lose suggestions]** -> Restrict the exclusion to named mutating hook surfaces/unknown metadata, make the reason explicit, and preserve main execution plus positive ordinary-extension tests.
- **[Public reconstruction is not exact final-wire reuse]** -> State the support envelope and excluded transformations explicitly; do not advertise universal request parity.
- **[Codex SSE may add HTTP setup latency]** -> Accept this bounded isolation trade-off while restoring cache routing; measure it and defer shared WebSocket optimization.
- **[Provider context/cache policies differ]** -> Keep native runtime defaults and validity checks; compare only named fields with a reviewed difference allowlist and report unknown metrics.
- **[Configuration changes during a run]** -> Invalidate the candidate when its supported configuration cannot be established; reconsider later stable responses rather than disabling the feature.
- **[Observation or snapshots add overhead/privacy risk]** -> One candidate copy, no per-token history work, no retained secrets, optional metadata callbacks, and bounded probe samples.
- **[Warm-cache inference still finishes after settlement]** -> Keep truthful settlement and immediate late publication; require manual acceptance of residual delay rather than promise zero delay.

## Migration Plan

1. Recheck the implementation base against the repository dependency authority and the historical API inventory. Do not reopen the deferred exact-snapshot prerequisite.
2. Implement the typed support classifier and response-bound public context conversion/image policy, with positive and unsupported-configuration tests.
3. Pass the missing public options/native session ID and select independent Codex SSE; prove isolation against the pinned provider path.
4. Wire configuration/support invalidation and basic optional observations into existing seams, then complete focused conformance and lifecycle coverage.
5. Obtain required CI results and explicit provider/manual acceptance. No persisted-session migration or new upstream release is needed.

Rollback is the existing prompt-suggestion disable setting or implementation revert. Captured context and optional probe records are disposable; primary conversation and transport state must not require repair. This revision changes only the four planning artifacts and leaves the original audit and prior feature-acceptance records intact.
