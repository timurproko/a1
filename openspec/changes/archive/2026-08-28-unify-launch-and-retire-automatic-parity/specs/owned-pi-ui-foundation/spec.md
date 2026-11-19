## ADDED Requirements

### Requirement: Parity with pinned Pi is established by the reader
A1's presentation SHALL match pinned Pi for visible rows, ANSI styling, colors, spacing, wrapping, component order, focus, editor state, selectors, dialogs, status/footer state, command availability and outcomes, prompt effects, event transitions, terminal progress, resize, errors, extension surfaces, and lifecycle behavior. Parity SHALL be established by a person comparing `a1 pi` with pinned Pi in the same terminal and recorded as manual acceptance. Automated comparison of the two SHALL NOT be required, because both producers share every terminal condition: a fault that collapses one collapses the other, and the run then reports agreement rather than fidelity.

#### Scenario: Rendering differs
- **WHEN** the reader sees a different visible row, style, color, spacing, wrapping, selector, dialog, status, footer, or extension surface between `a1 pi` and pinned Pi
- **THEN** the difference SHALL be recorded as a parity finding and SHALL block acceptance of the change that introduced it

#### Scenario: Workflow differs
- **WHEN** a command, keybinding, prompt, queue action, clipboard action, model/session/settings flow, extension interaction, or shutdown path has a different observable outcome
- **THEN** the difference SHALL be recorded as a parity finding and SHALL block acceptance of the change that introduced it

#### Scenario: Compare the two sessions
- **WHEN** a change touches rendering, layout, input, or a pinned surface
- **THEN** `a1 pi` and pinned Pi SHALL be run in the same terminal, under the same profile and geometry, and compared by the reader before that change is accepted

#### Scenario: Evidence has only one producer
- **WHEN** expected and actual results are both derived from A1 implementation code or A1-authored synthetic state
- **THEN** the result SHALL be classified as regression evidence and SHALL NOT satisfy parity

## REMOVED Requirements

### Requirement: The pinned Pi version has exact observable parity before product work
**Reason**: Replaced by reader-established parity. Its scenarios required an automated gate that drove
pinned Pi and A1 through one terminal and compared checkpoints; a condition affecting both producers —
a collapsed colour depth, a missing capability, a truncated viewport — produced two matching wrong
screens and a passing run, while the differences a reader actually reports were never among the things
it could express.
**Migration**: The reader compares `a1 pi` with pinned Pi when a change warrants it, and the result is
recorded as that change's manual acceptance.
