# Spec Delta

## ADDED Requirements

### Requirement: Viewed resident A1 matches direct A1 interaction semantics
Except for declared resident-tab controls and lifecycle differences, a viewed resident A1 child SHALL produce the same semantic action and visible child result as `a1 solo` for equivalent keyboard, text/IME, paste, focus, mouse, resize, dialog, extension text-UI, completion, history, command, and attachment input on the same platform and effective profile.

#### Scenario: Edit an ordinary prompt
- **WHEN** equivalent typing, Unicode, multiline, cursor, word-motion, Home/End, deletion, undo/redo, history, and completion inputs are sent to an ordinary prompt in resident and solo A1
- **THEN** the prompt text, cursor, selection, completion state, and invoked actions SHALL be equivalent after accounting for the resident strip row

#### Scenario: Interact with a modal or extension surface
- **WHEN** a built-in dialog, trust or permission prompt, replacement editor, or certified extension text UI owns input in resident A1
- **THEN** its keys, paste, pointer behavior, cancellation, focus, and resulting presentation SHALL match the same surface in solo A1

#### Scenario: Send the first input after switching tabs
- **WHEN** the user switches to a resident tab and immediately sends a key, paste, click, focus event, or resize
- **THEN** that input SHALL reach the newly viewed child exactly once in order and SHALL NOT visibly wait for a takeover gesture

### Requirement: Resident selection and clipboard behavior matches direct A1
Every child row and surface SHALL retain the same selectable or non-selectable ownership as `a1 solo`. Equivalent prompt, transcript, status/footer, dialog, and extension gestures SHALL produce equivalent selection paint and copied text, while resident strip cells SHALL remain attach-owned controls and SHALL NOT enter child selection or clipboard content.

#### Scenario: Select and copy child content
- **WHEN** the user performs an equivalent drag, reverse drag, double click, triple click, selection extension, or scrolling selection over viewed child content in resident and solo A1
- **THEN** resident A1 SHALL paint the same child cells and copy the same semantic text without strip content, padding, controls, or stale rows

#### Scenario: Copy with Ctrl+C
- **WHEN** a copyable prompt or response selection owns `Ctrl+C` in a resident tab
- **THEN** the first `Ctrl+C` SHALL invoke the same copy and selection-clearing behavior as solo A1 and SHALL leave the attach client connected

#### Scenario: Paste with Ctrl+V on first use
- **WHEN** the ordinary prompt owns the first `Ctrl+V` after resident startup and the supported clipboard contains readable content
- **THEN** resident A1 SHALL insert that content exactly once under the same bounded acquisition and preparation behavior as solo A1 without requiring a prior clipboard or focus action

#### Scenario: Receive terminal-provided paste
- **WHEN** the outer terminal supplies a bracketed, right-click, multiline, or Unicode paste
- **THEN** the viewed child SHALL receive one complete paste with the same normalization, ownership, insertion, feedback, and capacity behavior as solo A1

### Requirement: Resident shortcuts use the effective A1 shortcut contract
After resolving active tab actions, resident A1 SHALL preserve every supported effective A1 key identity and modifier and SHALL invoke the same action as `a1 solo`. Shortcut help, hints, dialogs, and `/hotkeys` SHALL derive child actions from the same effective declarations, with tab actions listed separately and consumed only in their active scope.

#### Scenario: Use default prompt shortcuts
- **WHEN** the user invokes any supported default A1 prompt or viewport shortcut in a resident tab
- **THEN** the same child action SHALL run exactly once as in solo A1 and no encoded key fragment SHALL enter the prompt

#### Scenario: Use customized shortcuts
- **WHEN** `keybindings.json` changes an A1 or tab action without a conflict
- **THEN** resident dispatch and every shortcut presentation SHALL show and invoke the effective assignment exactly as solo dispatch plus the separately resolved tab actions

#### Scenario: Tab action wins only in tab scope
- **WHEN** an input resolves to an active resident tab action
- **THEN** the attach client SHALL invoke that action without forwarding the input, while unmatched and disabled tab bindings SHALL continue unchanged to the child

### Requirement: Resident tabs make independent concurrent progress
Every resident child SHALL continue engine work, render scheduling, pseudoterminal output, and retained terminal-state updates independently of which tab is viewed and independently of another tab's input, rendering, lifecycle work, or slow client. Switching SHALL expose the target's newest partial presentation immediately rather than a completion-time catch-up.

#### Scenario: Several agents stream simultaneously
- **WHEN** several resident agents generate streamed replies at the same time while the user repeatedly switches tabs
- **THEN** every child SHALL continue producing and retaining intermediate frames and each selected tab SHALL show its current partial reply without waiting for another agent or for its own turn to settle

#### Scenario: Lifecycle work overlaps active input
- **WHEN** tab create, close, restart, rename, reorder, recovery, or registry persistence overlaps input and streaming in another tab
- **THEN** the unrelated tab SHALL retain solo-equivalent input and presentation responsiveness

#### Scenario: One attached client is slow
- **WHEN** one client or surface lane cannot drain while multiple tabs continue working
- **THEN** no child, holder, other client, or lifecycle-independent input path SHALL wait for that client

### Requirement: Double Ctrl+C reliably detaches the resident interface
The attach client SHALL recognize the semantic outer-terminal `Ctrl+C` event across supported terminal encodings before representation can obscure its identity. The first press SHALL reach the child exactly once; a second press inside the clear/exit interval SHALL restore the parent terminal and detach without reaching or terminating any child.

#### Scenario: Leave resident A1 from an ordinary prompt
- **WHEN** the user presses `Ctrl+C` twice inside the clear/exit interval
- **THEN** the first press SHALL retain its solo A1 clear, copy, or interrupt meaning, the second SHALL close the attached A1 interface, and every resident agent SHALL keep running

#### Scenario: Return after detach
- **WHEN** the user detaches with double `Ctrl+C` and later runs bare `a1`
- **THEN** A1 SHALL reattach to the same running tabs with their work and retained presentations advanced during the absence

#### Scenario: Press Ctrl+C outside the interval
- **WHEN** two `Ctrl+C` presses are separated by at least the clear/exit interval or by another completed input sequence
- **THEN** both presses SHALL reach the child independently and the attach client SHALL remain connected
