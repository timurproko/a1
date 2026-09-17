# Design

## Why "any new block" was wrong here

The first build traced its dismissals in a real session: with `A1_NOTICE_DEBUG` set, a `Switched to GPT-6 Astra` notice raised mid-run was retired 0.6 s later by `applyTranscriptBlock` mounting the next transcript block, and a later one by `#syncTranscript` mounting a block from the settled view. Neither was a prompt. Pi's chat container adds one component per message, so v2's "any new chat content" rule mostly meant "the next message"; a1's transcript is finer-grained, so the same rule fires on every tool call and result. The notice answers the reader's last command, and the only content that clearly starts the next thing they asked for is their own submission, so `#mountTranscript` now dismisses only for `user` and `bash` blocks. Errors and other transcript-bound workflow presentations still dismiss it through `#appendAnchoredWorkflowComponent`, and resets still clear it.

## Padding

`renderPiShellStatusText` takes the output pad; the first build passed the session's `#outputPad`, which is 0 in bare A1, so the text started in column 1. Pi builds its status `Text` with a fixed padding of 1, and the v2 capture shows that indent. The notice now passes `PINNED_PI_LAYOUT.outputPad` explicitly.
