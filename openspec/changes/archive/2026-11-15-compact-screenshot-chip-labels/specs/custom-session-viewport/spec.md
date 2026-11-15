## ADDED Requirements

### Requirement: Screenshot chip labels omit the icon separator

Bare A1 SHALL present canonical camera-icon screenshot chips with the label immediately following the icon, without an inserted space. This presentation SHALL apply consistently to the live editor, queued input, and submitted user prompts, including pending, resized, and failed screenshot labels. It SHALL preserve the backing chip source, independent attachment identifier, attachment payload, and existing source-copy, history, and submission behavior. Screenshot identifiers SHALL remain visible; this requirement removes only the icon separator.

#### Scenario: Present a screenshot with a compact label

- **WHEN** a prompt contains `[📷 screenshot-abc123]`
- **THEN** the editor, queued input, and submitted prompt SHALL present `[📷screenshot-abc123]`
- **AND** the backing tag and attachment identifier SHALL remain unchanged

#### Scenario: Preserve screenshot state labels

- **WHEN** a screenshot chip is pending, resized, failed, or rejected by the image-count limit
- **THEN** its presentation SHALL omit the icon separator while retaining its existing label and state-specific rendering
- **AND** selection and atomic editing SHALL continue to resolve the original source chip

#### Scenario: Retain atomic presentation and source copy

- **WHEN** compact screenshot chips appear next to another chip or surrounding prose
- **THEN** each chip SHALL remain independently recognizable and atomic during width-bounded wrapping and editing
- **AND** whole-chip source copy SHALL retain the original source tag rather than replacing its backing identity with the display label
