# Bounded code-streaming and hyperlink cleanup review

This candidate finishes the hyperlink portion of `eliminate-code-block-streaming-flicker`
(specification PR #318), following the partial implementation in #321. It is a prerequisite
for `keep-streaming-ui-responsive-during-selection` (#325), not that larger change's completed
selection/wheel performance fix.

## What changed

- Candidate-looking text (paths, dotted identifiers) no longer vetoes a proven followed shift.
  Real OSC 8 links, unsafe escapes, images, overlays, and selections retain their conservative
  movement rules.
- Ordinary streamed text changes no longer request hyperlink cleanup.
- Pointer transitions identify the former hovered row. Editor link deletion and discarded
  presentation state retain explicit cleanup requests, including when replacement content
  has no links. Unscoped cleanup considers every previously linked row; a missing pointer
  report is not treated as proof that no host decoration exists.
- Cleanup paints affected and changed rows without manufacturing an erase-display. After
  unknown paint or lost geometry, it waits for a complete safe frame instead of guessing.
- Same-geometry forced frames preserve current cells without repainting unchanged rows.
  Structural entry, resize, and unsafe-protocol fallbacks are still conservative.

## Automated evidence

`test/fixtures/rendering/baseline-code-streaming.json` is the pre-production-change capture
from `6c5af810`, repeated twice with no production diff. Its synthetic content and cell hashes
contain no private session input. The fixture predates the added dual-synchronization summary
field; it remains a historical baseline rather than a regenerated candidate result.

| Bare-A1 fullscreen workload | Baseline post-startup clears | Candidate post-startup clears |
| --- | ---: | ---: |
| Streamed fenced code | 3 | 0 |
| Path-bearing prose | 3 | 0 |
| Tall live tail | 0 | 0 |

The deterministic producers use a shared scripted clock so cold imports do not advance spinner
or presentation timers unpredictably. Independent comparison processes remain outside the owned
damage adapter. Current budgets also fail candidate-only fallback, repaint of settled rows,
stale final content, or divergent final cells with synchronization honored versus ignored.
The dual-model replay reuses producer bytes rather than launching duplicate producers.

Generate current evidence (non-interactive; writes only the named report):

```sh
cd D:/Git/a1/.worktrees/finish-bounded-link-cleanup && node --import tsx scripts/pi/report-code-streaming.ts --phase current --repeat 2 --output .artifacts/rendering/code-streaming-current.json
```

The baseline mode rejects dirty production sources. Do not replace the committed baseline with
post-fix results. Repeated reports compare cells, row damage, decisions, and budgets, not elapsed
machine timings. This is a paint regression check, not a CPU or input-latency benchmark.

## Physical Windows Terminal review

Use the candidate branch `fix/bounded-hyperlink-cleanup` and record its exact `git rev-parse HEAD`.
Build and start the owned UI through the color-preserving shell entry:

```sh
cd D:/Git/a1/.worktrees/finish-bounded-link-cleanup && npm run build && ./scripts/dev
```

1. Ask the agent, without writing files, to produce a long fenced TypeScript example containing
   `obj.method`, `package.json`, and `./src/index.ts`, followed by a short explanation and a real
   Markdown hyperlink. Check that ordinary code/path streaming no longer blanks the screen.
2. Hover a real hyperlink, then scroll it away without moving the pointer. Repeat with a
   terminal-detected URL and file-like text inside code. Try both short and wrapped links,
   duplicate targets, blank rows replacing links, and a smaller terminal.
3. Move off a hovered link, select linked text, wheel/auto-scroll during selection, release,
   and copy. Check exact copied text, normal link colors/activation, and no leftover solid
   underlines on unrelated text, padding, or controls.
4. Paste a URL chip into the editor and delete it. Open and close a covering overlay, and resize
   while a link is visible. Check that obsolete targets/underlines are removed and restored
   links have their correct targets.
5. Verify that the dock stays intact and terminal mouse/cursor behavior is restored on exit.

Use the same geometry for the independent comparison profile:

```sh
cd D:/Git/a1/.worktrees/finish-bounded-link-cleanup && npm run build && ./scripts/dev pi
```

Record terminal/version, geometry, synchronized-update support, explicit versus auto-detected
link case, commit, and pass/fail. Test both before and after any pointer report: lack of a report
must not be interpreted as evidence of an absent pointer.

**Known gaps:** native Windows Terminal hover rasterization cannot be certified by headless cell
replay. Visual acceptance and merge authorization are pending. The broader selection/wheel
scheduling and collapsed-tool preparation optimizations have not been implemented in this PR.
Do not merge on automated results alone; a ghost-underline or flicker regression blocks acceptance.
