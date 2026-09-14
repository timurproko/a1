## Context

See `proposal.md` for motivation and `specs/custom-session-viewport/spec.md` for the behavior contract. This design is needed because the repair crosses viewport composition, input presentation, and terminal-write optimization, with terminal-specific uncertainty and performance constraints.

Current behavior:

- `src/ui/components/spans.ts` decorates links with OSC 8 and lets the terminal own hover underlines. It also has held-selection presentation that temporarily removes OSC 8; it is not a general replacement for native link behavior.
- `session-viewport-controller.ts` hit-tests composed rows but stores hover identity as row plus target, omitting horizontal bounds and occurrence identity. It requests a forced render on certain hover transitions and wheel input.
- `session-shell-root.ts` composes viewport rows, including selection, sticky rows, rail, controls, and dock, with a dock-only reuse path. `session-shell.ts` arms `DamageAwareTerminalAdapter` with semantic frame metadata before Pi emits its frame.
- `damage-aware-terminal.ts` can suppress a same-geometry full clear or substitute regional scrolling. Its OSC 8 safety check examines incoming painted rows, not the entire old and desired affected region.
- The pinned fullscreen renderer uses row clears and a synchronized-output envelope. A forced render can emit a full clear; asking for a render is not proof that the required bytes reach the terminal.

Read-only probes during analysis confirmed two code-level gaps: a previously linked frame followed by a forced link-free frame produced `suppressed-redundant-clear` with no screen clear; changing a link's start and end on the same row with the same target and the pointer still inside produced no forced cleanup request. The relevant controller and adapter files are unchanged between the analyzed primary checkout and this proposal's `origin/develop` base (`2c1d3f6`). These probes do not reproduce Windows Terminal's native hover renderer. The supplied screenshot (`gost underline.png`) remains symptom evidence, not a proven host root cause.

## Goals / Non-Goals

**Goals:**

- Make cleanup a durable property of the transition from the last presented frame to the next, not a transient side effect of mouse handling.
- Base occurrence geometry on display cells after clipping/composition and bound bookkeeping by visible content.
- Retain the existing native-link and damage-optimization architecture, with conservative cleanup for uncertain link transitions.
- Demonstrate the actual emitted terminal operations and physical outcome, not merely a `requestRender(true)` call.

**Non-Goals:**

- Reimplement Windows Terminal hover rendering, change terminal settings, or introduce a new link-opening policy.
- Patch installed Pi, change `a1 pi`, remove clickable links, or disable damage optimization globally.
- Alter semantic text or copy results to defeat host auto-detection. Any expansion to a different link-rendering model requires a revised plan.

## Decisions

### 1. Describe visible occurrences, not just destinations

Introduce a shared visible-link range reader at the existing span boundary. Each segment records screen row, half-open display-column bounds, and target. Multiple occurrences with the same target remain distinct by position; wrapped segments remain separate. Parse the OSC 8 forms emitted by supported components, including BEL/ST terminators and optional parameters, while preserving existing sequence bytes. Unknown or malformed state must not authorize an optimization.

The controller uses these bounds for pointer transitions. The presentation boundary reconciles link regions against final emitted rows, including downstream clipping or overlays, rather than treating the uncomposited document as screen truth. A1's composed-frame metadata is a candidate; terminal-write state is authoritative for what was presented. Reuse unchanged row metadata and update changed dock rows even on the dock-only path.

Alternative rejected: adding only `scrollTop` to the hover key. It misses same-row width changes, duplicate links, dock reallocation, and terminal overlays. Adding the pointer's exact column to the key is also wrong: movement within one unchanged occurrence must not force a new cleanup.

### 2. Keep pending cleanup until presentation completes

Represent hyperlink cleanup explicitly at the A1-owned shell/runtime boundary, distinct from an ordinary repaint or scroll request. Reconcile old presented link regions with the desired visible frame whenever content or geometry changes. Request cleanup when an old occurrence moves, shrinks, changes target, disappears, becomes covered, or changes native/held presentation; also retain the existing pointer-leave/change cleanup for native cached hover decoration. This must not depend on having received a hover report before the content transition.

Coalesce pending cleanup with newer desired state instead of queuing old frames. Associate it with frame/presentation identity, preserve it across aborted or superseded compositions, and acknowledge it only after the corresponding complete write is forwarded. Do not clear pending intent merely because `compose()` ran, and do not rely on a force request made during rendering surviving the renderer's own state updates. Reset geometry and pointer caches on resize, surface replacement, session reset, and stop without forgetting cleanup needed for the next visible frame.

Alternative rejected: forcing all wheel or motion events. Wheel-only handling misses keyboard, streaming, resize, and stationary-pointer cases; motion-only handling can clear on every report and still miss a link that disappeared before any report.

### 3. Preserve cleanup bytes and guard optimizations with old and new state

Teach the damage boundary to distinguish required hyperlink cleanup from a redundant generic clear. For the initial conservative repair, retain a requested complete clear-and-repaint inside the existing synchronized-output write whenever hyperlink cleanup requires it. Never emit a standalone clear before a later content write. If upstream emits only a differential despite pending cleanup, obtain a complete current frame through the owned presentation path; do not silently acknowledge an incomplete cleanup.

Before suppressing a clear or authorizing a regional shift, inspect both cached presented rows and reconstructed desired rows in the affected region. Absence of OSC 8 opens in the incoming differential is insufficient: old linked cells or unchanged linked rows may still be involved. Reject regional shifts involving such state unless their safety is explicitly proven; the first implementation uses the existing conservative full-row path. Preserve the complete original write for unsupported grammar or unsafe metadata rather than partially transforming it. Keep pending cleanup or arrange a complete conservative repaint if an unrecognized write cannot prove cleanup completed.

Maintain the presented-row cache consistently with the actual forwarded write. Reuse established generation/geometry invalidation for resizes and structural terminal operations, and avoid invalidating a cache merely because an input clear was suppressed if that would misrepresent the emitted result. Required cleanup wins over broad performance heuristics; unchanged link-free frames and stable dock-only input retain their current optimizations.

Alternative rejected: simply checking the previous frame for any link in the existing clear-suppression branch. That closes one gap, but cannot express pointer-leave cleanup when row bytes are unchanged or protect pending cleanup through coalescing. Removing all clear suppression would regress ordinary streaming and typing without solving link identity.

### 4. Separate protocol correctness from physical hover acceptance

Start implementation by turning the two analysis probes into deterministic regressions and capturing a Windows Terminal reproduction with both explicit OSC 8 file/URL links and auto-detected URL/file-like tool output. Record raw writes alongside final visible content so an SGR underline leak, lingering cell hyperlink target, and stale host hover cache can be distinguished. Audit row boundaries and clipping for OSC 8 closure; do not assume an SGR reset closes a hyperlink.

Controller/span tests cover exact ranges and pointer transitions. Runtime/adapter tests assert cleanup bytes survive the complete shell-to-terminal path, including same-geometry full clears, link-free replacements, prior-only links during shifts, coalescing, overlays, dock-only reuse, and selection release. Cell replay verifies text/style/cursor preservation; byte-level or hyperlink-aware assertions separately verify OSC 8 target bounds because plain text screenshots and ordinary cell replay may omit native hyperlink metadata.

Physical Windows Terminal review remains mandatory because headless replay cannot prove its hover overlay was invalidated. Compare the exact candidate against the affected build at the same geometry, terminal version, and settings. Do not claim a fix if terminal auto-detection still reproduces the ghost. A failure blocks acceptance and triggers renewed diagnosis within this repair, or an explicitly approved design revision if the native-link approach must change.

## Risks / Trade-offs

- [Host hover invalidation may survive even a preserved full clear] -> Reproduce and test the complete cleanup write physically early; do not equate byte-level passing tests with visual success.
- [Auto-detected links are not represented by OSC 8 ranges] -> Keep separate explicit-link and auto-detection fixtures and capture results. Do not alter user text, require a terminal setting change, or mark the original symptom fixed while a reproduced case remains.
- [Link-heavy followed output may need more complete repaints] -> Trigger cleanup on actual occurrence/presentation transitions, coalesce with the newest frame, preserve synchronized writes, and retain optimized stable/link-free paths. Measure writes and row work in long link-heavy and link-free fixtures.
- [A downstream overlay or skipped composition invalidates candidate metadata] -> Reconcile against emitted rows and retain pending cleanup until a complete write acknowledges it; fail closed when the full affected region is unknown.
- [Native/held-selection transitions interfere with selection or copy] -> Reuse existing selection policy, keep metadata paint-only, and cover auto-scroll plus release without changing semantic text or endpoint behavior.
- [Other rendering work changes the same boundaries before apply] -> Re-evaluate the accepted implementation base and preserve its current frame-generation and input-coalescing contracts rather than copying stale code assumptions.

## Migration Plan

No data or settings migration is required. Implement behind the existing bare-A1 custom-viewport ownership boundary, add deterministic regressions and focused evidence, and present the exact built candidate for Windows Terminal review. Keep native link activation and pinned comparison profiles unchanged. If acceptance fails, retain the code change for correction rather than weakening the visual criterion. Rollback is a revert of the isolated implementation change; no stored session data needs conversion.

## Open Questions

- Which Windows Terminal version and link-detection settings produced the screenshot? Record them during reproduction; they determine evidence coverage, not a new product setting.
- Does the original case retain OSC 8 cell metadata, a native hover overlay, or an auto-detected match? Resolve through raw-write capture and the explicit/auto-detected fixture split before declaring the repair effective.
