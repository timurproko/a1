## ADDED Requirements

### Requirement: The owned shell announces an available A1 release in pinned Pi's style

When the startup release check reports a newer A1 release, `a1 pi` SHALL render pinned Pi's update notification shape in the transcript: a spacer, a warning-coloured dynamic border, the bold warning title `Update Available`, the muted line `New version <version> is available. Run ` followed by the accent command, and a closing warning-coloured dynamic border. The command SHALL be `a1 update` for a stable release and `a1 update --develop` for a development release. A stable release notice SHALL add a muted `Changelog: ` line with an accent link to that version's GitHub Release, emitted as a terminal hyperlink when the terminal supports hyperlinks; a development release notice SHALL omit it. In `a1 pi` the notice SHALL render after the banner and loaded resources and before the extension-package update notice, and a result that arrives after the first frame SHALL be appended to the transcript with a render requested. Bare `a1` SHALL instead dock the notice in the bottom-aligned viewport tail directly above the live `Working` status (directly above the editor when idle), so it never displaces transcript content: the same title, instruction, and changelog wording on the prompt band background spanning the full content width, without borders, and with a close control `✕` at the right end of the title row. Clicking the close control SHALL hide the notice for the rest of the session; the next launch SHALL show it again while the release is still newer. The notice SHALL be informational only: it SHALL take no input, block no interaction, and never start an update.

#### Scenario: Announce a stable release
- **WHEN** the startup check reports stable release `0.3.1`
- **THEN** the owned UI SHALL render `Update Available`, `New version 0.3.1 is available. Run a1 update`, and a changelog link to `https://github.com/timurproko/a1/releases/tag/v0.3.1` between warning-coloured borders

#### Scenario: Announce a development release
- **WHEN** the startup check reports development release `0.3.1-dev.652`
- **THEN** the notice SHALL name `a1 update --develop` and SHALL contain no changelog line

#### Scenario: Result arrives after the first frame
- **WHEN** the background registry query completes after the owned UI is already interactive
- **THEN** the notice SHALL appear in the transcript without clearing the editor, moving focus, or interrupting a running turn

#### Scenario: Dock and dismiss in bare A1
- **WHEN** bare `a1` receives a newer release while a turn is running
- **THEN** the notice SHALL appear below the transcript and above `Working` without moving transcript rows
- **AND** clicking its `✕` SHALL remove it until the next launch

#### Scenario: Both update notices apply
- **WHEN** an A1 release and extension-package updates are both available in `a1 pi`
- **THEN** the A1 notice SHALL render before the `Package Updates Available` notice

#### Scenario: No newer release
- **WHEN** the startup check is skipped, fails, or reports no newer release
- **THEN** no A1 update notice SHALL render
