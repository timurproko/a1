## 1. Establish the public integration prerequisite

- [x] 1.1 Verify the implementation base contains contextual prompt suggestions and record the exact manifest/lockfile-resolved Pi family; completion evidence must distinguish that dependency set from the investigation's installed transitive versions and leave prior acceptance tasks unchanged. Evidence: `implementation-evidence.md`, section 1.
- [x] 1.2 Inventory documented public capture, transformed-context, effective-option, extension-ordering, and isolated-completion APIs; deliver a capability matrix naming the supported seams and any missing capability. Stop before production implementation if faithful reuse requires private APIs or a dependency change. Evidence: `implementation-evidence.md`, sections 2-4; gate blocked, implementation paused.
- [ ] 1.3 Verify native provider session/cache identity and transport isolation semantics for Anthropic and OpenAI/Codex, including busy sockets, abort, and primary-suggestion-primary continuation; document the safe public execution mode or explicit unavailable outcome for each configuration.

## 2. Add request-conformance and capability seams

- [ ] 2.1 Define neutral supported/unavailable generation outcomes and snapshot/configuration identity behind the existing suggestion port; verify contract tests distinguish unsupported reuse from a valid empty suggestion and expose no Pi types, credentials, or raw payloads.
- [ ] 2.2 Build a network-disabled synthetic harness with the normal supported Pi request path as the independent parent producer; verify deliberate removal of a summary, budget override, tool schema, or provider cache key each fails the comparison rather than being normalized away.
- [ ] 2.3 Implement typed public-capability validation and bounded unavailability reasons; verify unavailable configurations issue no lossy fallback request, keep the primary session usable, and cannot make a globally unsupported implementation pass its release gate.

## 3. Preserve context and effective request options

- [ ] 3.1 Capture one immutable parent request snapshot after supported transformations and bind its matching completed assistant response; verify the response appears exactly once, newer session state is not read back, and snapshot work is not repeated per streamed token.
- [ ] 3.2 Replace raw-role filtering with snapshot-backed model-visible context reuse; verify independent payload cases for compaction/branch summaries, custom messages, included and excluded user-run bash results, images, and blocked-image placeholders.
- [ ] 3.3 Preserve effective supported extension context/payload policies without replaying stateful hooks; verify transformed prefix equality, unchanged main requests, single parent hook side effects, and explicit unavailability when safe capture cannot be negotiated.
- [ ] 3.4 Inherit compatible thinking budgets, sampling settings, system/tools, output-limit policy, cache retention, and native session identity while resolving credentials anew; verify the 4096-versus-16384 custom-budget regression, default Anthropic parity, near-context-limit validity, refreshed auth, and explicit OpenAI/Codex cache-key parity.
- [ ] 3.5 Execute derived completions through the supported independent provider path with retained transport policy and safe routing; verify idle/busy connection cases, primary-suggestion-primary correctness, suggestion cancellation isolation, no tool execution, and no transcript or primary usage mutation.

## 4. Integrate lifecycle and bounded observation

- [ ] 4.1 Wire snapshot/configuration invalidation into continuation, tool execution, retry/compaction, session/model/configuration change, typing/paste, cancellation, disable, and disposal; verify late results cannot publish and captured state is released.
- [ ] 4.2 Add the opt-in metadata-only observer with a 128-record default bound, ephemeral correlation, usage availability, monotonic lifecycle times, and explicit enable/disable/export through the diagnostic owner; verify field allowlisting, eviction, disable cleanup, and observation failures cannot block input or the main request.
- [ ] 4.3 Observe settlement, publication eligibility, and actual presentation only where a public acknowledgement exists; verify fake-clock tests distinguish a render request from confirmed presentation, preserve unavailable timestamps, and compute generation and post-settlement delay separately.
- [ ] 4.4 Preserve existing result-before-settlement and settlement-before-result behavior; verify prepared suggestions join the settlement frame, eligible late results appear immediately, typing wins, and no spinner retention, reveal timer, cold-size suppression, extra model choice, or speculative streaming request is introduced.

## 5. Validate and obtain acceptance

- [ ] 5.1 Complete deterministic request, lifecycle, privacy, transport, capability, and architecture coverage against the exact dependency authority; verify required CI passes and comparison/non-interactive profiles, primary extension behavior, and ordinary usage/footer accounting remain unchanged.
- [ ] 5.2 Extend the explicit credential-gated probe into a paired parent/suggestion experiment using equivalent isolated synthetic conversations, separate baseline/corrected sessions, and alternating order; verify reports include sample/request counts, supported cache counters, latency distributions, and unavailable data without exporting content or credentials.
- [ ] 5.3 Run the credential-gated acceptance experiment with explicit approval on available Anthropic and OpenAI/Codex configurations; record default and summary/custom-context cases, custom-budget evidence where applicable, and measured improvement or lack of improvement without treating synthetic payload parity as a live cache-hit proof.
- [ ] 5.4 Obtain physical-terminal acceptance for immediate prepared presentation, residual late-result delay, draft cancellation, Tab-then-Enter, and unchanged vanilla behavior; record exact build/commit, what was observed, and user acceptance before claiming the latency issue resolved.
