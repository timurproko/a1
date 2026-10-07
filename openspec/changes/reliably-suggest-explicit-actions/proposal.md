## Why

Bare A1 can still leave the prompt empty after a settled response clearly asks for one next action, including the formal plan-approval and implementation handoff shown in the report. The existing archive-focused guidance does not directly cover this common workflow state, and valid concise approval/action predictions can be lost when the model abstains, attempts a tool call, or returns a currently unrecognized one-word reply.

## What Changes

- Make the prediction instruction treat an explicit, intent-compatible request for one next action as a strong signal, including formal plan approval plus an implementation request, while preserving abstention for unresolved choices, contradictory intent, and outstanding required validation.
- Tell the prediction request explicitly to return user text rather than call tools, without changing the cache-compatible request shape, selected model, reasoning level, one-request limit, timeout, or cancellation behavior.
- Accept a narrow set of common one-word approval/action replies as inert candidates when they satisfy all other safety and formatting rules.
- Add a sanitized regression fixture for the reported approval/implementation handoff, plus negative fixtures that ensure required validation and genuinely unresolved decisions still allow no suggestion.
- Extend deterministic and opt-in provider evidence so misses can be classified without adding extraction fallbacks, retries, conversation logging, or automatic execution.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `contextual-prompt-suggestions`: strengthen explicit-next-action prediction and recognize bounded one-word approval/action candidates while retaining contextual judgment and deliberate user acceptance.

## Impact

Expected implementation areas are the owned prompt-suggestion instruction and candidate normalizer, sanitized conversation fixtures, Pi adapter/controller integration coverage, and the existing opt-in provider probe and architecture documentation. No dependency, setting, session format, UI layout, comparison-mode, cache-parity, tool-execution, retry, or model-selection change is proposed.
