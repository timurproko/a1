## Context

See `proposal.md` for motivation and `specs/prompt-suggestion-request-parity/spec.md` for the additional contract. The existing `add-contextual-prompt-suggestions` artifacts remain the source for eligibility, cancellation, ghost-text presentation, and acceptance/submission behavior. This design is required because the correction crosses authenticated inference, session lifecycle, extension policy, transport isolation, and diagnostics.

### Investigation baseline

- A1 investigation started from primary source at `443620a`; this planning stream is based on `origin/develop` at `b4dc614`. `PiEngineAdapter.generate()` in `src/integrations/pi/engine/adapter.ts` filters raw agent messages to `user`, `assistant`, and `toolResult`, then calls authenticated `ModelRuntime.completeSimple()` with a signal and named reasoning level.
- Pi source at `v0.84.2`, commit `914cf1472e715297caa30db4b9535d534a9eb718`: `packages/coding-agent/src/core/sdk.ts` supplies message conversion/image policy, context and provider hooks, native session identity, configured thinking budgets, and transport options to the main agent. `core/messages.ts` converts compaction/branch summaries, included bash results, and custom messages to model-visible content rather than dropping them.
- Pi provider source: `packages/ai/src/api/openai-responses.ts` and `openai-codex-responses.ts` derive explicit prompt-cache routing from the session ID; Codex also uses it to select reusable connections. `anthropic-messages.ts` consumes configured thinking budgets and adds normal cache markers to system/tools and the final user message. `completeSimple()` delegates to `streamSimple().result()`; completion versus streaming is not itself a cache divergence.
- Claude Code evidence at `D:/Git/claude-code-source`, commit `d43bd40690853fd323758e038cb686930d53a39f`: `src/query/stopHooks.ts` starts suggestion generation fire-and-forget before remaining stop hooks; `src/utils/forkedAgent.ts` preserves parent context/options and clones content-replacement decisions; `src/services/PromptSuggestion/promptSuggestion.ts` keeps tools and thinking/effort settings, skips transcript and suggestion-tail cache writes, and suppresses large cold-context requests. Its comment reports cache regressions from a historical low-effort override; this is source-reported evidence, not an A1 measurement.
- Offline synthetic checks used installed coding-agent `0.84.2` with transitive `pi-ai`/agent-core `0.84.4`. No real credentials or provider calls were used. The relevant paths were also checked against Pi `v0.84.2`; implementation acceptance must use the repository lockfile's resolved dependency set, not assume the installed transitive versions are its authority.

Offline results: four converted parent messages became one after A1's role filter; custom Anthropic `high: 4096` became default `high: 16384` for suggestions; Codex's parent `prompt_cache_key` became absent. A standard-message/default-options Anthropic fixture retained equal thinking and output limits. These establish conditional request differences, not measured server-side miss rates or guaranteed latency improvement.

## Goals / Non-Goals

**Goals:**
- Make cache-compatible reuse a property of the actual parent request, not an assumption about similar raw inputs.
- Preserve inference correctness and extension/image policy while reducing avoidable cache and connection setup costs.
- Separate provider-independent lifecycle identity from native provider cache-routing identity.
- Make unsupported request reuse explicit and keep performance claims measurable.

**Non-Goals:**
- A new full agent/session or tool-execution loop for predictions.
- Sharing credentials, parent abort signals, or mutable WebSocket continuation bookkeeping with background work.
- Byte-identical volatile fields or an assertion that providers guarantee a cache hit from an equal prefix.
- Altering primary request behavior to warm the suggestion cache, or mutating provider cache markers in this change.
- Changing the existing late-result policy or hiding delays behind a retained working indicator.

## Decisions

### 1. Gate implementation on a documented public request-reuse seam

Before production edits, establish whether the selected public Pi API can expose an immutable, post-policy parent request snapshot and execute an isolated derived completion. Required properties are ordered capture after context/image/message conversion and cache-relevant extension transformations, association with the resulting assistant response, effective option access, and safe provider-specific execution without replaying transformation hooks.

The existing public `convertToLlm` export fixes known message-role loss, but it alone does not reproduce image policy or extension transformations. Existing `context` or `before_provider_request` hooks are not assumed to be final observation points: multiple handlers, handler ordering, and stateful effects must be proven against the documented API. Reassigning an agent's internal stream function or reading installed source at runtime is not an alternative.

Conformance will expose supported/unavailable reuse with a bounded reason. Globally missing required support blocks shipping this correction; a specifically unsupported provider/extension configuration receives no suggestion request while the main session remains usable. Do not declare success by disabling suggestions for every configuration. If the public seam is absent, stop and report the exact gap for a separately reviewed public API change or owned alternative. This is a prerequisite gate, not an implicit authorization to upgrade Pi or port an entire inference pipeline.

Alternative rejected: patch the obvious filter and option omissions and claim full parity. That would leave extension policy and transformed context unproven.

### 2. Capture once and derive the suggestion from an immutable request snapshot

Keep an integration-private snapshot of the request that produced the candidate terminal assistant response. The neutral generator contract carries identity and a validated capability/outcome, not Pi types, raw wire payloads, credentials, or a session object.

Snapshot content comprises:
- owning session generation, run, request/response sequence, model, and effective configuration revision;
- the model-visible ordered message prefix after parent policies, plus its system prompt and tool schemas;
- compatible effective provider options, including thinking configuration/budgets, model sampling defaults and overrides, output-limit policy, cache retention, native session identity, transport selection, and reproducible non-secret policy metadata;
- sufficient provider-owned derivation information to append the completed response and prediction instruction without applying parent policies twice.

Complete the snapshot only when its matching assistant response succeeds with a terminal stop. Append that response exactly once, then the isolated instruction. Never derive from a later `session.agent.state.messages` collection. A retry, context-changing compaction, or continuation supersedes the old snapshot even if the provider/model name did not change.

Capture must not add full-history serialization or copying per streamed token. Maintain at most one retained candidate snapshot; use immutable/public request data or one bounded capture per request, and release it on completion/invalidation. Retain no extra persisted transcript.

Alternative rejected: rerun extensions and conversion after completion. Stateful transforms may inject different data, omit different content, or cause duplicate side effects. Capturing final raw JSON alone is also insufficient unless a documented API can safely derive a new request from it.

### 3. Separate cache identity from mutable execution state

Continue resolving credentials through `ModelRuntime` at dispatch; never store API keys, authorization headers, or authentication tokens in the reusable snapshot. Preserve the actual Pi/provider session identity, not the UI's independent session identifier. Resolve volatile request IDs and refreshed credentials anew. Cache-key values remain integration-private.

Carry the parent's effective thinking budgets and compatible request settings without a cheap-model, low-effort, removed-tools, or output-cap optimization. Provider-required context-window clamping remains authoritative after the extra response/instruction is appended; tests identify this legitimate derived-field difference rather than overriding a provider limit to force equality.

Preserve configured transport and supported cache routing without forcing a busy socket to be reused. The provider must own concurrency and connection acquisition. A derived background completion must not install its prediction as the main conversation's next continuation state. If the public transport API cannot preserve primary continuation isolation, use its documented independent-request mode while retaining supported cache routing; report reuse as unavailable, not as a cache miss. If no safe mode exists, mark that configuration unavailable.

Alternative rejected: blindly share the parent's request object, abort controller, socket entry, or previous-response identifier. Cache routing and safe continuation ownership are separate concerns.

### 4. Keep the controller's generation/publication race unchanged

Retain generation at the existing successful completed-response boundary and publication only after matching settlement. The current `generating`, `prepared`, and `available` lifecycle already permits same-cycle publication of prepared results and immediate publication of later valid results. Extend identity invalidation to captured configuration revisions and capture disposal without changing editor semantics.

The diagnostic observer is off the critical path. It must not await I/O or inference from a settlement or render callback. Tool schemas remain available for request compatibility, but no tool executor is connected; tool-call output is rejected as before. No retries beyond the existing bounded provider/request policy are introduced solely to obtain a suggestion.

Alternative rejected: prefetch during streaming or skip every result that misses settlement. Both change established behavior and would confound evaluation of cache fixes.

### 5. Add opt-in, bounded metadata-only diagnostics

Use a neutral observer/sink with a fixed-capacity in-memory buffer (128 recent request records by default); no automatic remote telemetry or disk persistence. Explicit diagnostic export uses the existing diagnostic/reporting owner with a strict allowlist. Disable releases the buffer. Observation failure never fails the primary turn.

Each record uses an ephemeral local correlation number, an operation kind (`primary` or `suggestion`), supported provider/API category, resolved package versions, bounded status/reason enums, available usage counters, and monotonic offsets. Do not export raw session/model-customization identifiers, content hashes, URLs, headers, payloads, prompts, suggestions, image data, tool data, or paths. Tests can compare full synthetic payloads in memory, but runtime diagnostics cannot contain them.

Record request capture, generation start/completion, matching settlement, publication eligibility, and confirmed presentation separately. A render request is not a paint: if the terminal/runtime cannot acknowledge presentation through a public seam, leave that timestamp unavailable and use explicit terminal acceptance evidence instead. Compute generation duration and post-settlement presentation delay only when their endpoints exist; preparation-before-settlement is a separate outcome. Missing token counters are unavailable, not zero. Keep suggestion cost/usage separate from session/footer accounting.

The existing provider probe starts from an arbitrary session and reports elapsed time/candidate presence, not cache behavior. Replace its acceptance role with an explicitly credential-gated paired-turn experiment that first establishes a real parent request, then observes its eligible suggestion without logging content or changing the normal interactive request count.

Alternative rejected: log raw request bodies for later diffing. Synthetic-only in-memory diffs and allowlisted metadata establish the needed evidence without leaking session material.

### 6. Prove payload parity before evaluating live latency

Deterministic conformance uses two producers: the normal supported Pi request path and A1's derived suggestion path. Do not build the expected payload with the same reconstruction helper under test. Capture synthetic requests through a public mock provider or pre-network request seam; make network use fail closed. Compare the shared model-visible prefix and cache-relevant effective settings, with a small explicit allowlist for the appended assistant/instruction tail, provider-derived limits, volatile authentication/request IDs, and provider-owned cache-marker placement. Do not normalize away summaries, budget values, tool definitions, or cache-routing keys.

Required matrix: ordinary defaults; compaction and branch summaries; included/excluded bash; custom context; images and blocked images; stateful extension transforms and payload hooks; custom budget and sampling settings; native provider session identity; Anthropic defaults and near-context-limit clamping; OpenAI/Codex idle/busy connection and continuation isolation; no-cache provider; and unavailable capability. Include a deliberate mismatch in each major dimension so the harness proves it detects the original bugs.

Keep lifecycle tests for both completion/settlement orders, configuration/model/session changes, retries/compaction, user typing, disposal, abort-after-resolution, and unchanged `a1 pi` behavior. Add diagnostic privacy/capacity/failure tests and verify one eligible additional inference, no tool execution, no transcript mutation, and separate usage accounting.

Live acceptance records paired baseline/corrected samples using equivalent isolated fixture conversations and the exact locked dependencies. Include warm plain-context and summary/custom-context cases, custom-budget Anthropic where available, and OpenAI/Codex where configured. Report sample counts, request counts, cache counters, generation median/tail, presentation median/tail when observed, and unsupported data. Use independent fixture sessions and alternate baseline/corrected ordering to avoid attributing cross-run cache warming to the correction. Do not require network-dependent latency assertions in CI. If diagnostics do not show a latency/cache benefit, report that explicitly; request-correctness fixes alone do not authorize a claim that visible delay is solved. Final acceptance requires the user's assessment of the residual delay.

Alternative rejected: use a single quick response or static A1-only mock as proof of warm-cache latency.

## Risks / Trade-offs

- **[Public snapshot/isolated-completion API may be missing]** -> Treat the API inventory as the first blocking gate; name the missing capability instead of weakening public-boundary rules.
- **[Snapshot equality does not guarantee server cache reuse]** -> Separate deterministic parity from real provider counters and timing; preserve unknown values.
- **[Request capture retains sensitive context or costs memory]** -> Keep one transient candidate, avoid per-token copies/serialization, release on invalidation, and export only allowlisted metadata.
- **[Stateful extensions or auth hooks cannot be safely replayed]** -> Capture effective supported policies once; re-resolve credentials through the provider and mark unsupported configurations explicitly.
- **[Shared Codex identity interferes with continuation state]** -> Test primary-suggestion-primary and abort sequences; use only documented independent-request semantics and do not force socket reuse.
- **[Equivalent options are not always byte-identical]** -> Keep a reviewed provider-specific difference allowlist; never erase real prefix or thinking-budget differences from evidence.
- **[Providers vary in cache support and diagnostics]** -> Keep missing metrics and unavailable connection reuse distinct from misses or failures; do not introduce Anthropic-only eligibility thresholds for every provider.
- **[Background request remains slow even with a warm prefix]** -> Retain truthful settlement and late publication; use evidence for any later model, speculation, suppression, or cache-marker proposal.

## Migration Plan

1. Recheck the exact implementation-base dependency family and contextual-suggestion prerequisite; complete the public API feasibility/conformance inventory before production implementation.
2. Add neutral capability/outcome and diagnostic seams plus synthetic failing parity cases, without changing main inference or presentation policy.
3. Implement the public snapshot/derived-completion boundary, full model-visible context preservation, effective option inheritance, and provider execution isolation. Stop at step 1 if the required seam is unavailable.
4. Wire snapshot lifetime and timing to the existing controller, then complete payload, privacy, transport, cancellation, and regression coverage.
5. Obtain CI validation and credential-gated/physical-terminal acceptance evidence; explicitly distinguish request-parity correctness from measured latency improvement.

No persisted-session migration is needed. Rollback can disable prompt suggestions with the existing setting or revert this implementation; it must not leave captured requests, diagnostic buffers, or background transport state alive. This planning change does not modify the existing feature's outstanding acceptance tasks or authorize its archive.
