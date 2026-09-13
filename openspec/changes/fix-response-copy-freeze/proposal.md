## Why

The user frequently experiences an intermittent whole-UI freeze immediately after selecting agent-response text and pressing `Ctrl+C`, and reported another occurrence while copying this conversation. Copying must leave typing, scrolling, and agent output responsive without requiring Esc, another recovery key, or a restart; the occurrence is confirmed by the user, but its blocking phase is not yet established.

## What Changes

- Trace the exact bare-A1 transcript-selection copy path, separating selected-text extraction, selection-clearing repaint, clipboard encoding/submission, terminal output, and OS clipboard behavior before attributing the freeze.
- Make selected-response `Ctrl+C` a bounded, non-blocking operation: snapshot the selected semantic text, preserve input ownership and selection-clearing semantics, and keep subsequent input, animation, and agent output progressing independently of clipboard completion.
- Introduce a bounded, recoverable transcript-copy delivery policy with explicit deadlines, failure handling, ordering, and lifecycle cleanup. Use a non-terminal clipboard transport on supported local hosts when it avoids clipboard control traffic on the UI terminal; retain a compatible, bounded terminal fallback where needed rather than blindly emitting duplicate writes.
- Bound extraction/encoding work and queued payloads, preserve complete selected text within documented limits, and report unsupported or failed delivery non-modally instead of freezing, silently truncating, or claiming unverified success.
- Add regression evidence for repeated small copies, long selections and sessions, busy/unavailable/stalled clipboard transports, immediate subsequent input, streaming overlap, and shutdown. Require physical-terminal validation of the exact candidate without a recovery-key workaround.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Responsive selected-response copying, bounded clipboard delivery and recovery, exact selected-text/input semantics, and freeze-specific deterministic and physical acceptance.

## Impact

Likely implementation boundaries are `session-viewport-controller.ts`, `session-shell.ts`, `transcript-viewport.ts`/`text-selection.ts`, the owned clipboard adapter and any isolated delivery helper, and the existing terminal writer and input/presentation evidence. Any added helper must be packaged and tested on cold startup; no installed dependency patch or additional UI terminal writer is intended.

At planning base `bd390775`, transcript `Ctrl+C` extracts selected text, clears selection and requests repaint, then sends a base64 OSC 52 clipboard sequence through `runtime.writeControl`. It does not call `writeSystemClipboardText`; the separate prompt native-write queue is not evidence of the response-copy root cause. No process trace, terminal/version identification, clipboard contents, freeze duration, or recovery behavior has been captured from the reported occurrence.

The existing `keep-streaming-ui-responsive-during-selection` plan owns broad selection/scrolling/render preparation optimization. This change owns the copy action and clipboard delivery boundary, coordinates shared code against the implementation base, and does not duplicate that general renderer work. Prompt copy/cut/paste, `/copy`, Ctrl+C without a transcript selection, modal ownership, and `a1 pi` remain compatibility controls rather than new feature scope. This proposal contains planning artifacts only.
