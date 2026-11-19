## ADDED Requirements

### Requirement: Bare A1 omits generated resize guidance from submitted prompts
Bare A1 SHALL omit Pi's canonical successful image resize/dimension guidance from visible submitted user-prompt text while retaining the complete original message and guidance in stored and model-facing content. Filtering SHALL require image attachment provenance, exact canonical syntax, a trailing image-processing hint position, and no more recognized dimension lines than attached images.

Existing pasted-image chips and generated screenshot labels SHALL remain visible and unchanged. Bare A1 SHALL NOT introduce an `Image attached` dock notice or move resize guidance into the dock. Canonical conversion notes, image omission/failure messages, unrelated authored text, attachment delivery, transcript image presentation, and prompt editing/history behavior SHALL remain unchanged. The `a1 pi` comparison route SHALL retain its original inline resize guidance.

#### Scenario: Submit a resized pasted image
- **WHEN** an image-bearing user message ends with canonical original/displayed-dimension guidance
- **THEN** bare A1 SHALL omit that guidance from the visible submitted prompt
- **AND** the submitted prompt SHALL retain its existing screenshot chip label
- **AND** the stored message and agent context SHALL retain the complete guidance and attachment
- **AND** no synthetic attachment or processing notice SHALL be added to the dock

#### Scenario: Preserve existing image-chip behavior
- **WHEN** a pasted image is ready in the prompt editor
- **THEN** its existing image chip and screenshot label SHALL remain visible and editable
- **AND** the change SHALL NOT replace it with an `Image attached` message

#### Scenario: Preserve failures and other image hints
- **WHEN** trailing image-processing hints contain conversion or omission/failure text alongside resize guidance
- **THEN** bare A1 SHALL omit only the canonical resize/dimension lines
- **AND** it SHALL retain conversion and omission/failure text visibly

#### Scenario: Preserve ordinary text
- **WHEN** resize-looking text has no matching image attachment provenance, is not in the trailing processing-hint suffix, or exceeds the attached-image count
- **THEN** bare A1 SHALL render it unchanged

#### Scenario: Keep pinned Pi unchanged
- **WHEN** the same image-bearing message is rendered through `a1 pi`
- **THEN** the screenshot chip and inline resize guidance SHALL retain their pinned presentation
