## Why

When an agent finishes by asking for approval or leaves an obvious next step, A1 currently makes the user retype that response even though the conversation already makes it predictable. A contextual suggestion in the empty prompt can preserve user control while reducing repetitive confirmation and follow-up input.

## What Changes

- Start a short likely-next-prompt request at the earliest trustworthy final assistant-response boundary, before full run settlement, so generation overlaps post-response cleanup while using the currently selected model and current conversation context.
- Suppress generation or display when the interaction is not eligible, the user is already composing input, another input surface owns focus, the session is changing, or no safe and obvious next action exists.
- Validate and filter generated text before exposing it as a suggestion, including strict length, formatting, voice, and error-output constraints.
- Keep an early result hidden until the run settles, then render the complete suggestion immediately inside the empty bare-A1 editor using the same grey `❯` prompt glyph and quiet placeholder styling as the settings search input, without a typing animation or generation-status row and without changing the editor's semantic text.
- Let the existing configurable Tab/autocomplete action accept the ghost text into editable prompt text, switch it to the ordinary prompt text color, and move the caret to its end; require the ordinary submit action afterward rather than submitting on acceptance.
- Cancel and clear stale suggestions on typing, submission, a new agent run, model/session replacement, interruption, or disposal, while preserving existing autocomplete precedence and comparison-profile behavior.
- Add focused lifecycle, race, rendering, keybinding, and real-provider acceptance coverage, including explicit accounting for the extra model request.

## Capabilities

### New Capabilities
- `contextual-prompt-suggestions`: Background next-prompt generation, filtering, lifecycle, ghost-text presentation, acceptance, and submission behavior.

### Modified Capabilities
- `owned-pi-ui-foundation`: Declare contextual prompt suggestions as a bare-A1 addition while keeping `a1 pi`, ordinary editor behavior, autocomplete, input responsiveness, and session replacement semantics intact.

## Impact

- Affected areas include the owned agent-engine contract and Pi adapter, runtime service composition, session settlement handling, the owned shell/editor interception boundary, theme-driven prompt rendering, settings, and focused integration tests.
- Suggestion generation uses the active session model and provider credentials through documented package-root/public model-runtime APIs; it is an additional inference request and must be cancellable, bounded, non-persistent, and tool-free.
- The feature must not mutate the main session transcript, invoke tools, block turn settlement, delay input, keep the run visibly working after settlement, or leak a result across response/run/session/model generations.
- Claude Code source was used only as behavioral research: its implementation starts a fire-and-forget fork at the beginning of post-response stop-hook handling so generation overlaps remaining settlement work, inherits the parent model and cache-relevant context, disables tools, filters the result, stores explicit lifecycle metadata, and renders the result as an empty-input placeholder. A1 will preserve its own public-API and owned-contract boundaries and intentionally require Tab acceptance before Enter submission.
