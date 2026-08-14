## Purpose

Defines AddOne's independently owned fullscreen Pi user interface, its public Pi engine boundary, vanilla-style base experience, customization slots, diagnostics, and upgrade-conformance policy.

## ADDED Requirements

### Requirement: The AddOne UI owns terminal presentation and session orchestration
The owned UI SHALL own the fullscreen component tree, terminal lifecycle, state reduction, focus and input routing, transcript assembly, tool presentation, editor behavior, status, dialogs, overlays, resize behavior, diagnostics, and clean shutdown. It SHALL use Pi through documented public SDK entry points as the agent engine and SHALL NOT instantiate, patch, or inspect Pi's stock interactive UI as the application root.

#### Scenario: Start one owned Pi session
- **WHEN** the user starts the owned fullscreen UI
- **THEN** AddOne SHALL present one interactive Pi-backed session whose UI composition is controlled by AddOne

#### Scenario: Pi interactive internals are present
- **WHEN** an installed Pi package exposes its stock interactive classes or implementation details
- **THEN** the owned UI SHALL NOT mutate prototypes, read private fields, use deep imports, or require distribution-file hashes to operate

### Requirement: The vanilla-style preset is the base experience
The first accepted presentation SHALL be a vanilla-style Pi experience containing transcript and streaming, tool execution, an owned editor with queued input, abort, retry and compaction affordances, model and thinking controls, session creation and resume, settings access, clipboard behavior, terminal resize, diagnostics, and clean shutdown. It SHALL be comparable to `a1 pi`, but SHALL NOT claim byte-for-byte identity with upstream Pi.

#### Scenario: Complete an ordinary Pi turn
- **WHEN** the user enters a prompt and the agent streams text and tool activity
- **THEN** the UI SHALL preserve ordered transcript state, show tool status and results, and present the completed turn without corrupting terminal scrollback

#### Scenario: Compare with explicit vanilla Pi
- **WHEN** the user runs equivalent workflows in the owned vanilla-style preset and `a1 pi`
- **THEN** the owned preset SHALL provide functionally equivalent baseline workflows while `a1 pi` remains the exact upstream comparison

### Requirement: Public engine and component reuse stays behind adapters
Pi SDK types, events, commands, services, and public UI component types SHALL be mapped through AddOne-owned adapters before reaching workspace or presentation state. Reused public components and provenance-recorded MIT-licensed ports SHALL expose AddOne-owned contracts so a Pi upgrade is handled as adapter conformance work rather than workspace-wide refactoring.

#### Scenario: Upgrade the Pi engine
- **WHEN** AddOne evaluates a newer Pi package
- **THEN** engine and component adapters SHALL pass conformance fixtures before the new engine is released

#### Scenario: A public component is too coupled
- **WHEN** a desired Pi UI behavior cannot be reused through documented public component contracts
- **THEN** AddOne SHALL implement or port an owned component with recorded provenance and attribution rather than patching installed Pi code

### Requirement: Customization uses stable AddOne-owned slots
Users and AddOne features SHALL customize themes, components, commands, input behavior, status surfaces, and future layout composition through versioned AddOne-owned slots. Customization SHALL NOT depend on host mutation or the presence of Pi's stock extension UI context.

#### Scenario: Replace a theme or component
- **WHEN** a user selects an AddOne customization for a supported slot
- **THEN** AddOne SHALL resolve it without mutating installed Pi code and shall preserve ordinary transcript and session behavior

#### Scenario: Load a non-visual Pi resource
- **WHEN** a Pi skill, command, tool, or other non-visual resource is supported by the public SDK
- **THEN** the adapter MAY expose it through AddOne-owned semantics without requiring stock Pi TUI APIs

### Requirement: Base UI acceptance precedes structured tabs
The owned UI SHALL pass automated conformance, terminal rendering, input, resize, lifecycle, and resource tests plus explicit manual base-UX acceptance before structured multi-agent tabs are enabled. Arbitrary terminal panes, splits, and terminal-host composition SHALL remain outside this capability.

#### Scenario: Request tabs before base acceptance
- **WHEN** structured tabs are requested before base UI acceptance is complete
- **THEN** AddOne SHALL keep those tabs unavailable rather than building them on Pi's stock interactive root or the disposable 2×2 proof UI

#### Scenario: Detect missing baseline behavior
- **WHEN** transcript, editor, tool, session, model, compaction, clipboard, resize, or shutdown behavior regresses
- **THEN** the acceptance gate SHALL fail even if unrelated components pass
