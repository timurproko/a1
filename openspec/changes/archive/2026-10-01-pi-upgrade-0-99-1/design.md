# Design

## Proposed by the sync, decided by a reviewer

The upgrade script bumps the pins, evaluates the candidate in isolation, three-way merges each vendored copy that follows upstream (old upstream, new upstream, A1 copy) and records the upstream delta of each copy A1 keeps, regenerates every derived artifact, and runs the gates. It never resolves a conflict, never drops an orphaned inventory entry, never records a feature disposition, and never merges; each of those is a review item in the pull-request body.

## Review resolution

- The 61 added exports and one removed export have no direct A1 consumer; their upstream features are dispositioned in the feature matrix.
- The changed engine exports `AgentSession`, `AgentSessionEvent`, `DefaultPackageManager`, `ExtensionAPI`, `InlineExtension`, `ModelRuntime`, `PromptOptions`, `SessionManager`, `SettingsCallbacks`, `SettingsConfig`, and `SettingsManager` remain on public package-root boundaries. Their consumers typecheck and pass engine conformance, settings, session, and command-workflow parity; the prompt preflight callback uses the 0.99.1 disposition contract.
- The changed presentation exports `Theme`, `ToolDefinition`, `CombinedAutocompleteProvider`, and `Markdown` remain on public boundaries and pass component, theme, startup, and command parity.
- The changed terminal exports `ProcessTerminal`, `TUI`, `TuiAltScreen`, and `TuiAltScreenOptions` adopt terminal-color querying and configurable fullscreen wheel scrolling and pass terminal runtime and damage tests.
- Inventory refresh reports no conflicts, orphaned entries, unmapped components, or pending feature rows. The system-theme source is an explicit non-startup entry because A1 retains owned explicit theme selection.

## User-visible changes

- Pi startup uses the 0.99.1 two-line logo and refreshed dark/light palettes.
- Fullscreen sessions expose and live-apply the wheel-scroll-lines setting.
- Virtual-model sessions show the latest physical model route in the footer.
- Model and authentication behavior includes the pinned GPT-6.1 Sol catalog/default changes and bundled ChatGPT login fix.
- Tool-call fallback rendering and comparison hotkey help follow the 0.99.1 behavior and wording.
