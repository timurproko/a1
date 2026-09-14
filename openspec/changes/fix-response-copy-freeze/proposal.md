## Why

The user frequently experiences an intermittent whole-UI freeze after selecting agent-response text and pressing `Ctrl+C`, reported another occurrence while copying this conversation, and subsequently reported that `Ctrl+V` also appears to freeze the UI. Both copy and paste must leave typing, scrolling, and agent output responsive without Esc, another recovery key, or restart; the blocking phases and whether the two symptoms share a cause remain unconfirmed.

## What Changes

- Trace the exact bare-A1 transcript-selection copy path, separating selected-text extraction, selection-clearing repaint, clipboard encoding/submission, terminal output, and OS clipboard behavior before attributing the freeze.
- Make selected-response `Ctrl+C` a bounded, non-blocking operation: snapshot the selected semantic text, preserve input ownership and selection-clearing semantics, and keep subsequent input, animation, and agent output progressing independently of clipboard completion.
- Introduce a bounded, recoverable transcript-copy delivery policy with explicit deadlines, failure handling, ordering, and lifecycle cleanup. Use a non-terminal clipboard transport on supported local hosts when it avoids clipboard control traffic on the UI terminal; retain a compatible, bounded terminal fallback where needed rather than blindly emitting duplicate writes.
- Bound extraction/encoding work and queued payloads, preserve complete selected text within documented limits, and report unsupported or failed delivery non-modally instead of freezing, silently truncating, or claiming unverified success.
- Make standalone `Ctrl+V` into the ordinary bare-A1 prompt an explicit target, including content copied in another application with no preceding A1 copy. Trace both an A1-owned clipboard read and terminal-provided bracketed paste; bound acquisition, format detection, text/path/image preparation, insertion, and repaint rather than only the copy-before-paste wait.
- Preserve paste content, chip classification, selection replacement, undo/redo, and input ownership while bounding concurrent requests and recovery. Distinct accepted pastes retain their order and reserved insertion positions; copy's newest-pending policy must not drop paste actions.
- Settle busy, denied, stalled, empty, or failed clipboard reads without stranding the editor or retaining a failed copy as a permanent paste barrier. Preserve existing image safety limits and isolate expensive or blocking preparation instead of merely wrapping it in a promise.
- Add regression evidence for copy-only, paste-only, and combined flows: cold/warm small content, repeated operations, long text/selections/sessions, URLs and paths, existing image formats, stalled transports, immediate subsequent input, streaming overlap, and shutdown. Require physical-terminal validation of both shortcuts on the exact candidate without a recovery-key workaround.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Responsive selected-response copying and ordinary-prompt pasting, bounded clipboard delivery/acquisition/preparation and recovery, exact text/editing/input semantics, and separate copy/paste deterministic and physical acceptance.

## Impact

Likely implementation boundaries are `session-viewport-controller.ts`, `session-shell.ts`, `transcript-viewport.ts`/`text-selection.ts`, `owned-editor-ux.ts`, `prompt-chips.ts`, image/clipboard preparation clients and workers, the owned clipboard adapter and isolated helpers, and the existing terminal writer and input/presentation evidence. Any added helper must be packaged and tested on cold startup; no installed dependency patch or additional UI terminal writer is intended.

At planning base `bd390775`, transcript `Ctrl+C` extracts selected text, clears selection and requests repaint, then sends a base64 OSC 52 clipboard sequence through `runtime.writeControl`. It does not call `writeSystemClipboardText`; the separate prompt native-write queue is not evidence of the response-copy root cause. No process trace, terminal/version identification, clipboard contents, freeze duration, or recovery behavior has been captured from the reported occurrence.

Read-only inspection for this expansion found an existing 15-second paste-preparation deadline and off-thread image/clipboard work, but completion still returns through text/path classification and editor insertion; terminal-provided nonempty paste takes a separate text path. Those facts do not establish where the reported Ctrl+V freeze occurs, nor prove that an existing timeout keeps every phase responsive.

The existing `keep-streaming-ui-responsive-during-selection` plan owns broad selection/scrolling/render preparation optimization. This change owns response copy and ordinary-prompt paste through their clipboard/preparation/presentation boundaries, coordinates shared code against the implementation base, and does not duplicate that general renderer work. Prompt copy/cut payload semantics, `/copy`, Ctrl+C without a transcript selection, modal ownership, image safety, and `a1 pi` remain compatibility controls. Keep the existing change name for continuity with specification PR #359; the added paste scope is intentional. This revision contains planning artifacts only and does not certify the unfinished copy implementation.
