# Prompt-suggestion cache parity: implementation prerequisite audit

## Status

Implementation paused at the public API gate in design decision 1 and task 1.2. Tasks 1.1 and 1.2 are complete as inventory/evidence work; their completion does not mean the gate passed. Tasks 1.3 onward remain incomplete. No production implementation, dependency changes, live provider requests, or latency acceptance are claimed.

The accepted specification is PR #281, merged as `7958d0e` on `develop`. This implementation worktree was created from that commit after merge confirmation and successful required CI. Proposal, design, and requirements are unchanged by this audit.

## 1. Implementation base and exact dependency authority

`package.json` declares coding-agent and the direct terminal package at `0.84.2`. Reading every Pi-family package entry in `package-lock.json` gives:

| Lockfile location under `node_modules/` | Version |
| --- | --- |
| `@earendil-works/pi-coding-agent` | 0.84.2 |
| `@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-agent-core` | 0.84.2 |
| `@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-ai` | 0.84.2 |
| `@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-client` | 0.84.2 |
| `@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-protocol` | 0.84.2 |
| `@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-telemetry` | 0.84.2 |
| `@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-tui` | 0.84.2 |
| `@earendil-works/pi-tui` | 0.84.2 |

The installed runtime used in the earlier offline investigation resolved transitive `pi-ai` and agent-core at `0.84.4`; those probes are not exact-locked-runtime acceptance. This audit uses Pi source tag `v0.84.2`, commit `914cf1472e715297caa30db4b9535d534a9eb718`, for dependency behavior. No dependency installation or runtime-version change was performed during this gate.

The implementation base contains `src/integrations/pi/engine/adapter.ts`, `src/integrations/pi/session-ui/prompt-suggestion-controller.ts`, and the credential-gated provider probe. The original `add-contextual-prompt-suggestions/tasks.md` remains unchanged with 23 completed and two pending tasks. Its outstanding provider/manual acceptance is not inherited as complete by this change.

## 2. Public capability matrix

Source paths in this table are relative to the Pi repository at `v0.84.2`; they are inspection evidence, not proposed runtime imports.

| Required capability | Available public surface | Finding |
| --- | --- | --- |
| Read raw session/model state | `AgentSession.agent.state`, selected model/thinking getters, session identity | Available, but raw state is not the transformed request that produced a response. |
| Convert additional message roles | Package-root `convertToLlm`; `packages/coding-agent/src/core/messages.ts` | Available for compaction/branch summaries, custom messages, and included bash results. Does not itself apply the SDK's image-blocking policy or extension transforms. |
| Observe context transforms | Extension `context` event; `core/extensions/runner.ts:984` and `core/sdk.ts:353` | Transform handlers chain over a cloned array. An ordinary handler is not an unconditional post-chain observer; SDK message conversion/image filtering happens afterward. Re-emitting the chain would replay stateful effects. |
| Inspect provider serialization | `before_provider_request` and low-level `onPayload`; `packages/ai/src/types.ts:141` | Available payload inspection/replacement, with an `unknown` provider-specific payload. Does not deliver a reusable model-visible snapshot plus effective options and response identity. |
| Preserve all payload transformations | `core/extensions/runner.ts:1016`, extension docs `before_provider_request` | Handlers run in extension load order and any non-undefined return replaces the payload. Later handlers can rewrite system instructions or messages. A capture handler's position must be established, not assumed. Even an ordered final JSON capture lacks a documented provider-owned derivation operation. |
| Read named configuration inputs | `SettingsManager` thinking-budget/transport getters, native session ID, model metadata | Available configuration inputs, not an immutable record of the effective options and payload overrides used for a particular dispatched request. |
| Execute authenticated simple completion | `ModelRuntime.completeSimple(model, context, options)`; `core/model-runtime.ts:643` | Available and tool-loop-free. It requires caller-supplied generic context/options and rebuilds the provider payload; it does not accept a captured request or preserve arbitrary prior payload transformations automatically. |
| Capture/derive a parent request through the session factory | `CreateAgentSessionOptions`, `CreateAgentSessionFromServicesOptions` | No documented immutable finalized-request snapshot plus isolated derived-completion seam was found. The factory constructs its own agent pipeline. |
| Supply a different model runtime | Public factory accepts concrete `ModelRuntime`; `core/model-runtime.ts:154` | Constructor is private. A structural stand-in, method replacement, or prototype patch is not a supported subclass/injection solution under A1's boundary contract. |
| Replace the inference pipeline | Public custom-provider registration and low-level agent APIs | These are extension/construction mechanisms, not an existing session request-fork API. Implementing provider-specific reconstruction/decorators as an A1-owned alternative would require the separately reviewed design explicitly called for by the accepted gate. |
| Observe response lifecycle | Session message/turn/run events and simple-completion usage | Available lifecycle/usage surfaces, but they do not retroactively expose the exact request prefix that produced the response. |
| Reuse routing without contaminating continuation state | Public `sessionId`/transport options; Codex provider source | Cache routing is available. Independent ownership of mutable cached continuation state is not established for same-session WebSocket suggestions; task 1.3 remains unverified. |

Documentation reviewed includes the coding-agent SDK guide, full extensions guide, custom-provider guide, and the `provider-payload.ts` and SDK inline-extension examples. The example payload logger observes its own handler position and writes raw payloads; it is not a reusable snapshot API and must not be copied into this privacy-bounded implementation.

Some low-level Agent fields, including `onPayload`, `convertToLlm`, and `streamFunction`, are public in TypeScript source. This audit does not misclassify them as private fields. Their existence does not establish the required documented session snapshot/derivation contract; the accepted design expressly rejects reassigning the existing agent's stream function as the workaround. Wrapping an inspection callback alone also does not solve provider-independent derivation of arbitrary transformed payloads.

## 3. Specific transport concern, not acceptance evidence

Pi `packages/ai/src/api/openai-codex-responses.ts` uses the session identity for both cache routing and connection lookup. After a successful reusable WebSocket request, lines 1525-1529 assign `entry.continuation` with that request body, response ID, and response items. The error path clears the same entry's continuation state. Therefore a suggestion using an available primary connection can replace that bookkeeping even if its messages never enter the persisted agent session.

This does not establish that a later main request will produce incorrect output: the provider compares prefixes and can fall back to sending full context. It does establish that copying the parent session ID alone cannot prove the accepted requirement that the suggestion leave primary continuation state independent. Busy-connection, abort, and primary-suggestion-primary execution have not been tested against the exact locked runtime. No claim is made that all same-ID inference is unsafe or that an explicit independent transport mode cannot solve it after review.

## 4. Blocking gap and next decision

Required prerequisite: a documented public capability that captures a particular main request's effective model-visible prefix and compatible options after parent policies, associates it with its finalized response, and derives an isolated background completion without rerunning stateful transformations or sharing mutable primary continuation state. Authentication must remain freshly resolved and outside the retained snapshot.

No such combined capability was established in the selected version. Implementing only raw-role conversion and option copying would knowingly leave accepted requirements unmet. Disabling suggestions globally would also not pass the design's release gate.

The recommended next stream is a separately reviewed Pi public API prerequisite, followed by the separately approved A1 dependency update and resumption of this change. An A1-owned provider-aware request-reuse implementation is an alternative only after its architecture and scope are separately reviewed. This audit does not authorize either stream or silently narrow the accepted requirements.

## Verification performed

- Confirmed PR #281 is merged and its required validation checks succeeded.
- Parsed the implementation worktree's manifest and lockfile without modifying them.
- Confirmed the existing suggestion implementation/probe files and unchanged original task counts.
- Checked public documentation and source signatures/ordering against the exact Pi source tag above.
- No credentials read, no provider requests sent, no broad test suite or interactive UI launched.

There is no runnable product change to test at this pause.
