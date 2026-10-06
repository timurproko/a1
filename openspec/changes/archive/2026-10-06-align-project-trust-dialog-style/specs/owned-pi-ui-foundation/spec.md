## ADDED Requirements

### Requirement: Bare-A1 project-trust dialogs use the standard dialog hierarchy

Both the pre-resource startup trust selector and the in-session project-trust selector SHALL use the established bare-A1 dialog hierarchy. Titles and active selections SHALL use the accent role; top and bottom rules SHALL use the standard border role; ordinary path and label context SHALL remain muted; and shortcut rows SHALL use distinct dim key and muted action roles with whitespace-only entry gaps. The startup selector SHALL reproduce those fixed dark-dialog roles without consulting project settings, project themes, extensions, prompts, packages, skills, or post-trust components.

In the in-session selector, `Saved decision:` and `Current session:` SHALL remain muted labels while their decision values use the normal text role. Every selected trust option SHALL contain exactly one visible space between its arrow and label. The choice list SHALL NOT display a saved-decision checkmark; an exact saved choice SHALL instead be represented by the status line and initial active selection. The shortcut row SHALL be followed immediately by the bottom rule without an intervening blank row.

These presentation requirements SHALL NOT change trust outcomes, persistence, policy resolution, navigation, confirmation, exit/cancel behavior, terminal restoration, constrained-terminal fallback, or the explicit `a1 pi` comparison profile.

#### Scenario: Ask for trust before project resources load

- **WHEN** bare A1 presents the pre-resource startup trust selector
- **THEN** its title and selected option SHALL use the standard accent role
- **AND** its full-width rules SHALL use the standard border role
- **AND** its shortcut row SHALL present `↑↓ navigate`, `Enter select`, and `Esc exit` with the standard key/action roles and two-space entry gaps
- **AND** producing that frame SHALL not consult project-derived presentation or resources

#### Scenario: Show current project trust in-session

- **WHEN** bare A1 presents the in-session project-trust selector
- **THEN** the title, active selection, rules, and shortcut row SHALL use the same semantic roles as other standard dialogs
- **AND** `Saved decision:` and `Current session:` SHALL be muted while the value following each label SHALL use the normal text role
- **AND** the shortcut row SHALL be directly adjacent to the bottom rule

#### Scenario: Select a trust option

- **WHEN** any in-session trust option is active
- **THEN** its visible row SHALL render the arrow, exactly one space, and the option label
- **AND** no option SHALL reserve a saved-marker gap or display a checkmark

#### Scenario: Open with an exact saved choice

- **WHEN** an in-session trust option exactly represents the saved decision
- **THEN** that option SHALL receive the initial active selection
- **AND** the saved-decision status line SHALL communicate persistence without adding a second marker to the choice list

#### Scenario: Constrain or close a trust dialog

- **WHEN** either trust surface is resized, navigated, confirmed, cancelled, exited, interrupted, or disposed
- **THEN** its existing choices, responsive priority, key behavior, trust effects, and restoration lifecycle SHALL remain unchanged
- **AND** the `a1 pi` comparison presentation SHALL remain unchanged
