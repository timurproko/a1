## MODIFIED Requirements

### Requirement: Session concerns own their state, reset, and disposal
A session presenter SHALL be a coordinator over focused session concerns. Each concern SHALL own the fields it acts on, SHALL reset them itself when the session is replaced, and SHALL release them itself on disposal through one shared concern lifecycle contract. The presenter SHALL fan out session replacement and disposal in one declared order and SHALL NOT hold or reset another concern's state. A concern SHALL receive typed ports for what it needs and SHALL NOT receive the presenter, the render root, or an untyped bag of callbacks. Opening workflow selectors and dialogs, and binding prompt history to the current session, SHALL each be owned by a collaborator outside the presenter.

#### Scenario: The session is replaced
- **WHEN** the backend reports a new session generation
- **THEN** the presenter SHALL notify every concern in its declared order
- **AND** each concern SHALL clear only its own pending work, timers, and dialogs
- **AND** no concern state SHALL remain in the presenter

#### Scenario: A new orchestration behavior is added
- **WHEN** a change adds submission, routing, dialog, or lifecycle behavior to the session shell
- **THEN** it SHALL land in the concern that owns that behavior or in a new concern
- **AND** the presenter SHALL change only to register that concern

#### Scenario: A workflow needs a selector
- **WHEN** a workflow route opens a selector or dialog
- **THEN** the workflow router SHALL call the selectors collaborator
- **AND** the presenter SHALL NOT build the selector component itself

#### Scenario: The presenter is released
- **WHEN** the shell is disposed
- **THEN** every concern SHALL be disposed once in the declared order
- **AND** a second disposal SHALL be a no-op

### Requirement: A render root delegates to one layout strategy and owns no caches
A render root SHALL select one layout strategy at construction for the session's layout mode and SHALL NOT branch on the layout mode afterwards. Transcript blocks, their order, the per-block render cache, and the per-width document layouts SHALL have one owner that exposes named invalidation reasons; the render root SHALL request layouts from that owner and SHALL NOT clear caches itself. Dock chrome, workflow output, extension surfaces, and the input surface SHALL each be a component the root composes. The root SHALL expose a composed component to its callers rather than declare methods that only forward to it.

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

#### Scenario: A caller needs a composed component's behavior
- **WHEN** session code needs the prompt chip store or the viewport controller
- **THEN** it SHALL call the component the root exposes
- **AND** the root SHALL keep a method only when it combines that component with root state
