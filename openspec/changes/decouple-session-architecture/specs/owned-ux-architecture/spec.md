# owned-ux-architecture Delta

## ADDED Requirements

### Requirement: Session concerns own their state, reset, and disposal
A session presenter SHALL be a coordinator over focused session concerns. Each concern SHALL own the fields it acts on, SHALL reset them itself when the session is replaced, and SHALL release them itself on disposal through one shared concern lifecycle contract. The presenter SHALL fan out session replacement and disposal in one declared order and SHALL NOT hold or reset another concern's state. A concern SHALL receive typed ports for what it needs and SHALL NOT receive the presenter, the render root, or an untyped bag of callbacks.

#### Scenario: The session is replaced
- **WHEN** the backend reports a new session generation
- **THEN** the presenter SHALL notify every concern in its declared order
- **AND** each concern SHALL clear only its own pending work, timers, and dialogs
- **AND** no concern state SHALL remain in the presenter

#### Scenario: A new orchestration behavior is added
- **WHEN** a change adds submission, routing, dialog, or lifecycle behavior to the session shell
- **THEN** it SHALL land in the concern that owns that behavior or in a new concern
- **AND** the presenter SHALL change only to register that concern

#### Scenario: The presenter is released
- **WHEN** the shell is disposed
- **THEN** every concern SHALL be disposed once in the declared order
- **AND** a second disposal SHALL be a no-op

### Requirement: A render root delegates to one layout strategy and owns no caches
A render root SHALL select one layout strategy at construction for the session's layout mode and SHALL NOT branch on the layout mode afterwards. Transcript blocks, their order, the per-block render cache, and the per-width document layouts SHALL have one owner that exposes named invalidation reasons; the render root SHALL request layouts from that owner and SHALL NOT clear caches itself. Dock chrome, workflow output, extension surfaces, and the input surface SHALL each be a component the root composes.

#### Scenario: Render in pinned mode
- **WHEN** the shell is constructed with the pinned layout
- **THEN** the pinned layout strategy SHALL produce the document and dock parts
- **AND** no viewport snapshot or composition counter SHALL exist in the root

#### Scenario: Render in custom-viewport mode
- **WHEN** the shell is constructed with the custom viewport
- **THEN** the viewport layout strategy SHALL own the visible snapshot and the dock-only reuse decision
- **AND** the root SHALL only forward the frame request

#### Scenario: A transcript cache must be invalidated
- **WHEN** a setting, block, width, or extension change requires re-layout
- **THEN** the caller SHALL invalidate the transcript document with a named reason
- **AND** the document SHALL evict only what that reason requires

### Requirement: The composition root constructs and returns
The composition root SHALL resolve paths, construct services, construct the backend, construct the presenter, and return the application. It SHALL NOT own timers, heartbeats, state machines, or runtime event handling, and SHALL NOT rely on a reference that is bound only after construction. Runtime behavior that composition needs SHALL live in a class under an owning module that composition constructs and disposes.

#### Scenario: Resident tab bridge behavior is needed
- **WHEN** composition binds the resident tab bridge
- **THEN** it SHALL construct the session shell's resident-tab coordinator and pass it through the shell options
- **AND** the auto-name, rename, route, stop, and status derivation logic SHALL live in that coordinator

#### Scenario: Session runtime identities must be refreshed
- **WHEN** composition registers session runtime identities
- **THEN** it SHALL construct a registry object with explicit start and dispose
- **AND** the composition root SHALL hold no identity map or refresh timer of its own

#### Scenario: A service needs an object constructed later
- **WHEN** a service built before the backend or presenter needs one of them
- **THEN** composition SHALL pass the object after construction through a typed setter or option
- **AND** no closure SHALL read a `let` binding that is assigned later
