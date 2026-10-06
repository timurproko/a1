## MODIFIED Requirements

### Requirement: Bare-A1 dialogs share one shortcut-hint presentation

Every shortcut-bearing modal, selector, dialog, nested flow, custom input/editor, confirmation, authentication surface, startup trust selector, extension-hosted modal, operation dialog, and owned full-screen dialog presented by bare A1 SHALL use the shared shortcut-row presentation. Full-screen dialogs include Settings and the shared Changelog/Hotkeys/Session Info reference screen. Effective shortcut labels SHALL continue to come from the bindings and platform rules used by the corresponding action, then use common display capitalization while action names remain lowercase, except that an A1-rendered entry which dismisses the active surface SHALL use the canonical display label and action `Esc close`. Applying the presentation SHALL NOT change focus, navigation, search, editing, save/confirm behavior, cancellation, operation abortion, viewport behavior, transitions, restoration, or disposal.

Every A1-rendered dismissible surface SHALL include exactly one `Esc close` entry as the final entry in its active standing or state-specific shortcut guidance. This requirement applies when dismissal silently closes a top-level surface, aborts an operation while closing its progress dialog, exits startup, or closes a nested state and restores its parent; those different outcomes SHALL NOT change the visible close wording. A surface that previously omitted dismissal guidance SHALL add the entry. Additional effective or implicit aliases SHALL remain undisclosed by this canonical entry. When available width can contain the complete entry, wrapping, clipping, state replacement, or optional controls SHALL NOT omit or partially clip `Esc close`; narrower rendering SHALL remain ANSI-safe. Escape uses outside active-surface dismissal, including ordinary editor autocomplete clearing, shell interruption, and non-dialog help, SHALL remain outside this wording rule.

Every such shortcut row SHALL begin at the same visible display column as its dialog's heading or title, retaining that surface's established heading inset rather than following its list-marker, form-field, editor, or content inset. A nested flow SHALL align to its own local heading. Wrapping or clipping SHALL preserve the surface's existing policy without introducing a second leading indent. The explicit `a1 pi` comparison profile SHALL retain its pinned dialog presentation. Ordinary shell help, status, transcript, and footer surfaces SHALL remain outside this dialog styling rule.

#### Scenario: Open a bare-A1 modal
- **WHEN** any shortcut-bearing bare-A1 modal node is presented
- **THEN** its instruction row SHALL show display-capitalized shortcut labels and lowercase action names in distinct semantic colors
- **AND** adjacent shortcut entries SHALL use whitespace without middle-dot or bullet separators
- **AND** the instruction row SHALL start at the same display column as the modal heading rather than the content rows
- **AND** its final dismissal entry SHALL read exactly `Esc close`

#### Scenario: Open a full-screen owned dialog
- **WHEN** Settings, Changelog, Hotkeys, or Session Info is presented as a full-screen owned route
- **THEN** its standing shortcut row SHALL use distinct key/action colors and whitespace-only entry gaps
- **AND** its first visible cell SHALL align with the full-screen title's established inset
- **AND** its final dismissal entry SHALL read exactly `Esc close`
- **AND** its frame, content, scrolling, search, and close behavior SHALL remain unchanged

#### Scenario: Open a nested or extension-hosted modal
- **WHEN** a modal flow replaces its parent with a nested confirmation, input, editor, authentication, or extension-hosted surface
- **THEN** every A1-rendered shortcut-bearing depth SHALL retain the same shared hint presentation
- **AND** each hint SHALL align with its local heading even when its input or editor uses a different content inset
- **AND** the active depth's final dismissal entry SHALL read exactly `Esc close`
- **AND** completing, cancelling, or returning SHALL preserve the existing transition and focus-restoration behavior

#### Scenario: Show a cancellable operation dialog
- **WHEN** bare A1 presents an operation progress dialog whose Escape path aborts the operation and closes the dialog
- **THEN** its dismissal guidance SHALL read exactly `Esc close`
- **AND** pressing Escape SHALL retain the operation's existing abort, result, teardown, and parent-restoration behavior

#### Scenario: Add omitted close guidance
- **WHEN** Session Tree, Resume Session, or another dismissible dialog previously rendered action guidance without its available close action
- **THEN** the guidance SHALL include exactly one final `Esc close` entry
- **AND** all existing action entries and their order before the close entry SHALL remain unchanged

#### Scenario: Keep close guidance visible
- **WHEN** a dismissible dialog has enough width to render the complete `Esc close` entry but its other shortcut guidance overflows
- **THEN** `Esc close` SHALL remain complete and visible
- **AND** the remaining entries SHALL follow that surface's established wrapping or clipping policy

#### Scenario: Keep content indentation independent
- **WHEN** a selector uses leading cells for an arrow, marker, field label, tree depth, or editor body
- **THEN** those content cells SHALL remain in their established columns
- **AND** the shortcut row SHALL align with the heading instead of inheriting the content indentation

#### Scenario: Resolve customized or platform-specific bindings
- **WHEN** a non-dismissal modal action has a customized binding, no effective binding, or a platform-specific display label
- **THEN** its hint SHALL use the same effective label and omission behavior as dispatch
- **AND** styling and alignment SHALL NOT manufacture a default key or change the invoked action
- **AND** the canonical `Esc close` entry SHALL NOT advertise additional effective or implicit close aliases

#### Scenario: Ask for project trust before resources load
- **WHEN** the pre-resource trust selector is presented
- **THEN** its fixed-color shortcut row SHALL provide the same distinct key/action roles, separator-free spacing, heading alignment, and final `Esc close` entry
- **AND** rendering it SHALL NOT load project settings, themes, extensions, packages, skills, or post-trust Pi components

#### Scenario: Preserve dismissal outcomes
- **WHEN** `Esc close` is shown for a top-level close, operation abort, startup exit, or nested return
- **THEN** pressing Escape SHALL retain that surface's existing cancellation, abortion, restoration, focus, and disposal outcome
- **AND** no selection, submission, save, or new generic cancellation message SHALL be introduced

#### Scenario: Use the comparison profile
- **WHEN** the same modal route is presented through `a1 pi`
- **THEN** its pinned shortcut presentation and geometry SHALL remain unchanged by the bare-A1 customization

#### Scenario: Audit dialog completeness
- **WHEN** modal inventory and owned full-screen route coverage run
- **THEN** every A1-rendered dismissible bare-A1 dialog node or route SHALL be mapped to the shared presentation or the isolated pre-resource equivalent
- **AND** a missing or non-final close entry, dismissal wording other than exact `Esc close`, duplicate close entry, heading/hint start-column mismatch, inconsistent key/action casing, whole-line single-color hint, or middle-dot/bullet entry separator SHALL fail coverage
