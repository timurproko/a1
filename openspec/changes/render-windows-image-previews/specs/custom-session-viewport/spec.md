## ADDED Requirements

### Requirement: Bare A1 visibly previews submitted images on Windows

Bare A1 SHALL present a bounded visual preview for each available submitted user-image attachment on Windows instead of leaving a native-protocol reservation blank or stopping at image metadata text. The preview SHALL preserve the attachment's aspect ratio closely enough to keep screenshot content recognizable, honor the effective transcript image-width setting within fixed cell, row, decoded-pixel, terminal-byte, concurrency, and time bounds, and derive expensive pixel work outside the interactive thread.

The visual fallback SHALL be presentation-only. It SHALL NOT replace or recompress the retained attachment, alter its MIME type, add terminal-rendered rows to model context, change screenshot chips or submitted-prompt text, change history or coordinate guidance, or weaken image admission limits. Hidden images SHALL retain their existing hidden text without starting preview work. Pending or failed preview generation SHALL remain bounded and visible without hiding surrounding prompt content or exposing image bytes or codec diagnostics.

This fallback SHALL apply only to the bare-A1 submitted-user-image surface on Windows. Reliable established native paths SHALL retain native rendering, tool-result and extension renderers SHALL remain unchanged, and the explicit `a1 pi` comparison route SHALL preserve pinned Pi behavior.

#### Scenario: Submit a screenshot in Windows WezTerm

- **WHEN** a user submits an available screenshot in bare A1 running through Windows WezTerm and Pi reports native image capability
- **THEN** the transcript SHALL show a recognizable bounded visual preview beneath the submitted prompt instead of a blank reserved region
- **AND** the preview SHALL use A1's bounded bundled Sixel path instead of the unreliable Kitty placement
- **AND** later status, assistant, scrollbar, or dock row paints SHALL NOT erase that preview into an empty reservation
- **AND** the original screenshot attachment SHALL reach storage and model delivery unchanged

#### Scenario: Submit a screenshot in Windows Terminal

- **WHEN** a user submits an available screenshot in bare A1 running through Windows Terminal where Pi reports no native image protocol
- **THEN** the transcript SHALL show a bounded high-fidelity Sixel preview rather than only `[Image: …]` metadata
- **AND** Sixel encoding SHALL run in A1's bounded worker without requiring an external renderer, PowerShell, or machine-installed conversion module

#### Scenario: Fall back on an unknown Windows host

- **WHEN** bare A1 runs on Windows without a declared Sixel-capable Windows Terminal or WezTerm host
- **THEN** the transcript SHALL use bounded ordinary high-density terminal cells without emitting an unverified image protocol
- **AND** it SHALL require no external renderer or machine-installed conversion module

#### Scenario: Prepare the preview while interaction continues

- **WHEN** a retained screenshot requires decoding and scaling for Windows presentation while output is streaming or the user continues typing
- **THEN** image work SHALL run through the bounded owned worker lifecycle and the transcript SHALL show a finite preparing state
- **AND** input, animation, agent-event delivery, and unrelated transcript rendering SHALL continue receiving event-loop turns

#### Scenario: Resize, scroll, or revisit the image

- **WHEN** the terminal width changes or the reader scrolls a submitted-image block out of and back into view
- **THEN** bare A1 SHALL present a current width-bounded preview with preserved aspect and stable surrounding content
- **AND** it SHALL reuse or replace derived presentation only under the declared asset, width, theme, mount, and session identities

#### Scenario: Hide submitted images

- **WHEN** transcript image visibility is disabled before or during preview preparation
- **THEN** bare A1 SHALL show the existing bounded hidden-image text and SHALL start no new preview conversion while hidden
- **AND** a late completion SHALL NOT repaint the hidden or replaced surface

#### Scenario: Preview generation is unavailable

- **WHEN** decoding fails, the attachment format is unsupported by the fallback, a safety bound or deadline is reached, or the owning mount is canceled
- **THEN** bare A1 SHALL show a bounded unavailable or metadata-style fallback without losing the submitted prompt
- **AND** it SHALL NOT expose base64 data, raw codec diagnostics, partial terminal protocols, or an unbounded blank reservation

#### Scenario: Keep unaffected rendering paths unchanged

- **WHEN** the same attachment is presented on an established reliable non-Windows native path, through `a1 pi`, or as tool/extension-owned image content
- **THEN** its existing renderer and protocol selection SHALL remain unchanged
- **AND** only bare A1's declared Windows submitted-user-image fallback SHALL be treated as an expected presentation difference
