## 1. Retain the completed historical audit

These two tasks record the original investigation, not implementation or acceptance. The former exact-snapshot API gate and its pause are superseded by the revised proposal/design; `implementation-evidence.md` remains unchanged historical evidence. Exact transformed-request reuse and shared WebSocket optimization are deferred, not incomplete prerequisites for the work below.

- [x] 1.1 Verify the original implementation base contains contextual prompt suggestions and record the manifest/lockfile-resolved Pi family, distinguishing it from the earlier installed transitive versions and leaving prior acceptance tasks unchanged. Evidence: `implementation-evidence.md`, section 1.
- [x] 1.2 Inventory public capture, conversion, settings, hook-ordering, and completion APIs and record the missing exact request-fork capability under the original scope. Evidence: `implementation-evidence.md`, sections 2-4; the historical pause no longer gates this revision.

## 2. Establish supported current-API configurations

- [ ] 2.1 Recheck the current dependency authority and wire a typed support classifier using public loaded-extension/provider metadata; verify ordinary built-in Anthropic, OpenAI Responses, and Codex sessions plus UI-only/persistent-context extensions remain supported without a new snapshot API.
- [ ] 2.2 Add bounded unsupported outcomes for active `context`, `before_provider_request`, and `before_provider_headers` hooks, unknown metadata, and incompatible custom providers; verify zero suggestion requests for each excluded case, observation-only handlers are conservatively excluded, no extension paths/content escape, and primary hooks still execute normally once.
- [ ] 2.3 Track relevant public configuration and extension inventory from run start through response preparation and publication; verify reload, settings/model changes, and changed/unknown support invalidate the candidate while later stable runs recover normally.

## 3. Correct context, settings, and cache routing

- [ ] 3.1 Capture one identity-bound public context copy at the eligible completed-response boundary and use package-root message conversion instead of raw-role filtering; verify compaction/branch summaries, custom context, included/excluded bash, authoritative response association, exactly one completed assistant response, immutable inputs, and cleanup without per-token copies.
- [ ] 3.2 Apply the supported main-path image-blocking policy after conversion and preserve serializable provider-relevant tool schema metadata without executable functions; verify enabled images, disabled-image placeholders/deduplication, mixed text content, unchanged source objects, and no tool execution.
- [ ] 3.3 Pass named reasoning plus configured thinking budgets and applicable public runtime/model settings through authenticated simple completion; verify custom `high: 4096` does not become default 16384, defaults remain equal, near-context limits stay valid, native session/cache identity is used rather than the UI ID, and credentials are freshly resolved without persistence.
- [ ] 3.4 Select independent `transport: "sse"` for Codex suggestions while retaining native cache routing and leaving main transport unchanged; verify the pinned provider dispatch path avoids primary WebSocket continuation access for idle/busy, success/failure/cancel, and primary-suggestion-primary cases, rather than testing only an options object.

## 4. Preserve lifecycle and add basic observations

- [ ] 4.1 Integrate support/configuration invalidation with existing suggestion epochs, deadline, continuation/retry/compaction, session replacement, typing/paste, disable, and disposal; verify both result/settlement orders, same-cycle prepared presentation, immediate eligible late results, autocomplete and Tab-then-Enter behavior, and stale-result rejection.
- [ ] 4.2 Add a small optional metadata observer on existing generator/controller seams for outcome, available separate usage, logical inference counts, generation duration, and result-versus-settlement timing; verify absent metrics remain unknown, callbacks cannot block/fail the primary session, disabled observation retains no history, and no paint timestamp or automatic telemetry is invented.
- [ ] 4.3 Extend the existing explicit provider probe with bounded sample collection and privacy-allowlisted output; verify collector bounds/cleanup, no raw session/cache IDs or private content, separate primary/suggestion accounting, and an honest distinction between logical inference counts and unobserved retries.

## 5. Validate the narrower implementation

- [ ] 5.1 Complete network-disabled independent parent-versus-suggestion conformance fixtures for the supported context/settings matrix and explicit excluded configurations; verify deliberate summary, budget, tool-schema, or cache-key omissions fail while only the documented tail, provider-limit/marker, volatile-field, and Codex SSE differences are allowed.
- [ ] 5.2 Obtain required CI for the exact dependency set and focused architecture/lifecycle/privacy/provider coverage; verify no private APIs or method patches, no dependency changes, no primary transcript/usage/extension changes, and no new suggestion behavior in `a1 pi` or non-interactive profiles.
- [ ] 5.3 With explicit approval, run bounded baseline/corrected provider samples using equivalent independent fixture sessions and alternating order; record supported Anthropic and OpenAI/Codex cases, available cache counters and generation/result-availability timings, sample counts, and improvement or lack of improvement without claiming guaranteed cache hits.
- [ ] 5.4 Obtain physical-terminal acceptance for prepared-result timing, residual late-result delay, draft cancellation, acceptance/submission, and unsupported-extension suppression; record the exact build/commit and user findings, keep original feature acceptance distinct, and do not claim zero visible delay from request timing alone.
