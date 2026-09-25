## ADDED Requirements

### Requirement: Project-trust startup warnings use the prompt-adjacent notice
Bare A1 SHALL classify a bounded warning produced by unavailable interaction, input end, or failed startup trust resolution separately from ordinary engine startup diagnostics. After the trust selector restores the terminal and the restricted shell starts, the warning SHALL appear through the existing warning-colored transient dock notice immediately above the editor group. It SHALL remain outside transcript content, scrolling, selection, copy, prompt navigation, and persisted session content, and SHALL follow the existing dock-notice replacement and dismissal lifecycle. The pinned `a1 pi` route SHALL retain its startup-diagnostic placement.

#### Scenario: Fail to obtain a trust decision
- **WHEN** startup cannot obtain a required trust decision because interaction is unavailable, input ends, or trust resolution fails
- **THEN** bare A1 SHALL continue with project resources withheld
- **AND** one `Warning:` notice explaining the fail-closed result SHALL appear in the dock above the editor
- **AND** the warning SHALL not appear at the top of the empty transcript viewport

#### Scenario: Preserve comparison placement
- **WHEN** the same project-trust startup warning is presented through `a1 pi`
- **THEN** it SHALL retain the pinned startup-diagnostic placement instead of using bare A1's notice dock

## MODIFIED Requirements

### Requirement: Pre-resource project trust uses a compact bottom dialog
Bare A1 SHALL present an interactive pre-resource trust decision as a vertically compact, ruled dialog anchored to the bottom of the bounded startup surface. Its top and bottom rules SHALL use the fixed dark-theme border blue and span the full available terminal width. The explanation SHALL read exactly `This allows to load project settings and resources, install missing project packages, and execute project extensions.` and SHALL NOT insert the product name. The dialog SHALL use the established bare-A1 modal hierarchy for its title, working-directory context, explanation, selected and unselected option rows, and semantic shortcut hints while remaining implemented only from fixed startup-safe wording, ANSI roles, terminal dimensions, and bounded rendering helpers. It SHALL NOT load or consult project settings, themes, extensions, prompts, packages, skills, or post-trust components.

The dialog SHALL remain readable at supported terminal sizes, SHALL prioritize the title, path, choices, and actionable controls when height is constrained, and SHALL clip or wrap without replaying untrusted terminal control content. Completion, interruption, input end, and errors SHALL clear the owned startup frame and restore raw mode, cursor state, and the parent terminal exactly once.

#### Scenario: Present trust at the bottom
- **WHEN** an interactive launch needs a project-trust decision in a terminal with sufficient rows
- **THEN** A1 SHALL render one vertically compact ruled trust dialog against the bottom of the startup surface
- **AND** its blue top and bottom rules SHALL span the full available terminal width
- **AND** it SHALL not render the trust content as a loose page at the top-left

#### Scenario: Match ordinary selector hierarchy
- **WHEN** the trust dialog is visible
- **THEN** its title, path context, option list, selected arrow, and key/action hints SHALL use the same visual hierarchy as the bare-A1 Models and Thinking dialog family
- **AND** its explanation SHALL use the exact product-neutral wording without `a1`
- **AND** its shortcut hint SHALL align with its local heading

#### Scenario: Constrain a small terminal
- **WHEN** the available rows or columns cannot show the preferred dialog geometry
- **THEN** A1 SHALL use a deterministic bounded fallback that retains the decision choices and controls
- **AND** clipping or wrapping SHALL remain ANSI-safe

#### Scenario: Keep the trust dialog startup-safe
- **WHEN** the dialog renders before a trust decision exists
- **THEN** no project setting, theme, extension, prompt, package, skill, or post-trust component SHALL be loaded or consulted

#### Scenario: Exit without a trust decision
- **WHEN** the user presses Escape while the bare-A1 trust dialog is active
- **THEN** A1 SHALL restore the parent terminal and terminate startup without constructing the owned shell
- **AND** A1 SHALL NOT infer, persist, or activate either trust decision

#### Scenario: Operate and restore the dialog
- **WHEN** the user navigates, confirms, exits, interrupts, or the input stream ends or fails
- **THEN** arrows and Tab SHALL move selection and Enter SHALL confirm one of the two visible decisions
- **AND** Escape SHALL be advertised as the exit action while Ctrl+C remains a conventional interruption alias
- **AND** either exit path SHALL restore the terminal exactly once and abort startup without constructing the owned shell
- **AND** A1 SHALL restore raw mode, disable child-owned input/presentation modes, and show the cursor after leaving the alternate screen
- **AND** after that leave A1 SHALL write no row movement, erasure, prompt content, dialog rows, or bracketed-paste bytes into the parent buffer; the parent shell SHALL exclusively own its redraw

#### Scenario: Use the comparison profile
- **WHEN** the same launch runs through `a1 pi`
- **THEN** its pinned comparison presentation, including Escape/Ctrl+C cancellation, SHALL remain unchanged by the bare-A1 trust-dialog customization
