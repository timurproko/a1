## MODIFIED Requirements

### Requirement: Naming completion is bounded and non-blocking

Automatic naming SHALL use the active session model through a separate tool-free completion and SHALL NOT add agent turns, execute tools, alter the main run's busy state, or block its response. Names SHALL use the effective `sessionNameFormat`: lowercase hyphenated words for `kebab`, space-separated words with the first ordinary word capitalized for `sentence`, or space-separated words with every ordinary word capitalized for `title`. Readable formats SHALL preserve uppercase acronyms and internally capitalized technical spellings. Names SHALL remain at most 16 characters, including separators, using the existing whole-word truncation policy where possible. Generation SHALL allow at most two attempts with respective 4,096 and 32,768 token ceilings and a 30-second deadline per attempt, followed by a deterministic current-prompt fallback only while the request remains eligible. Context change, binding change, setting disablement, and disposal SHALL cancel pending naming and prohibit stale fallback. At most one generation chain SHALL be active at a time.

#### Scenario: Provider returns no usable title
- **WHEN** both bounded attempts fail or return unusable output for a still-current request
- **THEN** naming SHALL use a normalized fallback from the first three prompt words, or the words `new task` when no usable words exist, formatted with the effective choice
- **AND** the main agent run SHALL remain independent of naming failure

#### Scenario: Cancel a request before a late provider response
- **WHEN** a naming request is invalidated or the application is disposed
- **THEN** its completion SHALL be aborted where supported and late output SHALL be ignored
- **AND** no fallback or automatic rename SHALL be applied for that cancelled request

#### Scenario: Generate each supported format
- **WHEN** the model returns `fix API cache` for an eligible session
- **THEN** the saved name SHALL be `fix-api-cache` for kebab, `Fix API cache` for sentence, or `Fix API Cache` for title

#### Scenario: Change the format during generation
- **WHEN** the user changes the format while an otherwise eligible naming request is pending
- **THEN** its result or fallback SHALL use the latest effective choice without an additional generation request
