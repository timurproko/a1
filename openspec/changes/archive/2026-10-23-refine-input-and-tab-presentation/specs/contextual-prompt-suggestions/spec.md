## ADDED Requirements

### Requirement: Contextual suggestions preserve the inset main-prompt prefix
The ordinary bare-A1 prompt SHALL reserve exactly one leading blank cell before its `❯` marker whether it is empty, contains typed text, or presents contextual suggestion ghost text. The marker and inset SHALL remain presentation-only and SHALL NOT enter semantic editor text, selection, clipboard, history, queued input, or submitted prompts. Suggestion wrapping SHALL use the width remaining after the complete leading inset and prompt marker. This requirement replaces the earlier dependency on the Settings-search marker, because Settings search is marker-free.

#### Scenario: Show a contextual suggestion
- **WHEN** an eligible contextual suggestion appears in an empty ordinary prompt
- **THEN** the complete suggestion SHALL appear after one leading blank cell, the grey `❯` marker, and the established marker-to-content spacing
- **AND** reading or copying the editor value SHALL still observe an empty value until the suggestion is accepted

#### Scenario: Render typed prompt text
- **WHEN** the ordinary prompt contains user-entered text
- **THEN** the same one-cell leading inset and `❯` marker SHALL precede the text
- **AND** the semantic prompt value SHALL contain neither the inset nor the marker

#### Scenario: Wrap a long suggestion
- **WHEN** a contextual suggestion exceeds the first visible prompt row
- **THEN** it SHALL wrap within the content width remaining after the complete inset and prompt prefix
- **AND** no rendered row SHALL exceed the terminal width
