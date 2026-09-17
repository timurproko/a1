## 1. Reuse the primary request shape

- [ ] 1.1 Extend the adapter test fake session with `agent.convertToLlm`, `agent.transformContext`, `agent.sessionId`, `agent.thinkingBudgets`, and `agent.transport`, seed a conversation containing a `compactionSummary` message, and assert the suggestion call receives the transformed and converted messages plus the instruction together with the loop's `reasoning`, `sessionId`, `thinkingBudgets`, and `transport`; verify the new assertions fail before the implementation.
- [ ] 1.2 Rewrite `PiEngineAdapter.generate` to derive its messages and options from the agent's loop inputs with fallbacks for absent members, and change `suggestionReasoningPolicy` to report the session's current thinking level; verify the adapter, conformance, controller, and session-shell suggestion tests pass with typechecking and the session's thinking level, messages, and persistence remain untouched.

## 2. Evidence

- [ ] 2.1 Add a warm-cache probe to the opt-in real-provider suggestion test that reports `cacheRead` usage and elapsed time for consecutive requests, run it once against a configured provider, and record the before/after numbers in the change; verify ordinary CI still skips the provider test.
