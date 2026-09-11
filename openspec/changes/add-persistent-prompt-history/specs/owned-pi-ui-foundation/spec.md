## ADDED Requirements

### Requirement: Persistent prompt history is a declared bare-A1 editor replacement
Bare A1 SHALL declare enabled persistent prompt history as a replacement for the default editor's current-session history source, duplicate policy, recalled-entry caret placement, and browsing border presentation, implemented through an explicitly owned, source-traced editor adaptation. That replacement SHALL follow the `persistent-prompt-history` capability and SHALL NOT change other editor, submission, transcript, viewport, public extension, or session behavior. The `a1 pi` comparison SHALL keep its existing pinned-based editor path and current-session history semantics and SHALL NOT initialize A1's durable-history storage or adapted editor. When persistence is disabled, bare A1 SHALL retain its existing editor path and current-session recall without the persistent-history replacement.

#### Scenario: Browse saved history in bare A1
- **WHEN** the user starts bare A1 with persistence enabled and recalls a prior-session prompt
- **THEN** the declared replacement SHALL provide v2-style global unique recall, directional caret placement, and the history border indicator
- **AND** it SHALL keep draft restoration and existing local input recovery reachable

#### Scenario: Compare against pinned Pi
- **WHEN** `a1 pi` is launched with A1 history files present
- **THEN** its history ordering, adjacent-duplicate handling, navigation placement, and ordinary border SHALL match pinned Pi
- **AND** A1 history files, workers, polling, settings effects, and cross-session recall SHALL remain unused

#### Scenario: Evaluate the replacement boundary
- **WHEN** independent parity and v2 behavior evidence are evaluated
- **THEN** only the history differences named by this declaration SHALL be classified as expected bare-A1 customization
- **AND** multiline cursor movement, autocomplete, selection, undo, prompt execution, suggestions, viewport behavior, and unrelated surfaces SHALL retain their existing contracts

#### Scenario: Disable persistence
- **WHEN** bare A1 starts with history persistence disabled
- **THEN** current-session prompt recall and recovery SHALL remain available without loading prior-session durable entries
- **AND** no persistent-history indicator or directional-caret replacement SHALL be applied

### Requirement: The owned history editor has a bounded typed and source-traced boundary
The history-enabled default editor adaptation SHALL be traceable to the selected pinned editor source and only the necessary editor-local helper closure, with license attribution and reviewed modifications. Its history synchronization and navigation SHALL use owned typed operations that preserve draft, cursor, paste backing, and undo semantics, rather than access Pi's private state, patch installed dependencies or prototypes, extract dependency source at runtime, or emulate navigation through ordinary text replacement and synthetic keys. The adaptation SHALL remain within the Pi component boundary and SHALL NOT introduce a second terminal runtime or replace the terminal package's shared exports.

#### Scenario: Establish the adapted editor baseline
- **WHEN** the source-derived core is evaluated before history customization is enabled
- **THEN** independent equivalent inputs SHALL produce the same baseline text, cursor, draft restoration, undo grouping, paste expansion, autocomplete, rendering, and submit behavior as the untouched pinned editor
- **AND** history customization SHALL NOT be enabled until that baseline and the typed integration boundary are verified

#### Scenario: Upstream editor provenance changes
- **WHEN** the selected dependency or source authority no longer matches the recorded editor/helper provenance
- **THEN** compatibility validation SHALL name the unreviewed change and block acceptance until it is explicitly reconciled
- **AND** an engine upgrade SHALL NOT silently regenerate or overwrite the owned editor's runtime behavior

#### Scenario: Keep terminal module resolution unchanged
- **WHEN** the enabled bare-A1 default editor uses the owned adaptation
- **THEN** A1 and Pi extensions SHALL still resolve one shared pinned terminal package through the existing alias
- **AND** the package's exported editor constructors and the comparison editor SHALL NOT be replaced or mutated
- **AND** A1-owned consumers SHALL use the adaptation's declared typed interface rather than pretend it is an instance of a private Pi implementation

#### Scenario: An extension supplies a custom editor
- **WHEN** the existing public custom-editor factory mounts an extension-owned editor
- **THEN** its construction, focus, input, and public extension behavior SHALL remain unchanged
- **AND** default-editor history synchronization SHALL be suspended rather than patching or replacing that custom editor
- **WHEN** the factory lifecycle restores the default editor
- **THEN** the latest completed recall snapshot SHALL be reattached without losing the restored draft
- **AND** only actual classified user submissions SHALL enter durable history throughout these transitions

#### Scenario: Use public editor extension interactions
- **WHEN** an extension uses supported editor text access, shortcuts, autocomplete, or submission interactions with the active default editor
- **THEN** those public interactions SHALL retain their existing outcomes without reliance on the adaptation having Pi's concrete constructor identity
