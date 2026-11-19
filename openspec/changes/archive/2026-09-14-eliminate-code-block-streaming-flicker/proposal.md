## Why

The user reports that while an agent generates content, blocks in the transcript area flicker: a block flashes and then does not settle into readable content, so the reader cannot tell whether a block exists or whether the screen is misdrawing. Code blocks are the worst case.

Read-only reproduction with the repository's own rendering producer makes the cause specific and measurable. Replaying a streamed fenced code block through the bare-A1 producer at 48x14 with synchronized updates available shows that the shipped damage-aware presentation is not merely bypassed for code content — it is replaced by whole-screen clears:

| checkpoint | damage decision | viewport cause | rows painted |
| --- | --- | --- | --- |
| `code-chunk-3` (first code line visible) | `unsafe-terminal-content` | `follow-shift`, safe shift of 2 | fallback |
| `code-chunk-5` (closing fence) | `hyperlink-cleanup` | `follow-shift` | 14 of 14 |
| `code-settled` | `hyperlink-cleanup` | `steady` | 14 of 14 |

That workload emits four full-screen clears across thirteen writes. An equivalent prose workload emits two, both during startup. A settled prose transcript that only scrolls is transformed correctly (`transformed`, three painted rows per frame), which shows the bounded path works when nothing on screen looks like a link.

Two independent defects produce this, and one aggravating budget makes ordinary streaming fall back as well.

1. The visible-hyperlink inspector's `candidate` pattern treats ordinary code as links. `obj.method`, `package.json`, and `./src/index.ts` all yield candidate ranges. A code block is therefore a screen full of "links".
2. Any cached transcript row carrying a candidate range makes `#hasLinkRisk` reject the frame, so a viewport transition that the owned descriptor already proved safe is painted by the pinned full positional rewrite instead of bounded movement.
3. While following, a streamed row change on a candidate-bearing row changes that row's paint signature, which requests hyperlink cleanup. Cleanup synthesizes a complete-screen frame that begins with an erase-display and repaints every row, and it also forces an extra render through the cleanup-recovery callback. Streaming code therefore drives repeated whole-screen clear-and-repaint frames, which is exactly the blank-then-redraw the reader describes.
4. Independently, the real-damage budget of `verticalShiftRows + 2 + dock rows` is smaller than the damage a live block legitimately produces. Every followed streaming chunk in the existing `long-transcript-follow` workload reports `excessive-real-damage`, so even plain prose loses bounded painting once a live tail block is present.

The accepted `custom-session-viewport` requirement already says ordinary streamed growth SHALL NOT clear the complete screen and that unchanged rows SHALL NOT be rewritten because the window advanced. Current behavior violates both for the content readers look at most. No existing workload streams a fenced code block or asserts that link-bearing content keeps bounded painting, so automation cannot see this.

## What Changes

- Separate "this row contains text a host might underline on hover" from "this frame is unsafe to move". Candidate ranges SHALL restrict only the hover-cleanup concern they were introduced for; they SHALL NOT by themselves disqualify a proven safe transcript shift. Explicit terminal hyperlinks and non-replay-safe content keep their existing conservative treatment.
- Bound hyperlink cleanup to the rows and conditions that need it. A streamed content change on a row that merely contains a candidate-looking token SHALL NOT request a whole-screen cleanup frame; cleanup SHALL remain reserved for the pointer-hover and link-removal cases that the existing accepted requirements describe, and SHALL repaint the affected rows without an undeclared erase-display.
- Derive the real-damage allowance from the live transcript tail the semantic frame already knows about, instead of a fixed two-row slack, so a legitimately reflowing live block uses bounded movement plus its own damaged rows rather than falling back to a full positional rewrite.
- Add deterministic streaming workloads for a fenced code block, for link-bearing prose, and for a live tail taller than the current slack, with damage budgets that fail on mid-stream full-screen clears, on rejection of a proven safe shift solely because of candidate text, and on repaint of stable rows.
- Keep the fail-closed contract intact for every genuinely uncertain case: unknown grammar, geometry mismatch, overlays, selection, images, resize, explicit unclosed links, and non-replay-safe rows continue to forward the original pinned write unchanged.
- Preserve `a1 pi` and untouched pinned Pi as unchanged comparison producers, and leave semantic transcript content, Markdown behavior, theme roles, and the transient tail layout unchanged.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `custom-session-viewport`: Require that followed streaming of link-bearing and code content keeps bounded movement and that no ordinary streamed frame clears the complete screen.
- `owned-pi-ui-foundation`: Require that the damage adapter's safety classification distinguishes hover-cleanup concerns from movement safety, that cleanup frames are bounded, and that rendering evidence covers code-block and link-bearing streaming.

## Impact

- Expected implementation focus: `src/integrations/pi/tui-runtime/damage-aware-terminal.ts` and `src/ui/components/visible-hyperlinks.ts`, with the viewport frame descriptor in `src/ui/components/transcript-viewport.ts` supplying the live-tail extent used by the damage allowance.
- Expected tests: focused damage-adapter and viewport cases plus new entries in the existing rendering workload, producer, replay, and budget support under `test/support/rendering`.
- No dependency update, installed Pi modification, private Pi API, new terminal authority, protocol change, CLI change, settings migration, or persisted session change is intended.
- This change does not reopen `stabilize-streaming-rendering`. It repairs two classification defects and one budget in the infrastructure that change shipped, and its acceptance is separate.
- This pull request contains planning artifacts only.
