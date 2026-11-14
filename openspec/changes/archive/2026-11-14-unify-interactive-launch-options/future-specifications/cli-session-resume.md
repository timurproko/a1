## MODIFIED Requirements

### Requirement: Normal A1 accepts one explicit session selection grammar

Ordinary and pi-named normal-product entries SHALL share the pinned session selectors through the existing session services: new default, continue, resume, explicit path/ID, custom session ID, fork, storage override, display name and no-persistence. Ordinary prompts SHALL retain the explicit literal boundary; these session options SHALL NOT introduce a bare resume subcommand or comparison fallback. Each selector SHALL enforce its documented value, ID and combination constraints plus explicit A1 writer admission. Valid session launch options MAY combine with the other documented execution options; standalone storage selection SHALL be supported for a new session.

Persistent selections SHALL preserve profile isolation, actual history/active context and pinned effective-cwd semantics. In-memory selections SHALL remain genuinely nonpersistent without forged transcript files, file locks or resume hints; only specifically approved durable-capability limitations MAY differ. CLI/env/trusted-setting/default storage precedence and trust for the effective cwd SHALL be explicit. Every applicable interactive, print, JSON, RPC and programmatic path SHALL use the same writer-owning construction, replacement and disposal; raw upstream construction SHALL NOT bypass A1 guarantees.

#### Scenario: Select an existing session by ID

- **WHEN** either entry selects a saved A1 session by ID
- **THEN** the shared service SHALL restore it under the canonical writer guard rather than no-op or create an ID-named new file

#### Scenario: Supply a custom directory in either order

- **WHEN** valid storage and explicit-session selectors are supplied in supported order
- **THEN** both entries SHALL resolve the same target and effective storage

#### Scenario: Malformed session launch

- **WHEN** required values, ID syntax, duplicate singleton or selector combinations are invalid
- **THEN** focused nonzero failure SHALL precede runtime admission without overwriting or silently creating history

#### Scenario: Inspect help without launching

- **WHEN** standalone help is requested
- **THEN** the complete implemented session grammar SHALL be described without factories or session startup

#### Scenario: Resume an idle session

- **WHEN** an existing selected session has no writer
- **THEN** the applicable transport SHALL restore that session and context through the same services

#### Scenario: Launch selects a held session

- **WHEN** any transport selects a file held by a live or unverifiable participating writer
- **THEN** admission SHALL fail safely without a second writer or ownership stealing

#### Scenario: Continue and explicit fork

- **WHEN** continue or fork is selected with valid pinned constraints
- **THEN** the current-directory continuation or independent new-ID fork SHALL preserve the documented history/cwd semantics and source data

#### Scenario: Custom ID and name

- **WHEN** a valid custom session ID and name are supplied
- **THEN** the service SHALL open the current-directory existing ID or safely create it, enforcing collision/selector constraints and normalized naming

#### Scenario: No-persistence execution

- **WHEN** an in-memory session is selected
- **THEN** the real session ID and runtime lifecycle SHALL remain available without writing a session JSONL file or suggesting resumability
- **AND** specifically approved storage-dependent API limitations SHALL be explicit rather than based on executable name

## ADDED Requirements

### Requirement: Session contract evidence spans public execution and programmatic boundaries

Focused conformance SHALL exercise every documented selector and combination, supported session entry/message/projection format, replacement/cancellation, persistence choice and applicable transport through real SDK and public packaged/development boundaries. Tests SHALL use disposable history and deterministic providers without personal sessions, accounts or live fleet state. Method presence, parser success and fabricated session files SHALL NOT stand in for correct model context or ownership.

#### Scenario: Transport and SDK replacement

- **WHEN** a real public session is switched, forked, cloned, imported, reloaded or disposed through an applicable transport or A1 SDK host
- **THEN** identity/context, startup/shutdown reasons, current resource trust, subscriptions and writer lifetime SHALL match the approved pinned contract
- **AND** failed or cancelled replacement SHALL not expose a stale context or modify another session
