## 1. Derive safe image presentation metadata

- [x] 1.1 Add provenance-aware user-message projection that separates generated screenshot markers and canonical successful image-processing notes from visible text while retaining stored/model content, and verify projection tests preserve literal lookalikes, failure text, attachment order, and image-only messages.
- [x] 1.2 Carry bounded image-note presentation metadata on owned user transcript blocks and verify contract validation, equality/revision handling, transcript rebuilds, and image asset retention remain deterministic.

## 2. Hide generated image identities without changing semantics

- [x] 2.1 Extend bare-A1 editor presentation so pending and ready generated image identities remain hidden while failed identities and literal image-looking text stay visible, and verify caret mapping, surrounding typing, selection replacement, atomic deletion, undo/redo, and out-of-order preparation.
- [x] 2.2 Add attachment-only submitted-prompt presentation that omits generated markers and empty text chrome while retaining timestamps, prompt navigation, actual images, textual fallbacks, and unchanged `a1 pi` rendering; verify ordinary and image-only transcript cases.
- [x] 2.3 Preserve hidden identity behavior through ordinary, steering, follow-up, compaction-queued, copy/history, restart recall, and resubmission paths, and verify attachment bytes, ordering, limits, and sidecar-backed recovery are unchanged.

## 3. Route image feedback through the dock notice

- [x] 3.1 Publish concise coalesced attachment feedback when live pasted images become ready, and verify singular/multiple attachments update one notice without identifiers, extra transcript rows, selection content, or persistence.
- [x] 3.2 Publish recognized successful processing notes from incremental user-message delivery after normal prompt notice dismissal, and verify wrapping, multiline attachment order, working-status placement, replacement/dismissal, no replay on resume, and unchanged actionable failure presentation.

## 4. Validate the integrated behavior

- [x] 4.1 Run focused deterministic editor, prompt-chip, transcript-projection, shell-paste, dock-notice, persistent-history, and pinned-comparison tests; verify no generated marker or successful dimension note appears in bare-A1 prompt presentation while semantic context and image delivery remain exact.
- [ ] 4.2 Build the candidate and perform the color-preserving `./scripts/dev` manual flow for single, multiple, resized, image-only, failed, deleted/undone, and recalled images; record that notices appear above the editor, prompt text stays uncluttered, images remain usable, and `./scripts/dev pi` remains unchanged.
