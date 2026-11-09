## ADDED Requirements

### Requirement: Bare A1 publishes the current session as its terminal title
Bare A1 SHALL publish its authoritative session name through the standard terminal-title channel after terminal startup. It SHALL use exactly the safe single-line normalized name, or the product display name `a1` when no usable name exists, without adding a path, prefix, or suffix. This is a declared bare-A1 replacement; the explicit `a1 pi` comparison profile SHALL receive no new automatic title behavior.

#### Scenario: Start an unnamed session
- **WHEN** bare A1 starts a session with no name while the terminal retains a launcher title such as `npm root`
- **THEN** A1 SHALL publish `a1` as the terminal title after the terminal starts

#### Scenario: Resume a named session
- **WHEN** bare A1 starts or resumes a session named `home dir settings`
- **THEN** A1 SHALL publish exactly `home dir settings` as the terminal title

#### Scenario: Run the comparison profile
- **WHEN** the explicit `a1 pi` comparison profile starts or changes session name
- **THEN** the bare-A1 automatic session-title behavior SHALL remain disabled
- **AND** existing extension title behavior SHALL remain available

### Requirement: Session-derived title text cannot replay terminal controls
Bare A1 SHALL replace runs of C0/C1 controls, DEL, and Unicode line/paragraph separators in a session-derived title with a space and trim outer whitespace. It SHALL preserve other Unicode text, ordinary internal spaces, emoji, and emoji joiners. Empty normalized text SHALL use `a1`. Normalization SHALL affect only terminal presentation, not the persisted name.

#### Scenario: A saved name contains terminal controls
- **WHEN** a session name includes escape, bell, carriage-return, newline, tab, or C1 control characters
- **THEN** its published title SHALL contain none of those controls and SHALL remain one line
- **AND** its persisted name SHALL remain unchanged

#### Scenario: A saved name contains ordinary Unicode
- **WHEN** the authoritative session name is `  café 👩‍💻 work  `
- **THEN** the published title SHALL be exactly `café 👩‍💻 work`

#### Scenario: A saved name is unusable after normalization
- **WHEN** a session name is absent, whitespace-only, or consists only of replaced controls and whitespace
- **THEN** the published terminal title SHALL be `a1`

### Requirement: Session-title publication follows authoritative name and binding changes
Bare A1 SHALL update the title when the normalized authoritative session name changes, including names changed through public Pi metadata events outside the owned naming command. New, resumed, forked, cloned, or otherwise rebound sessions SHALL expose their current name or fallback. Unchanged normalized titles SHALL NOT be rewritten by ordinary view, transcript, status, model, usage, or streaming updates, except on presenter activation.

#### Scenario: Rename through the owned command
- **WHEN** the user submits `/name Direct Name` and the session manager normalizes it to `direct name`
- **THEN** bare A1 SHALL publish `direct name` without requiring a restart
- **AND** duplicate notifications for that same resulting name SHALL NOT duplicate title writes

#### Scenario: Rename a second time
- **WHEN** the user changes the active session name from `direct name` to `next name`
- **THEN** bare A1 SHALL publish `next name` once for that change

#### Scenario: Public session metadata changes outside the owned command
- **WHEN** Pi emits a public session-info change event after its session manager changes the current name
- **THEN** the session view SHALL expose the current manager name and bare A1 SHALL publish its normalized title
- **AND** a conflicting event payload SHALL NOT override the authoritative manager name

#### Scenario: Clear the authoritative name
- **WHEN** a public session-info change clears the session manager's name
- **THEN** the authoritative view SHALL retain its existing unnamed representation rather than inventing an engine-level product name
- **AND** bare A1's terminal title SHALL become `a1`

#### Scenario: Bind another session
- **WHEN** bare A1 creates, resumes, forks, clones, or switches to a different bound session
- **THEN** the terminal title SHALL reflect that session's normalized authoritative name or `a1` fallback
- **AND** an unchanged resulting logical title SHALL NOT require a redundant write

#### Scenario: Continue work without renaming
- **WHEN** transcript, status, model, usage, streaming, or duplicate session-view updates leave the normalized session name unchanged
- **THEN** bare A1 SHALL NOT rewrite its terminal title

### Requirement: Core titles respect active presentation and extension overrides
Only the active attached presenter SHALL publish terminal-wide titles. Activating an already-started bare-A1 presenter SHALL republish its current core session title even when unchanged. An extension title override SHALL survive unrelated updates while the core logical title is unchanged; a changed core title or presenter activation MAY replace it. Closing, disconnecting, or disposing an inactive presenter SHALL NOT overwrite the active title.

#### Scenario: Change an inactive presenter's name
- **WHEN** an inactive presenter starts or receives a session-name change
- **THEN** it SHALL NOT write a terminal-wide title
- **AND** later activation SHALL publish its latest authoritative normalized session title

#### Scenario: Reattach an already-started presenter
- **WHEN** a terminal host attaches one named presenter and later reattaches another already-started named presenter
- **THEN** each activation SHALL publish the incoming presenter's current title even if that presenter previously published the same title

#### Scenario: Attach before terminal startup
- **WHEN** the host attaches a presenter before that presenter starts its terminal
- **THEN** the attachment SHALL NOT publish a premature title
- **AND** startup SHALL publish the initial title once after the terminal is running

#### Scenario: Preserve an extension's temporary title
- **WHEN** an extension sets the title to `Working...` after core publication and unrelated view or status updates follow
- **THEN** the core title synchronizer SHALL leave `Working...` untouched
- **AND** a later session-name change or presenter reactivation SHALL restore the current core session title

#### Scenario: Remove an inactive presenter
- **WHEN** an inactive presenter is closed, disconnected, or disposed while another presenter is attached
- **THEN** it SHALL NOT overwrite that active presenter's title
