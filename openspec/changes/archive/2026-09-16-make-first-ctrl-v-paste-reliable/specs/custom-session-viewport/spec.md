## ADDED Requirements

### Requirement: The first keyboard paste does not require priming
When the ordinary bare-A1 prompt owns input and a supported clipboard contains readable nonempty content, the first `Ctrl+V` received after a cold session start SHALL admit one paste and insert that content exactly once. The keyboard route SHALL NOT require an earlier right-click paste, clipboard operation, focus change, repeated shortcut, or helper warm-up. Right-click and keyboard paste SHALL use equivalent admission, acquisition, preparation, deadline, and insertion behavior once their respective input gestures reach A1.

A received `Ctrl+V` SHALL be consumed only after the ordinary prompt has synchronously admitted its paste reservation. Cold keybinding activation, helper startup, an inconclusive first native read, and a safe platform fallback SHALL remain inside that one bounded transaction. Safe recovery SHALL use the original request identity and deadlines and SHALL NOT create another reservation, duplicate acquisition after content is known, or insert a late result after cancellation. If readable content still cannot be acquired, the request SHALL settle through the existing bounded failure policy rather than silently becoming dependent on a later mouse paste.

Terminal-owned nonempty bracketed paste SHALL remain a distinct exactly-once route and SHALL NOT trigger a native clipboard read. Modal and replacement surfaces SHALL retain paste ownership, and the pinned comparison profile SHALL remain unchanged.

#### Scenario: Paste external text on the first shortcut
- **WHEN** a cold bare-A1 session has its ordinary prompt focused, the supported clipboard contains readable external text, and the reader presses `Ctrl+V` for the first clipboard action of the session
- **THEN** A1 SHALL insert that text exactly once at the reserved prompt position
- **AND** no right-click, repeated shortcut, focus change, or previous A1 copy SHALL be required

#### Scenario: Preserve input around a cold first paste
- **WHEN** the reader presses the first `Ctrl+V` and continues typing while cold acquisition or preparation is pending
- **THEN** the paste SHALL resolve at its original reservation exactly once and the later typing SHALL remain in order
- **AND** prompt submission, viewport follow state, and unrelated input SHALL remain unchanged by paste admission

#### Scenario: Recover an inconclusive first native read
- **WHEN** the first native clipboard text read is empty or transiently unavailable but the supported platform fallback can read the nonempty clipboard within the request's acquisition deadline
- **THEN** the same paste transaction SHALL use that fallback and insert the content exactly once
- **AND** recovery SHALL NOT restart the acquisition or end-to-end deadline

#### Scenario: Settle a genuine first-paste failure
- **WHEN** neither the native reader nor its supported fallback can acquire readable content before the first paste transaction expires
- **THEN** the reservation SHALL be removed and the request SHALL settle through the existing non-modal failure behavior
- **AND** a later keyboard paste SHALL start independently without requiring a successful right-click paste to prime it

#### Scenario: Keep right-click from priming keyboard behavior
- **WHEN** the reader uses right-click paste before or after a keyboard paste attempt
- **THEN** that mouse action SHALL neither enable nor disable subsequent `Ctrl+V` recognition or acquisition
- **AND** each admitted gesture SHALL remain one distinct paste transaction

#### Scenario: Receive terminal-owned first paste
- **WHEN** the terminal consumes the first `Ctrl+V` and sends one nonempty bracketed paste payload
- **THEN** A1 SHALL prepare and insert that supplied payload exactly once without a native clipboard read
- **AND** input after the closing bracketed-paste delimiter SHALL remain in order

#### Scenario: Preserve other input owners
- **WHEN** a modal, replacement input, or pinned comparison profile owns input
- **THEN** the ordinary bare-A1 prompt SHALL NOT intercept its paste shortcut
- **AND** the owning surface's established paste behavior SHALL remain unchanged
