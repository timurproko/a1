## MODIFIED Requirements

### Requirement: Update does not end a working session
The update subcommand SHALL complete while other A1 sessions are working, and SHALL NOT ask them
to stop or wait for them to finish. A session already running SHALL keep the release it started
on and SHALL be unaffected in its transcript, its terminal, and the agent turn in progress. The
release the update successfully installs and activates SHALL be what every subsequent ordinary
launch starts on, including when older retained cohorts remain live or concurrent launches observe
the activation handoff.

Where a running session cannot be preserved because it runs from the package being replaced, the
update SHALL say which session it is ending and why, before ending it.

#### Scenario: A session is working when an update runs
- **WHEN** the user updates in one terminal while an agent turn streams in another
- **THEN** the update SHALL install and report success
- **AND** the working session SHALL continue its turn, keep its transcript, and keep accepting
  input

#### Scenario: The next launch after an update
- **WHEN** a new session starts after an update, while an older session is still working
- **THEN** the new session SHALL start on the installed release without release-coordination diagnostics
- **AND** the older session SHALL remain on the release it started on

#### Scenario: Several launches overlap successful activation
- **WHEN** interactive launches overlap the successful activation of an installed release
- **THEN** each new invocation SHALL converge within a bounded interval on an eligible active release
- **AND** no invocation SHALL require closure of a retained session, machine restart, process discovery, or state deletion

#### Scenario: A session must be ended to replace the package
- **WHEN** the running session cannot be preserved because it runs from the package being replaced
- **THEN** the update SHALL report that it is ending that session and why before doing so
