## Context

Bare A1's complete-frame selector captures the visible selected text into one literal `SelectionCopySnapshot`. Both automatic copy-on-release and explicit `Ctrl+C` submit that snapshot through the bounded response-copy coordinator. The snapshot currently retains all selected outer whitespace, and acknowledgement metadata is computed from its literal rows.

Prompt-local copy/cut and semantic `/copy` enter the coordinator through separate exact-text routes. The comparison profile uses Pi's selection behavior, and regular mode remains terminal-owned.

## Goals / Non-Goals

**Goals:**
- Put the selected frame text on the clipboard without whitespace before its first or after its last non-whitespace character.
- Preserve all whitespace inside those boundaries, including command arguments, multiline indentation, and blank lines.
- Keep automatic and explicit frame-selection copies consistent and keep acknowledgement counts aligned with delivered text.
- Preserve bounded asynchronous clipboard delivery, selection painting, and route isolation.

**Non-Goals:**
- Trimming every line independently or dedenting code blocks.
- Changing prompt-local copy/cut, `/copy`, clipboard paste, `a1 pi`, or regular-mode terminal selection.
- Adding a preference for the normalization.

## Decisions

### 1. Normalize at complete-frame snapshot capture

After semantic selection extraction and ANSI/control removal, apply JavaScript's Unicode-aware `trim()` once to the complete selected string before constructing the literal snapshot. Store the normalized text and its length in the snapshot.

This boundary is shared by automatic release copying and retained-selection `Ctrl+C`, while remaining upstream of the coordinator routes used for exact prompt or last-message text. Keeping normalization in capture also makes the existing acknowledgement calculation count the exact normalized payload without retaining a second text representation.

Trimming the complete string rather than each row preserves whitespace after embedded newlines and all internal blank lines. For example, `"\n   npm run develop   \n"` becomes `"npm run develop"`, while `"first\n   second"` keeps the indentation before `second`.

### 2. Keep visual selection exact and normalize only clipboard output

Selection endpoints, highlighted cells, `selectedText()`, gesture ownership, and retained-selection state continue to represent exactly what the reader selected. Only the immutable clipboard snapshot is normalized. This avoids making the visible highlight disagree with pointer geometry and preserves existing selection projection and repaint behavior.

### 3. Permit an empty normalized payload

A nonempty visual selection containing only whitespace normalizes to the empty string. The clipboard helper will treat that as a valid bounded payload and submit it, clearing the destination rather than leaving stale clipboard content. As today, no success acknowledgement appears for a payload without non-whitespace characters.

The helper's row, source-size, byte-size, timeout, cancellation, native/injected/terminal destination, and control-sequence limits remain in force. Empty payload support does not relax malformed protocol handling or size admission.

### 4. Prove boundary and route behavior at focused layers

Component tests will cover spaces, tabs, newlines, Unicode whitespace, multiline internal indentation, reverse selection, and whitespace-only capture. Shell/transport tests will prove both release and `Ctrl+C` deliver normalized text, acknowledgements use the normalized count, empty normalized text reaches the injected and terminal-safe preparation paths, and exact semantic routes remain unchanged.

## Risks / Trade-offs

- **[Users intentionally want outer indentation]** → Limit the change to bare A1 complete-frame selection, preserve all interior whitespace, and leave exact semantic/editor copy routes unchanged.
- **[Whitespace-only copy leaves old clipboard data]** → Submit a valid empty payload rather than suppressing the copy.
- **[Acknowledgement reports the pre-trim count]** → Normalize before snapshot metadata and assert the displayed count against the delivered payload.
- **[Trimming changes selection painting]** → Keep `selectedText()` and selection geometry unchanged; normalize only `captureSelectedText()` output.

## Migration Plan

No migration is required. Implement focused failing tests, normalize complete-frame snapshots, allow bounded empty-payload delivery, then run focused component/session-shell/transport tests, typechecking, build, architecture/documentation checks, and strict OpenSpec validation. Rollback restores exact outer-whitespace copying without affecting settings or stored data.
