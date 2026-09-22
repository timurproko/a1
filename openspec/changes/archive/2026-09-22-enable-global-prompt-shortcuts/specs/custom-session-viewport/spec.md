## ADDED Requirements

### Requirement: Content interaction leaves the ordinary prompt keyboard-ready
On the default bare-A1 session screen, pointer interaction with exposed transcript content, empty viewport space, the scrollbar, a sticky prompt, or the jump-to-bottom control SHALL NOT require a subsequent click inside the ordinary prompt before its editing shortcuts can be used. After the pointer action, the ordinary prompt SHALL remain or become the keyboard target without changing its draft, caret, selection, atomic item focus, history position, autocomplete state, undo/redo state, or pending paste reservations solely because focus was retained or restored.

Pointer ownership SHALL remain independent of keyboard ownership: an active pointer gesture SHALL retain its established owner through release. A focused modal, nested overlay, or replacement input SHALL retain keyboard ownership and SHALL NOT expose the hidden ordinary prompt's editing shortcuts. The pinned `a1 pi` comparison profile SHALL retain its existing focus and input behavior.

#### Scenario: Paste after clicking transcript content
- **WHEN** the default ordinary prompt is present, the reader clicks transcript content without opening another input surface, and then invokes the effective prompt paste action
- **THEN** the paste SHALL be admitted to the ordinary prompt without requiring a prompt click
- **AND** the transcript click SHALL NOT move the prompt caret or otherwise change the draft before the paste

#### Scenario: Edit after a viewport interaction
- **WHEN** the reader clicks empty content, scrolls with the wheel, uses the scrollbar, activates a sticky prompt, or activates jump-to-bottom and then invokes an effective ordinary-prompt editing shortcut
- **THEN** the shortcut SHALL reach the ordinary prompt exactly once
- **AND** the preceding pointer interaction SHALL retain its declared viewport effect

#### Scenario: Copy a transcript selection
- **WHEN** the reader selects semantic transcript text and invokes the transcript copy action
- **THEN** the selected transcript text SHALL be copied exactly once using the existing transcript-copy behavior
- **AND** the same chord SHALL NOT copy, cut, or otherwise edit the ordinary prompt

#### Scenario: Keep prompt state while restoring keyboard ownership
- **WHEN** the prompt has a draft, caret position, selection, undo or redo history, autocomplete presentation, atomic item focus, or pending paste and the reader interacts with content
- **THEN** restoring or retaining ordinary prompt keyboard ownership SHALL preserve that state
- **AND** only a subsequently invoked action MAY change the state according to its existing semantics

#### Scenario: Preserve another input owner
- **WHEN** a modal, nested overlay, or replacement input has keyboard focus and the reader interacts with exposed transcript content
- **THEN** subsequent editing, paste, save, navigation, and cancel shortcuts SHALL retain that surface's established behavior
- **AND** the hidden ordinary prompt SHALL NOT intercept them

#### Scenario: Preserve comparison focus behavior
- **WHEN** the equivalent interaction occurs in `a1 pi`
- **THEN** the pinned comparison profile SHALL retain its existing keyboard focus, pointer, and shortcut routing behavior
