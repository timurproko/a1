## ADDED Requirements

### Requirement: Pre-resource project trust uses a compact bottom dialog
Bare A1 SHALL present an interactive pre-resource trust decision as a compact, ruled dialog anchored to the bottom of the bounded startup surface. The dialog SHALL use the established bare-A1 modal hierarchy for its title, working-directory context, explanation, selected and unselected option rows, and semantic shortcut hints while remaining implemented only from fixed startup-safe wording, ANSI roles, terminal dimensions, and bounded rendering helpers. It SHALL NOT load or consult project settings, themes, extensions, prompts, packages, skills, or post-trust components.

The dialog SHALL remain readable at supported terminal sizes, SHALL prioritize the title, path, choices, and actionable controls when height is constrained, and SHALL clip or wrap without replaying untrusted terminal control content. Completion, cancellation, interruption, input end, and errors SHALL clear the owned startup frame and restore raw mode, cursor state, and the parent terminal exactly once.

#### Scenario: Present trust at the bottom
- **WHEN** an interactive launch needs a project-trust decision in a terminal with sufficient rows
- **THEN** A1 SHALL render one compact ruled trust dialog against the bottom of the startup surface
- **AND** it SHALL not render the trust content as a loose page at the top-left

#### Scenario: Match ordinary selector hierarchy
- **WHEN** the trust dialog is visible
- **THEN** its title, path context, option list, selected arrow, and key/action hints SHALL use the same visual hierarchy as the bare-A1 Models and Thinking dialog family
- **AND** its shortcut hint SHALL align with its local heading

#### Scenario: Constrain a small terminal
- **WHEN** the available rows or columns cannot show the preferred dialog geometry
- **THEN** A1 SHALL use a deterministic bounded fallback that retains the decision choices and controls
- **AND** clipping or wrapping SHALL remain ANSI-safe

#### Scenario: Keep the trust dialog startup-safe
- **WHEN** the dialog renders before a trust decision exists
- **THEN** no project setting, theme, extension, prompt, package, skill, or post-trust component SHALL be loaded or consulted

#### Scenario: Operate and restore the dialog
- **WHEN** the user navigates, confirms, cancels, interrupts, or the input stream ends or fails
- **THEN** arrows and Tab SHALL move selection, Enter SHALL confirm, and Escape/Ctrl+C SHALL cancel
- **AND** A1 SHALL restore raw mode, cursor visibility, and the parent terminal exactly once without leaving dialog rows or a blank alternate surface behind

#### Scenario: Use the comparison profile
- **WHEN** the same launch runs through `a1 pi`
- **THEN** its pinned comparison presentation SHALL remain unchanged by the bare-A1 trust-dialog customization
