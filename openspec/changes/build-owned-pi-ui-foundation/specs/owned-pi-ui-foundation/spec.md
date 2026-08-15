## Purpose

Defines AddOne's independently owned fullscreen Pi shell, its public Pi engine/runtime/component boundaries, current-version parity requirements, customization slots, diagnostics, and upgrade-conformance policy.

## ADDED Requirements

### Requirement: The AddOne UI owns shell composition without replacing public Pi terminal primitives
The owned UI SHALL own session composition, state reduction, command routing, customization slots, transcript assembly policy, and lifecycle orchestration. It SHALL use Pi's documented public SDK as the agent engine and the public `pi-tui` runtime and root-package component exports for terminal input, focus, differential rendering, overlays, and restoration. It SHALL NOT instantiate, patch, or inspect Pi's stock interactive UI as the application root.

#### Scenario: Start one owned Pi session
- **WHEN** the user starts the owned fullscreen UI
- **THEN** AddOne SHALL present one interactive Pi-backed session whose shell composition is controlled by AddOne and whose terminal primitives come from the public Pi TUI runtime

#### Scenario: Pi interactive internals are present
- **WHEN** an installed Pi package exposes its stock interactive classes or implementation details
- **THEN** the owned UI SHALL NOT mutate prototypes, read private fields, use deep imports, or require distribution-file hashes to operate

### Requirement: The pinned Pi version has observable parity before further product work
The first accepted presentation SHALL match the pinned current Pi version for startup composition, editor behavior, command discovery and autocomplete, the complete pinned built-in command manifest, transcript, streaming, tools, queued input, abort, retry, compaction, models, thinking, sessions, settings, clipboard, selection, resize, diagnostics, footer/status state, errors, and shutdown. Parity SHALL be demonstrated through independently produced upstream and AddOne component/composition captures, command-manifest and workflow results, scripted event sequences, a real SDK-backed prompt turn, and terminal-frame comparison. AddOne-generated snapshots and synthetic-session output MAY serve as regression fixtures but SHALL NOT by themselves count as parity evidence. The owned shell SHALL NOT claim automatic byte-for-byte identity with future Pi versions, and `a1 pi` SHALL remain the exact upstream comparison.

#### Scenario: Startup or component rendering differs
- **WHEN** equivalent pinned-Pi and AddOne startup or component states produce different visible rows at a covered width
- **THEN** the parity gate SHALL fail before manual acceptance or publication

#### Scenario: Command surface is incomplete
- **WHEN** a built-in command, autocomplete entry, keybinding, selector, or observable command outcome in the pinned Pi manifest is absent or behaves differently in AddOne
- **THEN** the parity gate SHALL fail and the missing workflow SHALL be implemented before acceptance

#### Scenario: Event or terminal frame differs
- **WHEN** an independently evaluated Pi session event sequence or emitted terminal frame differs from the pinned Pi result outside a documented tolerance
- **THEN** the parity gate SHALL fail and the divergence SHALL be corrected before further UI customization

#### Scenario: Synthetic fixture has no upstream producer
- **WHEN** parity evidence is generated only by AddOne shell code or a synthetic AddOne test session without a separate pinned-upstream result
- **THEN** that evidence SHALL be classified as regression evidence and SHALL NOT satisfy the parity gate

#### Scenario: Complete an ordinary Pi turn
- **WHEN** the user enters a prompt against a real SDK-backed session and the agent streams text and tool activity
- **THEN** the UI SHALL visibly accept the prompt, preserve ordered transcript state, show streaming and tool status and results, present failures, and complete the turn without corrupting terminal scrollback

### Requirement: Public engine, runtime, and component reuse stays behind adapters
Pi SDK, `pi-tui`, and public Pi component types SHALL be mapped through AddOne-owned adapters before reaching workspace or presentation state. Reused public components and provenance-recorded MIT-licensed orchestration ports SHALL expose AddOne-owned contracts so a Pi upgrade is handled as adapter or port conformance work rather than workspace-wide refactoring.

#### Scenario: Upgrade the Pi engine or TUI
- **WHEN** AddOne evaluates a newer Pi package
- **THEN** engine, runtime, component, and ported-shell adapters SHALL pass conformance and parity fixtures before the new engine is released

#### Scenario: A public component or controller is too coupled
- **WHEN** a desired Pi UI behavior cannot be reused through documented public contracts
- **THEN** AddOne SHALL port the minimum required behavior with recorded provenance and attribution rather than patching installed Pi code

### Requirement: Customization uses stable AddOne-owned slots above the parity shell
Users and AddOne features SHALL customize themes, components, commands, input behavior, status surfaces, and future layout composition through versioned AddOne-owned slots. Customization SHALL NOT depend on host mutation or the presence of Pi's stock extension UI context, and SHALL remain unavailable until current-version parity passes.

#### Scenario: Replace a theme or component after parity
- **WHEN** the user selects an AddOne customization for a supported slot after parity acceptance
- **THEN** AddOne SHALL resolve it without mutating installed Pi code and shall preserve ordinary transcript and session behavior

#### Scenario: Load a non-visual Pi resource
- **WHEN** a Pi skill, command, tool, or other non-visual resource is supported by the public SDK
- **THEN** the adapter MAY expose it through AddOne-owned semantics without requiring stock Pi TUI APIs

### Requirement: Parity and base UI acceptance precede customization and structured tabs
The owned UI SHALL pass adapter conformance, independent upstream component/composition parity, complete command-manifest and workflow parity, scripted event parity, real-prompt parity, terminal-frame parity, lifecycle/resource tests, and explicit manual base-UX acceptance before structured multi-agent tabs or additional customization are enabled. A failed manual acceptance SHALL invalidate the candidate and any completion claim contradicted by the finding. Arbitrary terminal panes, splits, and terminal-host composition SHALL remain outside this capability.

#### Scenario: Request customization or tabs before parity acceptance
- **WHEN** customization or structured tabs are requested before current-version parity and base acceptance are complete
- **THEN** AddOne SHALL keep those capabilities unavailable rather than building them on Pi's stock interactive root or the disposable custom-renderer spike

#### Scenario: Detect missing baseline behavior
- **WHEN** startup, prompt submission, commands, autocomplete, transcript, editor, tools, sessions, models, settings, compaction, clipboard, resize, footer/status, errors, or shutdown behavior is missing or regresses
- **THEN** the acceptance gate SHALL fail even if unrelated synthetic fixtures pass

#### Scenario: Manual smoke contradicts automated evidence
- **WHEN** user-controlled comparison shows that an ordinary vanilla workflow is missing or visibly divergent despite automated fixtures passing
- **THEN** AddOne SHALL reject the candidate, correct the fixture gap, and rerun independent parity and manual acceptance before publication
