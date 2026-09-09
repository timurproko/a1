## Context

See `proposal.md` for motivation. Investigation of current `origin/develop` (`5ac009e`) establishes two concrete paths:

1. `OwnedUiSessionShell` wires `onSubmit` to `void this.submit(text)`. Its `#execute` forwards to `PiEngineAdapter.execute`, which invokes `assertOwnedUiCommand` before its execution `try/catch`. A validation throw therefore rejects a fire-and-forget editor callback. The supplied release-279 stack identifies exactly this image-data check. The check rejects empty/non-string/NUL-containing data or more than 8 MiB of encoded text; the screenshot alone does not prove which predicate failed. Clipboard canonicalization currently validates representation but does not share that size bound.
2. Bare A1 composes its custom viewport over Pi's fullscreen TUI. `TranscriptViewport.pressSelection` declines a row when no selectable document rows exist. `SessionViewportController.handlePreInput` suppresses a declined press only for known transient-tail rows, leaving an ordinary empty area unclaimed. `routeMouseInput` deliberately forwards unclaimed reports. Pi's fullscreen runtime receives them and provides its own selection plus the observed `Copied!` flash.

Normal disposal disables A1 pointer reporting in `session-shell.ts` and stops the runtime, but a process-level failure can bypass this asynchronous path. The launch owner observes child completion without restoring owned terminal modes. This design is cross-cutting because both local input recovery and a process lifecycle backstop are necessary; simply hiding crash output does not repair either problem.

## Goals / Non-Goals

**Goals:**
- Separate correctable input rejection from fatal runtime failure.
- Keep attachment admission, validation, and rejected-draft recovery consistent without sending partial requests.
- Route a pointer sequence to one owner for its entire lifetime, including empty-screen sequences.
- Make owned terminal restoration exception-safe, bounded, and testable independently of a live desktop.

**Non-Goals:**
- Guarantee survival of every programming error, memory exhaustion, power loss, or simultaneous termination of UI and all launch owners.
- Remove attachment bounds, choose new image resizing/compression policy, or promise that every provider accepts locally valid images.
- Replace Pi's terminal stack, modify installed dependency files, change `a1 pi` selection, or customize arbitrary transparent commands.
- Treat selection fallthrough as the cause of the supplied image validation crash; they are independently reproducible bugs.

## Decisions

### 1. Catch at the local submission boundary, not by continuing after process failure

Introduce a guarded owned submission operation covering preparation, validation, and asynchronous dispatch. Every editor submission callback must attach a rejection handler; queued, steer, and follow-up paths must use the same guard rather than bypassing it. Prefer structured rejected/failed results for expected invalid prompt content. Keep strict contract assertions for programmer-facing invalid command envelopes; do not pass malformed correlation/session identifiers into command-outcome publication while trying to report validation failure.

Validate the prepared request before treating it as dispatched. Track whether the operation was rejected locally or whether provider acceptance is uncertain. Never automatically resend on failure. Capture only the immutable submission draft/chip references needed to recover a pre-dispatch rejection, keeping newer editor input authoritative. If the editor is unchanged/empty, restore the rejected draft; otherwise retain an explicitly recoverable failed draft through the existing owned UI workflow surface. A queued invalid submission is removed from active retry work but retained for correction; subsequent valid items are not discarded.

Alternative rejected: installing a global `unhandledRejection` logger and continuing the agent. That masks a broken callback boundary, loses draft state, and can keep an inconsistent session alive.

### 2. Share the existing attachment policy and expose precise rejection reasons

Centralize the current eight-image and 8,388,608-byte canonical-base64 limits in the owned attachment boundary. Reuse the policy during clipboard/chip admission and final validation, accounting for canonical padding before size comparison. Keep the existing malformed-clipboard behavior: valid clipboard text fallback or unchanged prompt. Surface an additional bounded diagnostic for size/count rejection rather than accepting an unusable chip and throwing only on Enter. Final validation remains necessary for restored, queued, and non-clipboard inputs.

Use reason codes and trusted explanatory messages for empty/invalid representation, encoded size, and count failures; never interpolate attachment data. Check cheap size limits before unnecessary decoded allocations. For valid inputs, retain exact bytes/MIME and canonical base64; do not silently downsample, truncate, drop attachments, or strip all limits.

Alternative rejected: increasing the size constant speculatively. The supplied stack does not establish the triggering image's length, and a larger limit would still leave callback rejection fatal. A future product request can change limits deliberately.

### 3. Suppress unowned default-screen selection sequences before Pi sees them

Extend the existing viewport pre-input ownership state to claim a left-button sequence that starts on an empty/non-selectable default-screen area. Consume its press, motion (including no-button motion), and release even if content arrives or the pointer crosses selectable rows. Clear suppression on release, reset, surface handoff, and disposal. A fresh sequence over selectable content continues through A1's existing controller. Handle the no-frame/startup window with the same policy, not an unconditional pass-through to the fullscreen runtime.

Continue using per-report routing so interleaved keyboard bytes remain untouched. Modal/replacement surfaces retain their early ownership bypass, and the policy is installed only for bare A1. Assert that no default-screen rejected selection sequence reaches the underlying selection handler, including non-selectable margins.

Alternative rejected: globally disabling mouse support on the shared Pi TUI. That risks settings controls, editor behavior, links, overlays, and comparison profiles. Merely suppressing the `Copied!` flash also leaves fallback paint and clipboard mutation active.

### 4. Restore in layers, with the surviving owner as the last fallback

Make ordinary shell/application disposal exception-safe: terminal stop/mode restoration must be attempted even if transcript exit rendering, backend unbinding, or another disposer throws. Separate best-effort terminal reset from asynchronous application teardown so fatal cleanup never depends on session health.

Install a process-scoped fatal boundary before the bare-A1 UI activates terminal modes, covering uncaught exceptions and otherwise unhandled rejections. Use a once-only guard, cease normal dispatch, attempt immediate terminal reset, perform bounded remaining teardown, retain diagnostics, and terminate nonzero. Use a short explicit deadline (target one second for UI cleanup) and a minimal emergency path if cleanup fails. Remove lifecycle listeners on normal shutdown. Do not swallow fatal exceptions and return to the session.

Place fallback restoration in the surviving owned-launch boundary after child exit and only for bare A1 with an inherited writable terminal and an unsuccessful/unacknowledged teardown outcome. Reuse one declared mode-reset sequence for both paths. Do not reset while the child can still write, do not replay a final transcript from the parent, and do not invoke terminal-reset behavior on arbitrary commands. Native raw/console-mode restoration remains with the process that owns or can restore that state; the fallback must not pretend ANSI sequences repair every native input flag.

Audit the pinned runtime's enabled modes rather than resetting only `1003`: include all mouse modes that it or A1 can enable (notably `1002`, `1003`, and `1006`), paste/keyboard modes, synchronized output, cursor, wrapping, scroll margins, and alternate-screen state. Repeated cleanup must remain harmless and preserve ordinary exit output. If the terminal is gone, exit without a recursive output failure. If every owner is killed, terminal restoration is not guaranteed and remains an explicit limitation.

Alternative rejected: relying only on `finally` in `runOwnedUi`. It cannot handle a rejection from an unrelated callback or cleanup code that never settles. A process handler alone also cannot run after forced termination of that process.

### 5. Keep diagnostics bounded and payload-free

Write a local fatal record beneath the product runtime directory, partitioned by launch identity. Limit each record to 16 KiB and retention to the latest ten records. Record release ID, Node version/platform, timestamp, failure origin, known-safe error classification/code, and normalized stack locations. Omit arbitrary exception message content when it cannot be shown safe; do not serialize command objects, prompts, image data, environment variables, or terminal input. Strip control characters from printable summaries. Emit a short restored-terminal failure message and record location when available. Storage failure is best-effort and cannot block exit; cleanup failures remain secondary to the original classification.

Alternative rejected: redirecting all raw stderr/input into an unbounded log. It risks leaking conversation data, consumes disk indefinitely, and can interfere with interactive rendering.

### 6. Exercise the actual failing boundaries

- Unit tests cover canonical padded/unpadded data below/at/above the encoded limit, empty/malformed data, eight/nine images, and text-only commands.
- Shell integration tests drive the editor's real submit callback, not only awaited `shell.submit`, then assert local rejection, draft recovery, continued typing, a subsequent successful request, and no duplicate dispatch. Include delayed failures racing with a newer draft and queued/steering cases.
- Fullscreen runtime tests drive empty-screen press/motion/release and mixed chunks through the real pre-input adapter. Check emitted paint and clipboard/control output for absence of fallback highlight, OSC 52 copying, and `Copied!`; then add content and verify owned selection. Preserve modal and comparison cases.
- Isolated subprocess tests inject a callback rejection, an uncaught exception, a throwing/stalled disposer, and abrupt UI termination with a surviving owner. Assert nonzero outcomes, bounded completion, diagnostic privacy/retention, and reset output ordered after child output. Simulated terminal state verifies reporting off, cursor/wrapping restored, and no alternate-screen ownership. No test drives the user's desktop.
- Physical Git Bash/Windows Terminal review remains necessary to confirm post-failure mouse movement does not reach the shell and clipboard/selection visuals match expectations.

## Risks / Trade-offs

- [A larger valid screenshot exceeds the retained local limit] -> Show a precise encoded-size rejection and retain the session/draft; do not claim all images are supported.
- [Draft restoration races with new input] -> Use submission identity and editor revision checks; keep a separate failed draft instead of overwriting new work.
- [Broad pointer suppression steals controls] -> Scope to the default bare-A1 surface and sequence ownership; exercise overlays, editor, links, rail, and comparison profiles.
- [Repeated reset damages normal exit output] -> Share idempotent restoration and limit parent fallback to unsuccessful/unacknowledged teardown after child termination.
- [Fatal logging rethrows or reveals data] -> Use safe structured fields, hard size/retention bounds, secondary-error isolation, and unwritable-output tests.
- [Process or terminal destruction defeats cleanup] -> Guarantee best effort only when at least one launch owner and a writable terminal survive; do not promise recovery after total process-tree termination.

## Migration Plan

No persisted profile/session migration is required. Merge this specification first; implement against the accepted change in a separate stream. Keep code acceptance pending until required CI and user-run Windows Terminal/Git Bash checks pass. Existing installed releases remain unchanged until the implementation is built/published. Rollback uses the prior immutable release; no session-data rewrite needs reversal.

## Open Questions

- The original attachment's exact encoded length and representation are not available. Record whether it reproduces the size predicate or another predicate if the user supplies it; boundary fixtures already cover each path without needing the private image.
