## Purpose

Defines how every Pi setting exposed through A1 is persisted, applied to the correct active owner, reported truthfully when constrained, and verified by observable behavior rather than storage alone.

## ADDED Requirements

### Requirement: Writable Pi settings have an observable application contract
Every Pi setting A1 presents SHALL declare when its effect applies as one of `live`, `next-session`, `next-start`, or `current-exit`. Accepting a value SHALL persist it and SHALL produce the declared effect at that boundary. A1 SHALL NOT report a setting as applied merely because its value was accepted by Pi settings storage. A setting whose effect A1 cannot provide in the active product mode or environment SHALL be omitted from the settings UI, including its option-specific unavailability explanation, and SHALL NOT be reachable as a writable hidden option.

#### Scenario: Apply a live setting
- **WHEN** the user accepts a Pi setting declared `live`
- **THEN** the active owner SHALL observe the new value before the settings operation reports success
- **AND** every affected visible component SHALL be invalidated or reconstructed in the same session

#### Scenario: Apply a deferred setting
- **WHEN** the user accepts a Pi setting declared `next-session`, `next-start`, or `current-exit`
- **THEN** A1 SHALL persist the value and state the exact boundary at which it will apply
- **AND** it SHALL apply at that boundary without requiring the user to change the value again

#### Scenario: Runtime application fails
- **WHEN** persistence succeeds but the declared runtime effect cannot be installed
- **THEN** A1 SHALL report the failure, SHALL NOT claim the new value is in effect, and SHALL restore one consistent effective value across settings surfaces

#### Scenario: Current environment cannot support the effect
- **WHEN** a setting has no observable effect because a required product-mode or environment capability is unavailable
- **THEN** the settings UI SHALL omit the option and its unavailability explanation rather than accepting a value that can produce no observable behavior

### Requirement: Agent behavior settings reach the active Pi session
A1 SHALL apply `autoCompact`, `autoResizeImages`, `blockImages`, `enableSkillCommands`, `steeringMode`, `followUpMode`, `transport`, `httpIdleTimeoutMs`, `thinkingLevel`, and `warnings` with pinned Pi semantics. Settings that Pi can change during a session SHALL affect subsequent applicable work in that session; startup defaults SHALL remain authoritative for newly created sessions. HTTP idle timeout changes SHALL cover the same provider stream and dispatcher idle behavior as pinned Pi, including the documented disabled value. Warning parts SHALL govern only their corresponding warning.

#### Scenario: Change active queue behavior
- **WHEN** the user changes steering mode or follow-up mode while a session is active
- **THEN** subsequently queued input SHALL use the new mode without recreating the session

#### Scenario: Change active transport
- **WHEN** the user changes transport while a session is active
- **THEN** the next provider request SHALL use the selected transport as pinned Pi does

#### Scenario: Change skill-command registration
- **WHEN** the user enables or disables skill commands
- **THEN** command discovery and autocomplete SHALL refresh in the running shell without requiring `/reload` or restart

#### Scenario: Change image processing policy
- **WHEN** the user changes auto-resize or block-images policy
- **THEN** the next user or tool image sent toward a provider SHALL follow the new policy

#### Scenario: Change the HTTP idle timeout
- **WHEN** the user changes the HTTP idle timeout
- **THEN** subsequent provider traffic SHALL use the new stream and dispatcher idle timeout, with zero retaining pinned Pi's disabled-timeout meaning

#### Scenario: Change active thinking
- **WHEN** the user changes thinking level for a model that supports the selected level
- **THEN** the active session and every thinking-level indicator SHALL immediately use the selected level
- **AND** the persisted default SHALL initialize later fresh sessions

#### Scenario: Disable one warning
- **WHEN** the user disables a declared warning part
- **THEN** that warning SHALL no longer be presented while unrelated warnings remain governed by their own values

### Requirement: Owned-shell presentation settings update their real components
A1 SHALL apply `showImages`, `imageWidthCells`, `showHardwareCursor`, `editorPaddingX`, `outputPad`, `autocompleteMaxVisible`, `clearOnShrink`, `showTerminalProgress`, `hideThinkingBlock`, `mermaidRenderingMode`, `showCacheMissNotices`, `doubleEscapeAction`, and `treeFilterMode` to the active owned shell. A changed value SHALL affect existing content where pinned Pi rebuilds or re-renders it and future content where the setting governs construction.

#### Scenario: Change editor geometry
- **WHEN** editor padding or autocomplete maximum changes
- **THEN** the active editor and autocomplete surface SHALL reflow with the selected value without restart

#### Scenario: Change transcript presentation
- **WHEN** output padding, thinking visibility, Mermaid mode, image visibility, or image width changes
- **THEN** existing affected transcript blocks and subsequent blocks SHALL be rendered with the new value

#### Scenario: Change terminal behavior
- **WHEN** hardware cursor, clear-on-shrink, or terminal progress changes
- **THEN** the active terminal runtime SHALL adopt the selected behavior and SHALL restore terminal state on disposal

#### Scenario: Change cache notices
- **WHEN** cache-miss notices are enabled or disabled
- **THEN** later applicable provider cache misses SHALL respectively show or suppress the pinned notice

#### Scenario: Change an input action
- **WHEN** double-Escape action or tree filter mode changes
- **THEN** the next corresponding input action SHALL use the new value

### Requirement: Renderable image content survives the owned transcript boundary
A1 SHALL preserve validated image attachments from user messages and tool results until presentation without embedding unbounded base64 data in the size-limited owned session view. When `showImages` is enabled and the terminal advertises a protocol supported by the pinned image renderer, the transcript SHALL render the image at `imageWidthCells`, subject to available width. When images are hidden or no supported protocol exists, the transcript SHALL render an informative textual fallback and SHALL NOT silently omit the attachment.

#### Scenario: Render an image in a supported terminal
- **WHEN** a user or tool-result image reaches the transcript while image display is enabled and the terminal supports a recognized image protocol
- **THEN** the image SHALL render inline at no more than the configured image width and available transcript width

#### Scenario: Use an unsupported terminal
- **WHEN** an image reaches the transcript while the terminal advertises no supported image protocol
- **THEN** A1 SHALL show a textual image fallback that identifies the attachment
- **AND** `showImages` SHALL remain available because it still controls the defined textual fallback rather than becoming an unavailable placeholder option

#### Scenario: Hide images
- **WHEN** `showImages` is disabled
- **THEN** existing and subsequent attachments SHALL use the textual fallback rather than emitting an inline-image protocol

#### Scenario: Present a large image
- **WHEN** an attachment exceeds the owned transcript payload limit
- **THEN** its bounded transcript metadata SHALL remain valid and its content SHALL remain resolvable by the presenter without increasing the session-view limit

#### Scenario: Reject malformed image content
- **WHEN** image metadata, encoding, or media type is invalid
- **THEN** A1 SHALL reject or replace that attachment with a safe diagnostic and SHALL NOT emit malformed terminal control data

### Requirement: Project trust is decided before project resources load
A1 SHALL resolve saved project trust and `defaultProjectTrust` before Pi loads project settings, context files, skills, prompts, extensions, themes, or other project-scoped executable resources. `ask` SHALL obtain an explicit decision when interaction is available, `trusted` SHALL allow project resources, and `untrusted` SHALL withhold them. A saved path decision SHALL override the default exactly as pinned Pi specifies. A1 SHALL fail closed when a required decision cannot be obtained.

#### Scenario: Ask for an undecided project
- **WHEN** the default is `ask` and no saved decision covers the working directory
- **THEN** A1 SHALL obtain a trust decision before loading any project-scoped resource

#### Scenario: Start an untrusted project
- **WHEN** the effective trust decision is untrusted
- **THEN** project settings and resources SHALL not load while permitted global resources remain available

#### Scenario: Start a trusted project
- **WHEN** the effective trust decision is trusted
- **THEN** project settings and resources SHALL load through the ordinary pinned resource pipeline

#### Scenario: Trust cannot be requested
- **WHEN** the effective default requires a decision but the launch has no interactive trust surface
- **THEN** A1 SHALL treat the project as untrusted and report the reason

### Requirement: Fullscreen exit output is emitted after terminal restoration
When the A1-owned shell uses a fullscreen alternate surface, `fullscreenExitOutput` SHALL govern output produced after that surface is restored. `transcript` SHALL print the final conversation transcript followed by an actionable A1 resume hint. `resume-hint` SHALL print only the actionable hint. Exit output SHALL not contain alternate-screen control sequences, duplicate terminal rows, image control payloads, active animations, or private session data beyond what the selected transcript already displays.

#### Scenario: Exit with transcript output
- **WHEN** fullscreen A1 exits with `fullscreenExitOutput` set to `transcript`
- **THEN** the parent terminal SHALL first be restored and then receive the final textual transcript followed by an actionable resume hint

#### Scenario: Exit with resume hint only
- **WHEN** fullscreen A1 exits with `fullscreenExitOutput` set to `resume-hint`
- **THEN** the parent terminal SHALL first be restored and then receive only an actionable resume hint

#### Scenario: Exit after a failure
- **WHEN** the shell fails while the alternate screen is active
- **THEN** terminal restoration SHALL still precede the configured bounded exit output

### Requirement: Pi startup and installation settings are either honored or hidden
If A1 exposes `collapseChangelog` or `enableInstallTelemetry`, the active A1 startup and installation lifecycle SHALL consume them with pinned Pi semantics. If A1 does not execute the corresponding lifecycle, it SHALL omit that setting and its lifecycle-unavailability explanation from the settings UI and SHALL NOT advertise a writable no-op.

#### Scenario: Start with changelog collapsing enabled
- **WHEN** A1 performs pinned changelog startup presentation and the configured changelog has already been acknowledged
- **THEN** the presentation SHALL remain collapsed as pinned Pi specifies

#### Scenario: Disable installation telemetry
- **WHEN** A1 performs a Pi installation or update lifecycle while installation telemetry is disabled
- **THEN** it SHALL send no Pi installation telemetry for that lifecycle

#### Scenario: Lifecycle is not owned by A1
- **WHEN** A1 cannot provide the Pi lifecycle controlled by one of these settings
- **THEN** the settings surface SHALL omit the setting and its lifecycle reason

### Requirement: Behavioral conformance covers every exposed Pi setting
The accepted inventory of Pi settings known to A1 SHALL map each key to persistence, application timing, active owner, observable effect, capability constraints, UI visibility, and independent acceptance evidence. Automated conformance SHALL fail when a presented key has only metadata, a storage setter, or a selector callback without a tested effect, or when an unavailable key appears as a disabled explanatory row. Terminal-dependent behavior SHALL additionally receive user-controlled physical-terminal acceptance on each claimed platform and terminal.

#### Scenario: Add or expose a Pi setting
- **WHEN** the pinned Pi inventory gains a setting or A1 begins presenting one
- **THEN** conformance SHALL fail until its application contract, owner, effect test, capability predicate, and visible-or-hidden behavior are recorded

#### Scenario: Disconnect an existing effect
- **WHEN** a writable setting continues to persist but no longer changes its declared owner or observable output
- **THEN** behavioral conformance SHALL fail

#### Scenario: Claim terminal support
- **WHEN** A1 claims a setting effect in a physical terminal
- **THEN** acceptance evidence SHALL exercise that effect in the named terminal rather than infer support from a stored value or synthetic capability alone
