## Status

The maintainer accepted the existing suggestion behavior on 2026-09-11, then requested one adjustment before archival: show `Prompt suggestions` in the existing `Agent` settings section instead of `A1`. This amendment changes presentation grouping only. The change remains active until a separately authorized implementation moves the control and the maintainer accepts that placement; the prior feature acceptance is preserved and does not imply that the relocation is already implemented. The abandoned suggestion-cache optimization remains separate.

## Why

When an agent finishes by asking for approval or leaves an obvious next step, A1 currently makes the user retype that response even though the conversation already makes it predictable. A contextual suggestion in the empty prompt can preserve user control while reducing repetitive confirmation and follow-up input.

## What Changes

- Start a short likely-next-prompt request at the earliest trustworthy final assistant-response boundary, before full run settlement, so generation overlaps post-response cleanup while using the currently selected model and current conversation context.
- Suppress generation or display when the interaction is not eligible, the user is already composing input, another input surface owns focus, the session is changing, or no safe and obvious next action exists.
- Validate and filter generated text before exposing it as a suggestion, including strict length, formatting, voice, and error-output constraints.
- Keep an early result hidden until the run settles, then render the complete suggestion immediately inside the empty bare-A1 editor using the same grey `❯` prompt glyph and quiet placeholder styling as the settings search input, without a typing animation or generation-status row and without changing the editor's semantic text.
- Let the existing configurable Tab/autocomplete action accept the ghost text into editable prompt text, switch it to the ordinary prompt text color, and move the caret to its end; require the ordinary submit action afterward rather than submitting on acceptance.
- Cancel and clear stale suggestions on typing, submission, a new agent run, model/session replacement, interruption, or disposal, while preserving existing autocomplete precedence and comparison-profile behavior.
- Present the existing `Prompt suggestions` control exactly once in the bare-A1 settings screen's existing `Agent` section, not `A1`, without creating duplicate Agent sections or leaving an empty A1 section. Keep its A1-owned persistence key, backend, default-enabled value, live application, and extra-selected-model-request disclosure unchanged.
- Add focused lifecycle, race, rendering, keybinding, and real-provider acceptance coverage, including explicit accounting for the extra model request. Extend settings grouping/routing regressions for the relocation without reopening accepted generation or editor behavior.

## Capabilities

### New Capabilities
- `contextual-prompt-suggestions`: Background next-prompt generation, filtering, lifecycle, ghost-text presentation, acceptance, submission behavior, and the control's declared Agent-section placement without transferring storage or execution ownership.

### Modified Capabilities
- `owned-pi-ui-foundation`: Declare contextual prompt suggestions and their A1-backed control in the owned settings replacement's Agent section as bare-A1 additions while keeping `a1 pi`, ordinary editor behavior, autocomplete, input responsiveness, and session replacement semantics intact.

## Impact

- The original implementation affected the owned agent-engine contract and Pi adapter, runtime service composition, session settlement handling, the owned shell/editor interception boundary, theme-driven prompt rendering, settings, and focused integration tests. This follow-up is limited to owned settings declarations, section projection, and focused settings/surface regressions; it does not change suggestion inference, Pi-generated metadata, the stored document format, or the history controls.
- Section membership is presentation rather than backend ownership for this named control. Existing engine-setting order and capability filtering remain unchanged, and the A1-owned control stays editable even when no engine settings can be presented. This is not permission to move other A1 controls into Agent or broaden the pinned settings inventory.
- Suggestion generation uses the active session model and provider credentials through documented package-root/public model-runtime APIs; it is an additional inference request and must be cancellable, bounded, non-persistent, and tool-free.
- The feature must not mutate the main session transcript, invoke tools, block turn settlement, delay input, keep the run visibly working after settlement, or leak a result across response/run/session/model generations.
- Claude Code source was used only as behavioral research: its implementation starts a fire-and-forget fork at the beginning of post-response stop-hook handling so generation overlaps remaining settlement work, inherits the parent model and cache-relevant context, disables tools, filters the result, stores explicit lifecycle metadata, and renders the result as an empty-input placeholder. A1 will preserve its own public-API and owned-contract boundaries and intentionally require Tab acceptance before Enter submission.
