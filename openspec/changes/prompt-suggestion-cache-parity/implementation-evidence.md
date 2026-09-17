# Implementation evidence

All commands were run from the delivery worktree `D:/Git/a1/.worktrees/prompt-suggestion-cache-parity` on `develop` at `e52df799` after `npm ci`. `test:fast`, `test:full`, and `test:release` were not run; the maintainer did not request them.

## Regression reproduction

Before the adapter change, the focused adapter scope failed on three new cases: `sends the session's own thinking level (reasoning true, level high)` and `(level minimal)` received `off` from `suggestionReasoningPolicy` (the lowest-effort policy), and `mirrors the primary loop's request shape` saw no `transformContext` call (`expected [] to deeply equal [...]`) because the adapter filtered raw state messages instead.

## Focused tests

| Command | Outcome |
| --- | --- |
| `npx vitest run test/integrations/pi/engine/adapter.test.ts` | 44 passed, including the four thinking-level cases and the request-shape case (compaction summary and extension context message converted like the primary loop; `reasoning`, `sessionId`, `thinkingBudgets`, `transport`, `onPayload` forwarded; state messages, thinking level, and session calls untouched). |
| `npx vitest run test/integrations/pi/engine test/integrations/pi/session-ui/prompt-suggestion-controller.test.ts test/integrations/pi/session-ui/session-shell.test.ts test/composition/prompt-suggestion-diagnostics.test.ts test/features/prompt-suggestions test/contracts` | 27 files passed (one opt-in provider file skipped), 599 tests passed across both invocations. |
| `npm run typecheck` | No diagnostics. |

## Real-provider probe

`RUN_PROMPT_SUGGESTION_PROVIDER_TEST=1 PROMPT_SUGGESTION_AGENT_DIR=<agent dir> npx vitest run test/integrations/pi/engine/prompt-suggestion-provider.integration.test.ts` against `openai-codex` / `gpt-5.6-sol` with the session at thinking `high`, a padded system prompt of about 4,000 tokens, and five consecutive suggestion requests per variant on the same in-memory conversation:

| Variant | Request shape | `cacheRead` per sample | Uncached `input` per sample | Elapsed ms |
| --- | --- | --- | --- | --- |
| `legacy-shape` | pre-change: reasoning `minimal`, no `sessionId`/`thinkingBudgets`/`transport`/`onPayload` | 0, 0, 0, 0, 0 | 4143 × 5 | 2649, 2420, 2210, 2545, 1929 |
| `revised` | this change: reasoning `high`, loop options forwarded | 0, 3968, 3968, 3968, 3968 | 4143, 175, 175, 175, 175 | 6045, 2043, 2301, 1609, 4600 |

The legacy shape never produced a cache read; the revised shape re-reads only the 175-token tail after the first request. On this 4k-token fixture the wall-clock difference is inside provider noise (the model now also thinks at `high`); the saving scales with conversation length, since a long session pays the full re-read on every legacy request and 175 tokens on every revised one. All five `revised` and `legacy-shape` samples returned an archival candidate; the `required-testing` conversation abstained.

The probe also needed two fixture repairs to run at all on current Pi: synthetic assistant messages now carry a zero `usage` record because Pi's context estimator reads `usage.totalTokens` from every assistant message, and the system prompt is padded above the provider's minimum cacheable prefix.

## Governance commands

| Command | Outcome |
| --- | --- |
| `npx openspec validate prompt-suggestion-cache-parity --strict` | `Change 'prompt-suggestion-cache-parity' is valid`. |
| `npm run check:architecture` | Architecture boundaries, product identity, pinned Pi source ledger, terminal host provenance OK; the startup graph stays within its 2,624,606 source-byte baseline after trimming the new comments (a first draft exceeded it by 157 bytes). |
| `npm run check:names` | 957 files, 0 violations. |
| `npm run check:code-documentation` | No violations. |

## Gap disposition

No known implementation or validation gaps remain. Full regression and native host gates remain CI-owned under repository policy.
