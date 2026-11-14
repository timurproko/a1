## ADDED Requirements

### Requirement: Single supplied image files become prepared image attachments

For an owned isolated paste whose supplied text resolves to exactly one existing supported image file, A1 SHALL prepare that destination-side file into one ready image attachment and display an atomic image chip. This route SHALL NOT acquire the native clipboard or rely on a later agent tool call to read the file. The image bytes SHALL pass through bounded source intake, actual image/MIME validation, serialized background conversion, final attachment limits, and canonical base64 preparation before readiness or submission. Quoted paths and paths containing spaces SHALL retain the existing path parsing rules. A file extension alone SHALL NOT establish that content is valid image data.

Canceled, timed-out, undone, removed, or session-replaced image-file preparation SHALL NOT leave an orphan image attachment or stale insertion. Prepared attachments SHALL retain ordinary image-chip submission, steering, follow-up, history-sidecar, and image-count semantics. Ordinary prose, URLs, missing paths, non-image files, folders, and multiple/mixed path lists SHALL retain their existing behavior.

#### Scenario: Herdr supplies a transferred screenshot path

- **WHEN** a supplied paste payload resolves to one supported valid destination-side image file
- **THEN** A1 SHALL prepare the file and create one usable image attachment chip without reading the native clipboard
- **AND** submitting the chip SHALL include its prepared image bytes exactly once rather than only a file path in prompt text

#### Scenario: Supplied screenshot path contains quoting or spaces

- **WHEN** a single valid supplied image-file path contains spaces or uses supported quoting
- **THEN** A1 SHALL preserve the existing path parsing contract and prepare that same file as one image attachment

#### Scenario: Supplied text is not a single image file

- **WHEN** supplied paste content is ordinary text, a URL, a missing path, a non-image file, a folder, or a multiple/mixed path list
- **THEN** A1 SHALL preserve that content's existing preparation and chip behavior without native clipboard acquisition

#### Scenario: Image-file acquisition fails after classification

- **WHEN** one classified image file becomes unreadable before worker acquisition
- **THEN** A1 SHALL report “Couldn’t paste screenshot—try again.” without retaining a failed reservation or exposing the source path
- **AND** SHALL NOT acquire another clipboard or overwrite later typing

#### Scenario: Concurrent file pastes share the image limit

- **WHEN** two acquired text payloads can still classify as images and their classification completes out of order
- **THEN** A1 SHALL retain provisional image capacity until classification resolves each payload's kind
- **AND** SHALL NOT admit attachments beyond the current prompt image limit

#### Scenario: Image-file preparation fails or is canceled

- **WHEN** a supplied image file exceeds image limits, contains invalid image data, or its preparation is canceled or expires
- **THEN** A1 SHALL retain recoverable image failure and cancellation behavior without submitting malformed bytes
- **AND** no late result SHALL restore a removed image, corrupt later typing, or leak a provisional attachment
