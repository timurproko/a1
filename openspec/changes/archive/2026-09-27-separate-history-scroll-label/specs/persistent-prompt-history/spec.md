## MODIFIED Requirements

### Requirement: Recalled text is reusable without the originating process
The durable recall value SHALL be the user-authored text before template or extension expansion, with outer whitespace trimmed and internal text preserved. Text-paste content SHALL survive independently of ephemeral chip identifiers. Recalled multiline text SHALL remain expanded in the editor so the user can see and navigate its content rather than having the complete value replaced by a compact text-paste chip. Only this typed recall value and bounded submission provenance SHALL be retained; transformed engine prompts, image bytes, credential stores, arbitrary environment values, and terminal content SHALL NOT be copied into history.

#### Scenario: Recall a pasted multiline prompt after restart
- **WHEN** the user submits a prompt containing a text-paste chip and starts a fresh process
- **THEN** recall SHALL restore its actual text content with internal whitespace, line breaks, and Unicode intact
- **AND** the editor SHALL display that multiline content expanded rather than replacing it with a text-paste chip
- **AND** its reusable value SHALL NOT depend on the old chip ID or a process-local paste cache

#### Scenario: Recall a template invocation
- **WHEN** a user submits a template or skill invocation that expands before reaching the agent
- **THEN** recall SHALL restore the user's invocation rather than the expanded system or agent prompt

#### Scenario: Recall text from an image-bearing prompt
- **WHEN** a submitted prompt contains user text and an image chip
- **THEN** persistent recall SHALL retain the user text without a live-looking image attachment token or automatic image reattachment
- **AND** literal placeholder-looking text authored by the user SHALL remain unchanged

#### Scenario: Submit an image-only prompt
- **WHEN** removing semantic image attachments leaves no nonempty recall text
- **THEN** the submission SHALL NOT create an empty or unresolved-placeholder durable entry
- **AND** the original image submission behavior SHALL remain unchanged
