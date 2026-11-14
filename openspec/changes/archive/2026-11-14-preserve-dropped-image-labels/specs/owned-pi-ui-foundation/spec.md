## ADDED Requirements

### Requirement: Image attachment chip labels preserve file provenance

In the owned isolated paste pipeline, a single supported image-file path promoted to a prepared image attachment SHALL retain file provenance through preparation and adoption. Its editor chip SHALL use the established image-file icon and a filename-bearing label rather than a generated screenshot label. Images acquired as clipboard image bytes without file provenance SHALL retain the existing screenshot-chip labels. This presentation distinction SHALL NOT revert a prepared file image to a path-only reference or change existing multiple/mixed path-list behavior.

Named file-image chips SHALL preserve stable attachment identity independently of basename, remain atomic, and retain existing image validation, preparation limits, image-count policy, cancellation, pending submission, exactly-once delivery, copy/editing, undo/redo, steering, follow-up, and durable history behavior. Legacy screenshot chips SHALL remain compatible. Supplied file-image preparation SHALL NOT acquire the native clipboard.

#### Scenario: Drop a desktop image file into the input

- **WHEN** supplied terminal paste text resolves to exactly one existing supported valid image file
- **THEN** A1 SHALL display an atomic filename-bearing image-file chip using the image-file icon instead of a screenshot label
- **AND** submission SHALL include that file's prepared image bytes exactly once without a native clipboard read

#### Scenario: Paste clipboard image bytes

- **WHEN** a paste acquires image bytes without file provenance
- **THEN** A1 SHALL retain the ordinary screenshot-chip presentation and existing attachment delivery behavior

#### Scenario: Preserve filename and independent attachment identity

- **WHEN** a supplied image path contains spaces or supported quoting, or different supplied images have the same basename
- **THEN** A1 SHALL retain a filename-bearing image-file label for each attachment without overwriting or substituting another image's bytes

#### Scenario: Recall a named image after restart

- **WHEN** history containing a prepared image-file chip is recalled in a fresh process
- **THEN** its sidecar-backed attachment SHALL retain its filename-bearing image-file presentation and original prepared bytes
- **AND** a missing payload SHALL follow the existing silent-strip behavior while legacy screenshot history remains readable

#### Scenario: File-image lifecycle remains attachment-safe

- **WHEN** a supplied file-image paste exceeds the count policy, fails preparation, is canceled, or is undone and redone
- **THEN** A1 SHALL retain existing exclusion, error, cancellation, and undo/redo guarantees without stale insertion or orphan usable attachments

#### Scenario: Other path and text inputs remain unchanged

- **WHEN** supplied input is a multiple/mixed path list, non-image file, folder, URL, or ordinary text
- **THEN** A1 SHALL preserve its existing classification, presentation, and submission behavior
