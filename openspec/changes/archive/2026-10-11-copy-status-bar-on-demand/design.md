# Design

## Context

See `proposal.md` for motivation. Bare A1 already paints one selection across transcript and dock rows, but clipboard extraction has one policy for both release-time automatic copy and explicit `Ctrl+C`: only persistent transcript anchors are admitted. All dock rows currently share the same positional anchor kind, so extraction cannot distinguish the rendered footer/status bar from editor, autocomplete, widget, notice, and other dock chrome.

The status bar is rendered as the final footer rows of the shell's dock layout. Its display may include repository/session identity, usage information, model/thinking state, extension status, and links. Copy preparation must continue using the existing immutable, bounded, ANSI-free snapshot path, and selection anchoring must remain stable while transcript output moves.

## Goals / Non-Goals

**Goals:**

- Identify the exact visible dock rows supplied by the footer/status presenter without inferring them from text.
- Apply separate eligibility policies to release-time automatic copy and explicit `Ctrl+C` capture.
- Preserve selected display columns, grapheme boundaries, row order, outer-whitespace normalization, and existing asynchronous clipboard delivery.
- Keep retained footer selection pinned while transcript output changes.

**Non-Goals:**

- Making prompt input, autocomplete, widgets, notices, `Working…`, steering, blank alignment rows, or arbitrary extension surfaces copyable.
- Adding a new setting or changing the meaning of the existing fullscreen auto-copy setting.
- Changing `/copy`, keyboard-selected editor copy/cut, clipboard transport, acknowledgement presentation, `a1 pi`, or regular terminal selection.

## Decisions

### 1. Declare status-row eligibility at dock composition

The shell dock layout will return status-copy metadata alongside its rows. Because the footer is already rendered as a distinct final layout segment, the shell can mark those exact visible rows before the combined dock is handed to the viewport. The viewport will retain that eligibility with each dock row's existing suffix-relative anchor.

Text-pattern detection was rejected because path, model, token, extension, and translated values are not stable identifiers. Treating every dock row as status was rejected because it would expose prompt drafts, autocomplete entries, notices, and extension widgets through `Ctrl+C`.

### 2. Capture selections with an explicit intent

Viewport capture will accept an automatic or explicit intent. Automatic capture will preserve the current persistent-transcript-only filter. Explicit capture will use the same extraction path but additionally admit rows declared as footer/status rows. The controller will request automatic capture only on pointer release when copy-on-select is enabled and explicit capture only for retained-selection `Ctrl+C`.

A post-capture filter in the shell was rejected because the immutable snapshot no longer carries enough row provenance to remove dock chrome safely. Disabling copy-on-select for any mixed status range was also rejected because it would regress the existing automatic transcript copy when a drag ends in the footer.

### 3. Preserve one normalized payload for mixed explicit selections

Explicit capture will emit eligible transcript and status rows in their visible frame order while omitting ineligible rows. Existing prompt semantics remain context-sensitive: a lone submitted prompt is copied without prompt chrome, while a prompt participating in a larger transcript range retains its current bulk-copy behavior. The complete payload will continue to receive one outer Unicode-whitespace trim before bounded delivery.

Copying only status rows whenever a selection touches the footer was rejected because a deliberate cross-frame `Ctrl+C` should not silently discard eligible transcript text. Inserting placeholders for excluded dock rows was rejected because excluded UI is not clipboard content.

### 4. Keep delivery and acknowledgement behavior unchanged

Both capture intents will produce the existing immutable `SelectionCopySnapshot`, use the current asynchronous coordinator, and show the existing successful-copy acknowledgement. A status-only release produces no snapshot, clipboard write, or acknowledgement; the later explicit `Ctrl+C` produces one snapshot and one acknowledgement. Empty or whitespace-only eligible status selections remain no-ops and are cleared by explicit copy according to existing selection behavior.

## Risks / Trade-offs

- **[Dock layout changes misclassify a row]** → Derive eligibility from the footer segment boundary and cover widgets, input, autocomplete, notices, and footer rows in focused layout tests.
- **[Automatic copy accidentally includes status text]** → Exercise status-only and mixed ranges with copy-on-select enabled and assert release snapshots remain transcript-only.
- **[Explicit mixed copy changes transcript semantics]** → Reuse the existing transcript extraction path and add prompt, transcript, and status combinations to viewport and shell tests.
- **[Pinned status selection drifts while output advances]** → Keep suffix-relative dock anchors and cover retained status selection across followed output.
- **[Extension footer replacement creates ambiguity]** → Treat the actual footer presenter output occupying the status-bar segment as eligible; unrelated extension widgets remain excluded.

## Migration Plan

No persisted-data migration is required. After approval, add focused failing tests, introduce status-row metadata and intent-aware capture, then run the bounded viewport and session-shell selection suites plus typechecking. Rollback removes the metadata and intent distinction, restoring transcript-only frame copying without changing settings or stored sessions.
