## ADDED Requirements

### Requirement: Windows Terminal submitted images use a bounded cell preview

Bare A1 running in Windows Terminal SHALL present retained submitted-user images as bounded ordinary truecolor terminal-cell rows when transcript image visibility is enabled. Preview generation SHALL run off the main thread and SHALL preserve source aspect ratio within the existing configured image width and declared safety limits.

The preview SHALL NOT contain source base64, Sixel, Kitty graphics, iTerm image controls, or another retained terminal raster protocol. Failure or unavailability SHALL use a bounded existing fallback without changing the retained attachment.

#### Scenario: Submit a screenshot in Windows Terminal

- **WHEN** a user submits an available screenshot in bare A1 running on Windows with `WT_SESSION` and without a WezTerm host indicator
- **THEN** the transcript SHALL show a bounded truecolor quadrant-cell preview rather than only image metadata
- **AND** the preview SHALL scroll, clip, and compose with dialogs and later output as ordinary transcript rows
- **AND** every preview row SHALL reset its terminal styling before surrounding padding or scrollbar content

#### Scenario: Hide images or replace the mounted transcript

- **WHEN** image visibility is disabled or the owning block, session, width, or mount changes during preview preparation
- **THEN** pending work SHALL be canceled or made stale and SHALL NOT repaint the replaced presentation
- **AND** the retained attachment bytes, MIME type, prompt text, provider payload, and history SHALL remain unchanged

### Requirement: Established image paths remain unchanged

The Windows Terminal cell preview SHALL be selected only for submitted-user images in bare A1 on that host. Windows WezTerm, reliable native non-Windows paths, tool and extension images, unknown Windows hosts, and `a1 pi` SHALL retain their fresh-development renderer and lifecycle.

#### Scenario: Render the same screenshot in Windows WezTerm

- **WHEN** the same retained submitted image is rendered with `WEZTERM_PANE` or `TERM_PROGRAM=WezTerm`
- **THEN** Pi's existing public `Image` component path SHALL remain in use
- **AND** no Windows Terminal preview worker or custom cell presenter SHALL start

#### Scenario: Render a tool image or comparison profile

- **WHEN** image content belongs to a tool or extension, or the session runs through `a1 pi`
- **THEN** its established fresh-development renderer SHALL remain unchanged
- **AND** the Windows Terminal submitted-image fallback SHALL NOT intercept it
