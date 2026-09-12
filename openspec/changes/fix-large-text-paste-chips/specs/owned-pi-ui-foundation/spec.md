## ADDED Requirements

### Requirement: Large ordinary text pastes use Pi-style compact chips
Bare A1's default prompt editor SHALL collapse an ordinary text paste into one compact chip when its normalized text contains more than 10 logical lines or more than 1,000 UTF-16 code units. Counts and retained text SHALL follow the pinned Pi paste normalization, including line-ending normalization, tab expansion, and control-character handling. More than 10 lines SHALL use `[paste #N +L lines]`; otherwise a qualifying paste SHALL use `[paste #N C chars]`. `L` SHALL count newline-separated logical lines, including a trailing empty line, and `C` SHALL count UTF-16 code units. Nonqualifying ordinary text SHALL remain inline. This behavior SHALL apply with persistent prompt history enabled or disabled, without changing `a1 pi`.

#### Scenario: Paste the reported multiline example
- **WHEN** the user pastes ordinary text containing 136 normalized logical lines into a fresh bare-A1 editor
- **THEN** the editor SHALL display `[paste #1 +136 lines]` instead of expanding all 136 lines
- **AND** the full normalized text SHALL remain available behind the chip

#### Scenario: Apply exact threshold boundaries
- **WHEN** an ordinary paste has at most 10 lines and at most 1,000 UTF-16 code units after normalization
- **THEN** it SHALL remain inline
- **WHEN** a paste has 11 lines or has 1,001 UTF-16 code units
- **THEN** it SHALL become a chip, with the line-count label taking precedence when both thresholds are exceeded

#### Scenario: Preserve specialized paste behavior
- **WHEN** clipboard content is recognized as a URL, existing file/folder paths, or an image by A1's established paste classification
- **THEN** the existing specialized chip and attachment behavior SHALL remain in effect rather than wrapping it in a text-paste chip

### Requirement: Text paste entry points preserve insertion and atomic editing
Clipboard shortcuts, right-click paste, and terminal bracketed paste SHALL produce equivalent compact text chips for the same qualifying ordinary payload. Terminal delivery chunking SHALL NOT change the result. A paste SHALL replace the selected range or insert at its captured position; asynchronous completion SHALL preserve newer text and paste-action ordering. Live text-paste chips SHALL act as whole units for caret traversal, selection, and deletion, retain correct payload identity through undo/redo and draft history navigation, and render within the available width.

#### Scenario: Paste through each supported entry point
- **WHEN** the same qualifying text is pasted through an owned clipboard shortcut, right-click paste, or a complete or fragmented bracketed-paste sequence
- **THEN** each action SHALL insert one equivalent text-paste chip
- **AND** pasted newlines SHALL NOT submit the prompt and terminal framing bytes SHALL NOT appear as editor text

#### Scenario: Replace a selection and complete reads out of order
- **WHEN** a paste replaces selected text and later typing or another paste occurs before clipboard reads finish
- **THEN** each result SHALL resolve at its own reserved position without overwriting newer input
- **AND** resolving a paste removed by the user or invalidated by session replacement SHALL NOT resurrect it

#### Scenario: Edit and recover a chip
- **WHEN** the user moves across, selects, or deletes a text-paste chip, then uses undo/redo or browses history and restores the draft
- **THEN** the chip SHALL behave atomically and each restored chip SHALL still resolve to its own full payload
- **AND** a later paste SHALL NOT overwrite the backing of another recoverable chip

#### Scenario: Render a narrow prompt
- **WHEN** the prompt is narrower than the chip label
- **THEN** rendered rows SHALL fit the terminal width without corrupting the chip's semantic identity, surrounding text, or caret mapping

### Requirement: Compact text chips resolve to complete prompt content
Copy/cut, prompt preparation, queued-input recovery, and durable recall SHALL resolve live text-paste chips to their complete normalized text, never silently truncating it or sending only the visible marker. Ordinary, steering, follow-up, and compaction-queued submissions SHALL preserve each pasted payload and its position exactly once. Existing submission-level outer trimming and durable-history eligibility and size limits SHALL remain unchanged. Expansion SHALL NOT recursively interpret marker-looking text inside a pasted payload, and unregistered marker-looking text SHALL remain literal.

#### Scenario: Submit or copy multiple text chips
- **WHEN** a draft contains surrounding typed text and several text-paste chips, including repeated identical pastes
- **THEN** copying or preparing that draft SHALL preserve the surrounding text and every pasted occurrence in order
- **AND** text-paste chips SHALL NOT create image attachments

#### Scenario: Submit before clipboard acquisition finishes
- **WHEN** the user submits a draft with an unresolved text paste and continues typing a new draft
- **THEN** the existing pending-submission flow SHALL wait for that captured paste and dispatch the complete captured text once
- **AND** completion or cancellation SHALL NOT alter the new draft or silently dispatch an incomplete prompt

#### Scenario: Paste code containing marker-like strings
- **WHEN** a text-paste payload contains literal paste, image, URL, or path-chip-looking strings, including strings matching another live chip's label
- **THEN** those strings SHALL remain literal payload content during copying, submission, and history preparation
- **AND** they SHALL NOT expand again, disappear, or attach an unrelated image

#### Scenario: Recall after restart
- **WHEN** a submitted text-chip prompt is eligible for durable history and the user recalls it in a fresh process
- **THEN** recall SHALL restore its actual normalized text independently of the originating chip registry
- **AND** internal line breaks and Unicode SHALL remain intact
