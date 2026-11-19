## Context

See `proposal.md` for motivation. The initial investigation at `5ac009e` established two concrete paths, subsequently addressed in PR #287:

1. `OwnedUiSessionShell` wires `onSubmit` to `void this.submit(text)`. Its `#execute` forwards to `PiEngineAdapter.execute`, which invokes `assertOwnedUiCommand` before its execution `try/catch`. A validation throw therefore rejects a fire-and-forget editor callback. The supplied release-279 stack identifies exactly this image-data check. The check rejects empty/non-string/NUL-containing data or more than 8 MiB of encoded text; the screenshot alone does not prove which predicate failed. Clipboard canonicalization currently validates representation but does not share that size bound.
2. Bare A1 composes its custom viewport over Pi's fullscreen TUI. `TranscriptViewport.pressSelection` declines a row when no selectable document rows exist. `SessionViewportController.handlePreInput` suppresses a declined press only for known transient-tail rows, leaving an ordinary empty area unclaimed. `routeMouseInput` deliberately forwards unclaimed reports. Pi's fullscreen runtime receives them and provides its own selection plus the observed `Copied!` flash.

The initial terminal-cleanup design below is implemented in PR #287 and must remain intact. This amendment is based on its merge commit `c7977493dbe82c0802cfe7f393a7021932f02aaa`; required CI passed, but the user rejected acceptance after a paste produced the new 8 MiB error. The prior release stack still does not prove its precise predicate, whereas the new report explicitly confirms oversized-source rejection.

Read-only comparison with `D:/Backups/pi/v2/paste/images.ts` and `paste/index.ts` establishes the missing behavior: the prototype admits source files up to 20 MiB by default, uses Photon to target less than 4.5 MiB of base64, limits initial resizing to a 2000-pixel longest edge, tries PNG then JPEG qualities 85/70/55/40, and scales further if necessary. It also has a Windows PowerShell fallback and a 5 MiB decoded API guard. Its `async` resize function nevertheless performs synchronous WASM work, and its fallback launches synchronously; copying it verbatim would not meet the user's new responsiveness requirement. Its last-chance submission path can also discard failed images, which conflicts with this change's no-partial-dispatch guarantee.

The current A1 `system-clipboard.ts`, `clipboard-image.ts`, and `prompt-chips.ts` enforce the final encoded limit on original clipboard content. All three early boundaries need reconciliation with source intake, not just a resize call after them. Large binary-array validation and base64 conversion also happen on the UI thread today. Codec loading, acquisition, and CPU preparation must be separated from immediate paste acknowledgment.

## Goals / Non-Goals

**Goals:**
- Separate correctable input rejection from fatal runtime failure.
- Keep source admission, background preparation, final validation, and rejected-draft recovery consistent without sending partial requests.
- Make image paste feel immediate through a stable pending chip and responsive input, independent of first-load or conversion duration.
- Retain useful screenshot quality while fitting finite output limits, without moving source-sized computation onto the UI event loop.
- Route a pointer sequence to one owner for its entire lifetime, including empty-screen sequences.
- Make owned terminal restoration exception-safe, bounded, and testable independently of a live desktop.

**Non-Goals:**
- Guarantee survival of every programming error, memory exhaustion, power loss, or simultaneous termination of UI and all launch owners.
- Remove attachment bounds, preserve every oversized source byte unchanged, add a general image editor, or promise that every provider accepts locally valid images.
- Guarantee zero OS/terminal latency or complete every conversion within the feedback budget; immediate acknowledgment and continuous interactivity are the contract.
- Replace Pi's terminal stack, modify installed dependency files, change `a1 pi` selection, or customize arbitrary transparent commands.
- Treat selection fallthrough as the cause of the supplied image validation crash; they are independently reproducible bugs.

## Decisions

### 1. Catch at the local submission boundary, not by continuing after process failure

Introduce a guarded owned submission operation covering preparation, validation, and asynchronous dispatch. Every editor submission callback must attach a rejection handler; queued, steer, and follow-up paths must use the same guard rather than bypassing it. Prefer structured rejected/failed results for expected invalid prompt content. Keep strict contract assertions for programmer-facing invalid command envelopes; do not pass malformed correlation/session identifiers into command-outcome publication while trying to report validation failure.

Validate the prepared request before treating it as dispatched. Track whether the operation was rejected locally or whether provider acceptance is uncertain. Never automatically resend on failure. Capture only the immutable submission draft/chip references needed to recover a pre-dispatch rejection, keeping newer editor input authoritative. If the editor is unchanged/empty, restore the rejected draft; otherwise retain an explicitly recoverable failed draft through the existing owned UI workflow surface. A queued invalid submission is removed from active retry work but retained for correction; subsequent valid items are not discarded.

Alternative rejected: installing a global `unhandledRejection` logger and continuing the agent. That masks a broken callback boundary, loses draft state, and can keep an inconsistent session alive.

### 2. Separate source admission from prepared-output policy

Keep shared final command validation at eight attachments and 8,388,608 canonical-base64 bytes per image, including padding. Introduce a distinct source policy: at most 20 MiB of compressed image bytes, at most 40 million decoded pixels, and no source dimension above 32,768 pixels. The pixel ceiling includes ordinary 4K and 8K screenshots while limiting decompression exposure. Check compressed length and format/header dimensions before full decode; reject formats whose dimensions cannot be checked safely. For base64-only readers, apply the source-equivalent encoded bound and strict canonical validation before allocating decoded data, in the background executor. These are safety limits, not the output limit that previously rejected useful screenshots.

A draft reserves at most eight image slots, including preparing, ready, and failed chips. Final validation still protects restored, queued, and non-clipboard command inputs; it must not silently normalize arbitrary malformed command envelopes. Clipboard-origin images pass through source validation and preparation before becoming ready attachments. Preserve existing malformed-image text fallback and trusted, payload-free diagnostics; distinguish source bytes/pixels, output size, count, unsupported format, codec unavailable, processing failure, and timeout. A final over-limit assertion remains a defense, not the normal paste UX.

Alternative rejected: raising/removing the 8 MiB command limit or moving that same guard ahead of normalization again. Neither restores prototype behavior with bounded payloads.

### 2a. Normalize for screenshot quality, with bounded effort

Use the prototype's conservative output target: canonical base64 strictly below 4.5 MiB (4,718,592 bytes), and decoded output at most 5 MiB. Apply a smaller known downstream byte/dimension constraint when exposed by the active engine; do not invent provider-specific limits or claim universal API acceptance. Compute encoded length as `4 * ceil(bytes / 3)` and verify the actual final output. Keep local mandatory paste preparation distinct from the engine's existing provider-side auto-resize setting: do not toggle that setting or rely on later provider processing to rescue a source rejected locally. Revalidate a waiting prepared submission if its model changes before dispatch.

Header-validated sources already below the effective target and satisfying downstream dimensions retain exact bytes/MIME; do not decode and re-encode them just to manufacture uniform output. For larger sources, decode once, respect orientation, preserve aspect ratio, and start at no more than 2000 pixels on the longest edge without upscaling. Prefer high-quality Lanczos-style resampling and PNG for text/transparency. Encode candidates sequentially, stopping on the first that fits: PNG first, then JPEG at 85, 70, 55, and 40 quality. If JPEG is required, composite transparency against a documented white background. MIME must describe the actual candidate, not the source extension. Indicate resized/recompressed status on the attachment without dumping numerical diagnostics into the prompt.

If needed, reduce the working dimensions by 0.75 and repeat, using the original decoded source rather than cumulatively resampling a previous result. Bound the search to four dimension levels and stop before shrinking an initially larger source below a 1024-pixel longest edge; a stricter known downstream dimension bound is an explicit exception. Do not shrink an already-smaller source merely to force success. Reject cleanly if no candidate fits instead of scaling to 1x1 as the prototype could. For formats such as animated GIF, retain bytes on the pass-through path; if conversion would silently discard animation or unsupported color/orientation semantics, give a specific recoverable error rather than claiming a faithful conversion.

Use a directly declared, pinned Photon/WASM codec dependency in an owned worker; verify its orientation, format, and output behavior with real fixtures before relying on it. Package the worker entry and WASM asset explicitly. Do not copy the prototype's global `fs.readFileSync` monkey-patch or mutate installed Pi dependencies. The required packaged codec is the cross-platform resize path; do not add the prototype's synchronous PowerShell compression fallback. A missing codec is a recoverable packaging/preparation failure, covered by packaged validation, not a reason to send oversized original data.

Alternatives rejected: always converting everything to JPEG, dropping failed images before dispatch, unbounded quality/scale loops, and cloning the prototype's synchronous implementation. They respectively damage small screenshots, send an unintended partial prompt, waste resources, or freeze the editor.

### 2b. Acknowledge paste before acquisition and execute expensive work off-thread

At the paste action, reserve a stable marker at the current selection/caret and request a render before awaiting clipboard I/O or lazy codec initialization. Until the clipboard kind is known, this is a pending paste marker; resolve it to a preparing image chip, normal text/path chips, or no content using the existing fallback policy. Position tracking must preserve text typed after the action. Target visible acknowledgment within 100 ms on the acceptance machine, both cold and warm. This target does not gate image readiness or pretend OS clipboard latency is zero.

Move expensive binary validation, base64 normalization/encoding, decoding, resizing, and compression into a lazily loaded worker. Use asynchronous platform clipboard calls/subprocesses, audit native bindings for synchronous source-sized work, and place blocking acquisition in an isolated executor when necessary. A promise around synchronous WASM/native work is insufficient. Do not perform image work in render methods or repeat normalization each time `prepareSubmission` inspects a ready chip. Preserve copy/write-before-read ordering already enforced by the clipboard adapter.

Limit image conversion to one active worker and admit no more than eight retained source jobs across the session, with an aggregate compressed-source ceiling of 160 MiB; moving drafts to waiting submissions must not bypass this global bound. Repeated paste acquisitions preserve action identities and capture their own clipboard results promptly, rather than reading the clipboard only when a compression queue slot opens. Do not promise that the OS can recover clipboard contents changed before acquisition. Queue only bounded captured inputs; reject overload visibly without dropping older work. Transfer binary buffers where practical, retain only the current candidate and source decode, and free codec allocations in all paths. Keep original source bytes only while a live pending/failed reference can use them, subject to the same retention budget; release them after success/removal, or offer re-paste rather than retaining an unbounded failed-image archive.

Apply a 15-second wall-clock deadline from each paste action, including acquisition and queue wait. Cancellation or timeout must terminate/abort work, not just abandon an unresolved promise. Ignore late messages by job/session identity and recreate a failed worker lazily for later actions, without automatic retry of the failed image. Stop workers and clipboard subprocesses during normal disposal and within the existing fatal-cleanup budget. Lazy loading must not enlarge synchronous UI startup work; verify cold first use and packaged asset resolution, not only a warm development checkout.

Alternatives rejected: doing work in an `async` function on the UI thread, waiting for pixels before displaying a chip, eight simultaneous full decodes, and background jobs with no deadline. They hide or relocate latency without delivering a responsive bounded system.

### 2c. Model pending attachments and waiting submissions explicitly

Each attachment has stable identity, session generation, and preparing/ready/failed/canceled state. Update that identity in place; never insert completion text at whatever caret position happens to be current. A removed unsubmitted chip cannot be resurrected. A submission acquires references to an immutable text/chip snapshot so later draft edits cannot change what is sent. On Enter with pending references, expose one visible cancellable waiting intent through the owned submission/queue surface, allow a new draft, and asynchronously await all references. Repeated callbacks for the same intent must coalesce, not duplicate dispatch. Once ready, validate and dispatch once using decision 1; dispatch uncertainty still forbids automatic resend.

A preparation failure rejects the whole waiting intent locally, leaves it recoverable with newer-draft protection, and does not discard unrelated valid work. Explicit retry creates a new preparation attempt, not an automatic dispatch retry. Ordinary, steer, follow-up, and compaction paths share this readiness gate. Queue cancellation must work before provider dispatch, including when preparation is stalled. Deleting an unsubmitted chip cancels that draft reference; canceling a waiting intent removes its captured references. Abort a job only when no live draft/waiting reference needs it. Session replacement/reset and disposal invalidate all old-generation completions and release resources without interfering with terminal reset.

Alternative rejected: submitting text immediately and attaching the image later, or merely disabling all editor input until conversion finishes. The former changes the user's request and the latter violates immediate-paste interactivity.

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

- Unit tests cover canonical padded/unpadded data below/at/above source and final encoded limits, empty/malformed data, source bytes/pixels/dimensions, pending-inclusive eight/nine images, and text-only commands. Use real decodable, synthetic screenshots above 8 MiB encoded but within source safety limits; repeated-character base64 is not sufficient for resize regressions.
- Codec fixtures verify pass-through byte equality, real PNG/JPEG signatures and MIME, orientation/transparency, aspect ratio/no upscaling, output byte/dimension bounds, PNG preference, highest-fitting JPEG quality, bounded iteration/failure, and no progressive re-encoding. Include high-entropy screenshots, text crops, thin lines, and 4K/8K source dimensions; retain fixture-generation recipes, not private clipboard images.
- Responsiveness tests hold acquisition and preparation unresolved, drive the actual paste callback, and prove acknowledgment, subsequent keyboard/selection/render events, cancellation, and streaming progress before completion. Include cold codec load, worker failure, multiple jobs, queue pressure, and event-loop heartbeat checks with a genuinely CPU-busy background worker. A mocked resolved promise alone cannot establish non-blocking behavior. Use deterministic event ordering in required CI, not fragile shared-runner wall-clock thresholds; record feedback latency and UI stalls on the manual acceptance machine against the 100 ms target.
- Race tests exercise Enter-before-ready, newer drafts, repeated submit callbacks, failed waiting images, out-of-order acquisition/completion, copy-then-paste ordering, deletion/cancellation, reset/session replacement, and shutdown. Assert exact prompt/image identity, one-or-zero dispatch as appropriate, bounded resources, and no resurrected chips. Development and packaged smoke tests verify the worker and codec assets on supported platforms.
- Shell integration tests drive the editor's real submit callback, not only awaited `shell.submit`, then assert local rejection, draft recovery, continued typing, a subsequent successful request, and no duplicate dispatch. Include delayed failures racing with a newer draft and queued/steering cases.
- Fullscreen runtime tests drive empty-screen press/motion/release and mixed chunks through the real pre-input adapter. Check emitted paint and clipboard/control output for absence of fallback highlight, OSC 52 copying, and `Copied!`; then add content and verify owned selection. Preserve modal and comparison cases.
- Isolated subprocess tests inject a callback rejection, an uncaught exception, a throwing/stalled disposer, and abrupt UI termination with a surviving owner. Assert nonzero outcomes, bounded completion, diagnostic privacy/retention, and reset output ordered after child output. Simulated terminal state verifies reporting off, cursor/wrapping restored, and no alternate-screen ownership. No test drives the user's desktop.
- Physical Git Bash/Windows Terminal review remains necessary to confirm large-screenshot paste feels immediate on cold/warm use, text stays readable, typing/selection/streaming stay smooth during conversion, Enter waits correctly, post-failure mouse movement does not reach the shell, and clipboard/selection visuals match expectations.

## Risks / Trade-offs

- [A large screenshot previously rejected at intake] -> Apply source guards, prepare in the background, then enforce final limits; keep the unchanged-small-image path and prove the original above-8-MiB case with a real fixture.
- [An `async` codec still blocks typing] -> Isolate CPU work, binary scans, and codec initialization from the interactive event loop; test real worker contention plus cold/warm manual feedback latency.
- [Compression harms text or transparency] -> Prefer PNG and high-quality resampling, preserve composition/orientation, define opaque compositing, bound downscaling, and visually accept synthetic text fixtures.
- [Image bombs or paste storms exhaust resources] -> Preflight source/pixel/dimension bounds, one decode at a time, eight retained source jobs/160 MiB aggregate source ceiling, per-job deadline, and cancellation cleanup.
- [Asynchronous completion corrupts a draft] -> Stable chip/session/submission identities, reference ownership, captured clipboard results, and explicit waiting/canceled states prevent stale reinsertion or partial sends.
- [Worker/WASM works only in the development checkout] -> Declare and package codec/worker assets directly and verify supported packaged launches; avoid global filesystem patches and synchronous platform fallbacks.
- [Draft restoration races with new input] -> Use submission identity and editor revision checks; keep a separate failed draft instead of overwriting new work.
- [Broad pointer suppression steals controls] -> Scope to the default bare-A1 surface and sequence ownership; exercise overlays, editor, links, rail, and comparison profiles.
- [Repeated reset damages normal exit output] -> Share idempotent restoration and limit parent fallback to unsuccessful/unacknowledged teardown after child termination.
- [Fatal logging rethrows or reveals data] -> Use safe structured fields, hard size/retention bounds, secondary-error isolation, and unwritable-output tests.
- [Process or terminal destruction defeats cleanup] -> Guarantee best effort only when at least one launch owner and a writable terminal survive; do not promise recovery after total process-tree termination.

## Migration Plan

No persisted profile/session migration is required. PR #286 accepted the original specification and PR #287 merged its initial implementation with required CI passing; neither establishes user acceptance of the now-reported paste behavior. Preserve completed crash/selection work and reopen affected image-policy/acceptance tasks. Merge this specification-only amendment first, then implement the delta in a fresh separately authorized stream. Repeat required CI and user-run Windows Terminal/Git Bash checks before recording acceptance or archiving. Existing installed releases remain unchanged until the implementation is built/published. Rollback uses the prior immutable release; no session-data rewrite needs reversal.

## Open Questions

- The private screenshot's exact dimensions and byte count are unavailable. This does not block implementation: the user has confirmed final-size rejection, and synthetic real-image fixtures can cover the preparation boundary without obtaining private image content. Physical acceptance must still include the user's actual screenshot.
