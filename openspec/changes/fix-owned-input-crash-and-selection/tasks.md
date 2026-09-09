## 1. Reproduce the reported boundaries

- [x] 1.1 Add an editor-callback regression reproducing `owned-UI prompt image data is invalid` with a synthetic over-limit canonical image; verify it exercises the real submit callback and detects the escaped rejection before the fix without needing the user's private image.
- [x] 1.2 Add a real fullscreen-runtime empty-transcript drag regression; verify it detects fallback selection paint and clipboard/copy feedback before the fix rather than only checking the viewport controller's return value.
- [x] 1.3 Add isolated child-process fixtures for fatal callback rejection, uncaught exception, failed/stalled disposal, and abrupt UI termination; verify fixtures cannot affect user-owned terminals or process trees.

## 2. Make image submission recoverable

- [x] 2.1 Share the existing eight-attachment and 8,388,608-byte canonical-base64 limits between image admission and final validation; verify below/at/above-boundary, padded/unpadded, empty, malformed, eight/nine-image, and text-only cases.
- [x] 2.2 Add trusted reason-coded attachment diagnostics at admission and submission without embedding image data; verify oversized/count errors are actionable and malformed clipboard input retains the accepted text-fallback or unchanged-prompt behavior.
- [x] 2.3 Guard prompt preparation and execution at the owned callback boundary, distinguishing local rejection from uncertain dispatch; verify both synchronous throws and rejected promises produce in-application feedback without unhandled rejection, partial dispatch, or automatic retry.
- [x] 2.4 Preserve rejected pre-dispatch draft text and chip references with editor-revision protection and an explicit recovery path when newer input exists; verify correction/resubmission dispatches once and late failure does not overwrite a newer draft.
- [x] 2.5 Route steering, follow-ups, and compaction-queued submissions through the same validation/recovery path; verify an invalid queued item is reported once, remains recoverable, and does not block or discard valid queued work.
- [x] 2.6 Run the reported-boundary shell tests against the corrected path; verify a supported image reaches the agent session unchanged and rejected input is followed by usable typing and a successful text turn.

## 3. Keep empty-screen selection under A1 ownership

- [x] 3.1 Add complete pointer-sequence suppression for rejected selection starts on the default bare-A1 screen, including no-frame/empty and non-selectable margins; verify press, motion, no-button motion, and release never start fallback selection or copying.
- [x] 3.2 Reset suppression on release, reset/replacement, ownership handoff, and disposal while preserving it across arriving content; verify fresh post-release content drags still use A1 selection.
- [x] 3.3 Cover mixed pointer/keyboard chunks and modal/replacement-surface bypass; verify keyboard bytes arrive once in order and settings/editor controls retain their pointer behavior.
- [x] 3.4 Extend fullscreen integration coverage for empty and populated sessions; verify no fallback highlight, OSC 52 copy, or `Copied!` on suppressed drags, and unchanged A1 transcript/editor selection, wheel, scrollbar, links, and `a1 pi` selection.

## 4. Make terminal restoration crash-safe

- [x] 4.1 Audit modes enabled by A1 and the pinned terminal runtime and define one reusable bounded emergency-restoration path; verify simulated terminal state disables all owned mouse/paste/keyboard modes and restores cursor, wrapping, scroll margins, synchronized output, and alternate-screen state.
- [x] 4.2 Make ordinary shell/application disposal attempt terminal stop despite rendering, backend-unbind, or disposer failures; verify throwing/stalled disposal cannot leave restoration unattempted and normal exit output is not duplicated.
- [x] 4.3 Install a once-only fatal boundary before bare-A1 terminal activation with a bounded teardown deadline and nonzero exit; verify isolated uncaught-exception/rejection fixtures stop normal dispatch, attempt restoration, and cannot recursively re-enter fatal handling.
- [x] 4.4 Add surviving-owned-launch fallback restoration after abnormal child completion; verify reset writes occur after the final child output, unsuccessful status is preserved, and unrelated transparent commands and comparison selection policy remain untouched.
- [x] 4.5 Retain sanitized fatal records with a 16 KiB per-record cap and latest-ten retention and emit a short post-restoration diagnostic; verify useful release/runtime/stack-location fields, absence of prompt/image/credential/input payloads, and safe behavior on unwritable storage/output.
- [x] 4.6 Complete subprocess lifecycle coverage for abrupt child death, failed/stalled cleanup, duplicate cleanup, and normal exit; verify bounded completion, restored modes, correct outcomes, and no duplicated final transcript/resume hint.

## 5. Integration and user acceptance

- [ ] 5.1 Submit an implementation-only pull request citing this accepted change and obtain required CI results; verify all change-caused required failures are resolved and no installed Pi files or unrelated paths were changed.
- [x] 5.2 Provide the exact built worktree/commit and color-preserving `./scripts/dev` handoff; verify the checklist directly covers empty-screen dragging, valid screenshot submission, oversized-image rejection, draft correction, content selection, and continued conversation.
- [ ] 5.3 Obtain user-run Windows Terminal/Git Bash confirmation for normal and controlled abnormal exit; verify post-exit pointer movement no longer types mouse reports, clipboard behavior is correct, and a comparison run retains pinned selection behavior.
- [ ] 5.4 Record explicit user acceptance and merge authorization before manually merging code; verify the implementation PR is merged before creating the acceptance/spec-sync/archive follow-up and cleaning retained worktrees.
