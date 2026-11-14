## Context and root cause

Terminal drops arrive as supplied text, often a quoted absolute path. `shell-editor-factory.ts` admits path-like input to isolated preparation. `paste-text-preparation.ts` correctly identifies the existing image file, and `path-chip-presentation.ts` already supports a filename-bearing image-file icon for path references.

In `paste-helper.ts`, exactly one supported image-file path is promoted to a `prepare-file` image-worker request. That promotion is intentional: PR #926 fixed path-only submission so the model receives actual prepared image bytes. However, `imagePreparation()` emits only the prepared image result; file origin and filename are lost. `prompt-chips.ts` then unconditionally uses `#addPreparedImage()` to construct a screenshot tag. Existing `herdr-image-files.test.ts` explicitly asserts screenshot tags, so current tests codify the unwanted presentation.

## Goals

- A dropped single supported image file displays an atomic image-file chip with its filename and the established image-file icon.
- Clipboard images without filename provenance keep the existing screenshot labels.
- Both routes remain attachment-backed, with the current safety, limits, and lifecycle guarantees.
- Supplied file paths remain authoritative and never trigger a native clipboard read.

## Non-goals

- Detect physical dragging separately from other supplied file-path transport; they share terminal text framing.
- Change multiple/mixed path-list semantics or enable multi-file image conversion.
- Revert valid image attachments to path-only file references.
- Modify Herdr, installed Pi dependencies, comparison-profile behavior, or clipboard-access policy.

## Decisions

1. Carry explicit image-file provenance from successful path classification through preparation/adoption. Do not infer file origin from MIME type, filename text inside raw pixels, or current clipboard state.
2. Use the existing image-file visual convention with a filename-bearing label. Preserve quoting/space parsing and distinguish same-name sources or different attachment instances without overwriting bytes. Internal attachment identity must not depend on basename alone.
3. Preserve stable sidecar identity for named images across history persistence, collection, pruning, restart, and missing-sidecar recall. Named images use `[🖼 filename.png #hexid]`, with `-resized` after the identifier when transformed. The short independent identifier prevents basename collisions and cross-session sidecar overwrites. A shared contract recognizes both this representation and legacy screenshot tags; a visual change must not lose persisted image payloads.
4. Keep raw clipboard screenshot labeling unchanged. Image-file conversion and validation still use the serialized worker and existing source/output limits; conversion failure or cancellation cannot leave a usable orphan chip.
5. Preserve atomic copy/editing and the current actual-attachment submission contract, including exactly-once delivery, pending submission, steering/follow-up, and count-rejection behavior.

## Focused checks

- Source and emitted helper cases for filename provenance, quoted/spaced paths, unchanged clipboard image output, malformed images, and cancellation.
- Production-shell cases for dropped-file image labels, later typing, exact image bytes once, no native acquisition, same-name identity, count rejection, and undo/redo.
- Prompt-chip and history-sidecar cases for named-image persistence/rehydration/pruning and legacy screenshot compatibility.
- Typecheck and strict validation of this OpenSpec change; no directory-wide test suites or physical desktop automation.

## Known gaps

Physical desktop dragging has not been exercised in this session. Source and emitted helper tests and production-shell input fixtures exercise the same supplied-path route; these results are not desktop certification. The task checkout is built for optional maintainer testing. Multiple/mixed image-file lists intentionally retain their existing path-reference semantics, as approved. There are no known unresolved implementation defects within the approved scope.
