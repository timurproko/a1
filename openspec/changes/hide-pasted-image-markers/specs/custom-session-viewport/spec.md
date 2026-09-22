## ADDED Requirements

### Requirement: Image attachment metadata uses the transient dock notice
Bare A1 SHALL present ready pasted-image feedback and recognized successful image-processing metadata in the existing transient informational notice above the editor rather than inside the prompt editor or submitted user-message text. A ready draft SHALL show concise attachment feedback without exposing generated screenshot identifiers. When submission produces canonical conversion or original/displayed-dimension guidance for an attached image, the complete guidance SHALL remain available to the agent context while its visible copy SHALL replace the draft attachment feedback in the dock notice. Multiple successful notes from one submission SHALL form one bounded multiline notice in attachment order.

Image feedback SHALL inherit the informational notice's wrapping, dim status styling, working-status ordering, single-slot replacement, transcript-selection exclusion, and session-reset cleanup. The submitted prompt that produces image metadata SHALL replace the draft attachment feedback with that metadata rather than dismissing it without presentation; the next submitted prompt, non-informational workflow presentation, or session reset SHALL dismiss it normally. Reconstructing or resuming persisted transcript history SHALL NOT recreate old image notices. Image omission, validation, and preparation failures SHALL retain their existing actionable failure presentation and SHALL NOT be reclassified as successful informational metadata. The `a1 pi` comparison route SHALL retain pinned inline image-note presentation.

#### Scenario: Prepare an image in a draft
- **WHEN** a clipboard image becomes ready in a bare-A1 draft
- **THEN** concise attachment feedback SHALL appear in the transient notice above the editor
- **AND** neither the notice nor the editor SHALL expose the generated screenshot identifier

#### Scenario: Submit an image that was resized for the model
- **WHEN** a submitted image produces canonical original/displayed-dimension guidance
- **THEN** the submitted user-message text SHALL omit the visible guidance and generated screenshot token
- **AND** the complete dimension guidance SHALL appear in the transient notice above the editor
- **AND** the agent context SHALL retain the guidance and image attachment

#### Scenario: Submit multiple processed images
- **WHEN** one submitted prompt produces successful processing notes for multiple attached images
- **THEN** bare A1 SHALL show one multiline dock notice with the notes in attachment order
- **AND** it SHALL NOT add separate transcript rows or expose the notes inside the submitted prompt

#### Scenario: Keep metadata while the agent works
- **WHEN** image-processing metadata is presented while the live working status and streamed output are active
- **THEN** the working status SHALL remain above the notice and transcript updates SHALL NOT remove the notice
- **AND** the notice SHALL remain after settlement until the existing dismissal boundary occurs

#### Scenario: Do not resurrect historical image metadata
- **WHEN** a session containing an older image-bearing user message is resumed or rebuilt from persisted messages
- **THEN** its previous processing metadata SHALL NOT be recreated as a current dock notice
- **AND** the stored user message and agent context SHALL remain unchanged

#### Scenario: Preserve image failure visibility
- **WHEN** image acquisition, validation, conversion, or provider preparation fails or omits an image
- **THEN** the failure SHALL remain visible through its existing error or failed-attachment presentation
- **AND** bare A1 SHALL NOT present it as a successful transient image notice

#### Scenario: Keep pinned inline notes unchanged
- **WHEN** an image produces processing guidance in `a1 pi`
- **THEN** the guidance and screenshot marker SHALL retain their pinned prompt/transcript presentation
