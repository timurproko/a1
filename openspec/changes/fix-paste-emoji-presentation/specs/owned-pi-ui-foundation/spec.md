## ADDED Requirements

### Requirement: Emoji presentation for generated paste-chip icons

Generated prompt-chip icons SHALL use an emoji-default character or an explicit Unicode emoji-presentation sequence. Image-file path chips SHALL use U+1F5BC followed by U+FE0F with one ordinary space separating the icon from the label. This presentation change SHALL NOT rewrite filenames, pasted user text, screenshot identifiers, or attachment payloads.

#### Scenario: Image-file icon requests emoji rendering

- **WHEN** an image-file path is represented as a generated prompt chip
- **THEN** its framed-picture icon SHALL include U+FE0F and one label-separator space
- **AND** ordinary file, folder, screenshot, URL, and Houdini chip icons SHALL retain their existing emoji-default presentation

#### Scenario: New and legacy image-file labels remain atomic

- **WHEN** canonical chip recognition encounters a new emoji-presentation image-file label or an existing bare-icon label with one or two separator spaces
- **THEN** it SHALL recognize the complete label as one chip
- **AND** wrapping protection and restoration SHALL preserve its exact original text
- **AND** adjacent chips SHALL retain their independent wrapping and selection boundaries using the terminal renderer's width authority

#### Scenario: Presentation does not change path meaning

- **WHEN** a generated image-file path chip is copied or expanded for submission or history by the path-chip lifecycle
- **THEN** its original path SHALL remain unchanged by the icon presentation
