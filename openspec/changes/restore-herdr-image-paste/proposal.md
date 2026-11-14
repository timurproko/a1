## Why

A1's Herdr text-copy fix accidentally blocks local screenshot acquisition because paste reuses the copy-destination policy. Remote screenshot paths already become image-looking file chips, but the owned submission path does not automatically attach their image bytes.

## What Changes

- Keep Herdr-owned text copy exactly as delivered by PR #922: one bounded terminal submission, no host-native/platform write or fallback.
- Give raw paste its own acquisition policy. Propose image-only host acquisition for raw Herdr paste gestures without conventional SSH/WSL/multiplexer restrictions; retain full native content acquisition for ordinary native terminals and explicit clipboard-port precedence.
- Keep supplied text authoritative: no native clipboard reads, exactly-once insertion, existing large-text presentation. Prepare a single supplied supported image-file path into a real image attachment instead of only a path reference.
- Reuse killable acquisition, serialized image conversion, attachment limits, reservations, cancellation, undo/redo, history sidecars, and submission behavior. No new setting, Herdr change, dependency patch, or distributed clipboard service.
- **Approval boundary:** the proposed raw Herdr image-only exception deliberately relaxes the initial handoff's unknown-attachment no-native-read guarantee. A raw key contains no viewer-ownership proof. If a markerless remote viewer sends only that key instead of a transferred image, this policy could read the agent host's unrelated image. No implementation is authorized under that exception until the user accepts it explicitly. This is a proposed host-paste contract, not a claim to detect locality from missing SSH markers.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `session-frame-selection`: separate terminal-owned copy from the proposed raw image-only acquisition contract while preserving supplied-content precedence and known-remote restrictions.
- `owned-pi-ui-foundation`: prepare single supplied image-file paths into ready image attachments, not only image-looking file references.
- `custom-session-viewport`: distinguish actual prepared image attachments from existing path-reference labels and preserve ordinary path-list presentation.

## Impact

A1 session-shell clipboard policy, native/provided/text paste protocol and helper, image-file preparation/adoption, prompt-chip attachment/history handling, focused clipboard/chip/package tests, and `docs/architecture/response-copy-delivery.md`. No Herdr source, installed application, comparison profile, or archived PR #922 artifact changes.

This is a planning-only proposal. The no-setting local/remote screenshot and cross-machine text goals are established; the raw-image security-policy exception above remains the substantive open decision. Detailed implementation tasks will be written after that decision, one group per PR Implementation outcome.
