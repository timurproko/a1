## ADDED Requirements

### Requirement: Generic emoji presentation in content-area prose

The owned content-area prose presentation SHALL request emoji presentation for eligible standalone text-default emoji graphemes using Unicode-valid emoji sequences rather than a per-icon replacement list. Presentation SHALL occur before width measurement and wrapping. It SHALL NOT modify stored source, model-facing input, original filenames, or original-source clipboard content.

#### Scenario: Text-default emoji in prose

- **WHEN** user or assistant prose, thinking, or a prose summary contains a standalone text-default emoji for which adding U+FE0F produces a valid RGI emoji sequence
- **THEN** displayed prose SHALL request emoji presentation for that grapheme
- **AND** the same generic rule SHALL cover framed picture, right arrow, and information symbols without special-case substitutions

#### Scenario: Intentional text and existing sequences

- **WHEN** content contains explicit U+FE0E, an existing emoji-presentation sequence, a joined or modified emoji, a flag, a keycap, or a non-emoji symbol
- **THEN** presentation SHALL preserve that grapheme rather than blindly appending selectors

#### Scenario: Protected source contexts

- **WHEN** content contains inline or block code, a diagram, a URL or path, or a Markdown link destination
- **THEN** presentation SHALL preserve those bytes and their meaning
- **AND** ordinary link-label prose MAY receive the same emoji presentation as other prose without changing the target

#### Scenario: Layout and original-source fidelity

- **WHEN** displayed prose gains an emoji-presentation selector or streams across a layout boundary
- **THEN** wrapping and selection SHALL use the resulting renderer column width
- **AND** copy of original content SHALL retain original selector choices rather than indiscriminately deleting selectors
- **AND** message persistence and submission SHALL retain original source text

### Requirement: Emoji presentation for generated paste-chip icons

Generated prompt-chip icons SHALL use the shared emoji-presentation policy where needed. Image-file path chips SHALL use U+1F5BC followed by U+FE0F with one ordinary space separating the icon from the label. This presentation change SHALL NOT rewrite filenames, pasted user text, screenshot identifiers, or attachment payloads.

#### Scenario: Image-file icon requests emoji rendering

- **WHEN** an image-file path is represented as a generated prompt chip
- **THEN** its framed-picture icon SHALL include U+FE0F and one label-separator space
- **AND** ordinary file, folder, screenshot, URL, and Houdini chip icons SHALL retain their existing emoji-default presentation

#### Scenario: New and legacy image-file labels remain atomic

- **WHEN** canonical chip recognition encounters a new emoji-presentation image-file label or an existing bare-icon label with one or two separator spaces
- **THEN** it SHALL recognize the complete label as one chip
- **AND** wrapping protection and restoration SHALL preserve its exact original text
- **AND** adjacent chips SHALL retain independent wrapping and selection boundaries using the terminal renderer's width authority

#### Scenario: Presentation does not change path meaning

- **WHEN** a generated image-file path chip is copied or expanded for submission or history by the path-chip lifecycle
- **THEN** its original path SHALL remain unchanged by the icon presentation
