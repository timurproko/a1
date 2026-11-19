## ADDED Requirements

### Requirement: Prompt selection copy uses the shared acknowledgement

When the ordinary bare-A1 prompt owns a keyboard-selected range and the reader presses `Ctrl+C`, A1 SHALL preserve the exact expanded editor-text clipboard payload and selection-collapse behavior. Delivered or submitted-unverified work SHALL show the existing transient prompt-adjacent `copied N chars to clipboard` acknowledgement using the exact submitted text length. Other outcomes SHALL NOT show success feedback and SHALL retain existing failure behavior.

#### Scenario: Copy keyboard-selected prompt text
- **WHEN** the reader keyboard-selects text in the ordinary bare-A1 prompt and presses `Ctrl+C`
- **THEN** A1 SHALL submit the exact expanded selected editor text through the established bounded clipboard route
- **AND** successful completion SHALL show one existing prompt-adjacent `copied N chars to clipboard` acknowledgement using that exact payload length
- **AND** the prompt selection SHALL collapse through its established copy behavior

#### Scenario: Prompt copy does not report failed delivery as success
- **WHEN** a prompt-selection copy fails, times out, is canceled, or is superseded
- **THEN** A1 SHALL NOT show a copied-success acknowledgement for that intent
- **AND** an applicable transport failure SHALL use the existing recoverable copy-failure presentation

### Requirement: Prompt copy feedback preserves intent ordering and route isolation

Prompt copy completion SHALL participate in the same newest-copy intent ordering as frame-selection completion, so older prompt or frame work SHALL NOT replace feedback for a newer clipboard intent. Prompt cut, `/copy`, clipboard paste, and the `a1 pi` comparison profile SHALL retain their existing acknowledgement and routing behavior.

#### Scenario: Ignore a stale prompt-copy completion
- **WHEN** a prompt-selection copy completes after a newer prompt or frame clipboard intent has been admitted
- **THEN** the older completion SHALL NOT replace acknowledgement state belonging to the newer intent

#### Scenario: Preserve adjacent semantic routes
- **WHEN** the reader cuts keyboard-selected prompt text, invokes `/copy`, pastes clipboard content, or uses the `a1 pi` comparison profile
- **THEN** those routes SHALL retain their existing payload, mutation, delivery, and acknowledgement behavior
