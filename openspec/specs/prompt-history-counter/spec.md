# prompt-history-counter Specification

## Purpose
Decides how the editor border shows the position of a recalled prompt in persistent history.

## Requirements

### Requirement: History counter is labelled

While a persistent-history prompt is recalled, the editor top border SHALL show the label `History` followed by the position and total, newest first, such as `History 100/100` for the newest of 100 entries and `History 1/100` for the oldest.

#### Scenario: Newest of 100 entries

- **WHEN** a user with 100 saved prompts presses Up once
- **THEN** the top border shows `History 100/100`

#### Scenario: Recalled text with hidden lines above

- **WHEN** a recalled multiline prompt has lines hidden above the editor
- **THEN** the top border still shows `History` with the position, beside the `↑ N more` cue when both fit
