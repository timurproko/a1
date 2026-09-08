# Current-public-API implementation evidence

## Authority and scope

- Accepted revision: PR #283, merged as `916cdf939ff9971e39c330027fd766e29859b2a4`.
- Fresh detached implementation worktree: `D:/Git/a1/.worktrees/implement-supported-suggestion-parity`, based on that fetched `origin/develop` commit.
- Delivery branch: `fix/supported-suggestion-parity`.
- Installed with `npm ci --ignore-scripts --no-audit --no-fund`; manifest, lockfile, and installed coding-agent/agent-core/pi-ai/pi-tui all resolve to `0.84.2`. No dependency changes. The postinstall-generated declaration difference was restored before validation/commit.
- The original `implementation-evidence.md` remains unchanged historical evidence of the broader API audit. No prior feature acceptance or planning requirements have been rewritten.

## Implemented behavior

- Public loaded-extension metadata classifies the three excluded mutating hooks, including observation-only handlers. Unknown metadata and opaque native/custom-stream providers fail closed for suggestions only. Normal built-in APIs and ordinary UI/persistent-context extensions remain supported.
- One response-bound copy uses package-root `convertToLlm`, preserving summaries, custom context, included bash results, enabled images, and deferred-tool metadata. UI-only tool-result details and executable tool functions are not copied into model context. Blocked images use Pi's existing placeholder/deduplication policy.
- Public reasoning/budgets, native session identity, model/provider defaults, transport, and timeout/retry settings are retained. Authentication remains with the runtime and is resolved at dispatch, not captured as a resolved HTTP request. Configured budgets that no longer match the main Agent's construction-time budget are explicitly unavailable rather than presumed to be effective.
- Codex suggestions explicitly use SSE with the native routing identity, without changing the main transport or its continuation state.
- Configuration/reload and response guards cover generation and publication, with existing controller cancellation, settlement timing, and editor behavior preserved. Conversation copies transfer to dispatch; small response/configuration guards are released on invalidation/disable/disposal.
- Optional allowlisted observations expose separate available usage, logical suggestion invocations, generation duration, and result availability relative to settlement. Normalized zero counters are unknown when the library cannot establish availability. Neither observations nor probe output claim physical terminal paint or unobserved network-attempt counts.

## Local validation

No `test:fast`, `test:full`, or `test:release` run locally. No paid provider requests were made.

Passed:

- `npm run build`
- `npm run typecheck`
- `npm run check:code-documentation:changed`
- `npm run check:architecture` (including identity and pinned-source provenance governance)
- `git diff --check`
- `openspec validate fix-prompt-suggestion-cache-parity --strict`
- Focused Vitest coverage across the adapter, controller, session shell/viewport, settings app, and new parity/transport/privacy tests: 244 distinct tests passed across the focused runs. The combined eight-file run passed 243 tests before adding the final sticky-thinking-change case; the final parity-only rerun passed all 25 cases.
- The credential-gated provider probe was collected and skipped as intended.

Key conformance evidence:

- Actual supported main SDK dispatch versus corrected suggestion dispatch for Anthropic, OpenAI Responses, and Codex, through network-disabled synthetic HTTP responses. Comparisons retain message prefixes, system/tools, budgets, and routing; only the named assistant/instruction tail and provider cache markers differ in these fixtures.
- Deliberate context, thinking-budget, tool-schema, and cache-key omissions fail the comparisons.
- Default/custom thinking budgets and provider max-output clamping; image enabled/blocked; custom context, compaction/branch summaries, included/excluded bash; fresh synthetic credential resolution; immutable inputs; unsupported hook/provider configurations; reload and settings races; separate primary accounting.
- Ten Codex cases exercise the pinned provider through a public synthetic WebSocket/HTTP boundary, not a mocked options object. Main `auto`, `websocket`, `websocket-cached`, and SSE behavior remains intact. Idle and busy cases cover suggestion success, failure, and cancellation. Subsequent primary requests retain the correct `previous_response_id`; no private provider cache state is inspected or patched.
- Controller coverage includes both settlement/result orders, prepared-result configuration rechecks, pending cancellation, disabled release, and non-awaited diagnostic callbacks. Existing shell/viewport tests preserve editor and frame behavior.
- Probe collector tests verify fixed capacity, allowlisted fields, invalid-metric rejection, take/disable cleanup, and no private content in output.

## Remaining acceptance gates

Tasks 5.2-5.4 remain unchecked:

1. Required CI results for the pushed implementation commit must be read and reported. Local results are not a substitute for CI.
2. Explicitly approved provider measurements are still needed. The revised probe uses independent sessions with two primary fixture prompts and at most one suggestion each, alternates baseline/corrected order, and bounds samples to 1-3 pairs (default 2). Default 2 pairs can make up to 12 logical inference calls before provider-level retries. Baseline requests reproduce the previous options/context omissions only when the configuration is classified as supported. Output includes no prompt/suggestion text, custom model names, paths, or routing keys. Cache warmth is interpreted from available provider counters, not assumed from priming. No latency improvement has yet been established against a real provider.
3. Physical-terminal review is still needed for perceived delay, prepared versus late presentation, draft cancellation, Tab acceptance followed by Enter submission, and suppression with request-transforming extensions. No zero-visible-delay claim is made.

Manual UI review after required CI: in the implementation worktree, build with `npm run build` and launch through `./scripts/dev`. Keep prompt suggestions enabled in settings, use a supported model/configuration, and complete at least two successful assistant responses that offer a clear next action. A current suggestion should appear without extending the working indicator; typing should dismiss it and Tab should only accept it into the draft. Sessions with one of the excluded request hooks deliberately show no suggestion and no new status row. The original `add-contextual-prompt-suggestions` provider/manual acceptance remains separate and outstanding.
