# prompt-image-limit Specification

## Purpose
Decides how A1 tells users that a prompt has too many images and how to change the limit.

## Requirements

### Requirement: Image limit message points to the real setting

When a prompt exceeds its image limit, A1 SHALL state the limit, and SHALL name the path Ctrl+P → Settings → Agent → Prompt image limit only when that limit comes from the Prompt image limit setting. It SHALL NOT refer to a `/settings` command.

#### Scenario: Bare A1 at its configured limit

- **WHEN** a bare A1 user with a limit of 8 attaches a ninth image
- **THEN** A1 shows "A prompt is limited to 8 images. To change it: Ctrl+P → Settings → Agent → Prompt image limit."

#### Scenario: No configurable limit

- **WHEN** a shell without the Prompt image limit setting rejects an extra image
- **THEN** A1 shows "A prompt is limited to 8 images." with no hint
