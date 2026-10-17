# Design

## Context

See `proposal.md` for motivation and the `session-frame-selection` delta for required behavior. Bare A1 currently has two pointer-selection owners around the ordinary prompt: distinct motion promotes to complete-frame selection, while click, double-click, and triple-click replay into the owned editor. Complete-frame extraction admits persistent transcript automatically and footer/status rows only for explicit `Ctrl+C`; it excludes all prompt rows. The editor can already produce exact expanded selected text for keyboard copy, but its pointer-release contract reports only whether it handled the event.

Dock composition already knows the ordinary editor body offset and length and the final footer/status length. Selection extraction must use those structural boundaries rather than rendered-text patterns, remain correct under wrapping and autocomplete layout changes, and continue producing immutable bounded snapshots for asynchronous delivery.

## Goals / Non-Goals

**Goals:**

- Declare ordinary prompt-input and footer/status copy eligibility from their composing layout segments.
- Apply the live fullscreen copy-on-select setting to both frame-owned and editor-owned pointer selection completion without duplicate submissions.
- Preserve semantic prompt text, exact selected columns, grapheme integrity, mixed-frame row order, and the existing delivery acknowledgement.
- Retain eligibility through full and dock-only composition, resizing, input reflow, and pinned-row reprojection.

**Non-Goals:**

- Making autocomplete entries, input borders/counters, replacement or extension input surfaces, widgets, notices, transient progress, steering, or alignment rows copyable.
- Automatically copying keyboard-created prompt selections before an explicit copy action.
- Changing keyboard copy/cut collapse behavior, `/copy`, clipboard transport, settings storage, comparison-profile behavior, or regular terminal selection.

## Decisions

### 1. Declare semantic dock copy ranges during shell composition

The dock layout will provide copy metadata for the exact ordinary editor body rows and footer/status rows alongside the combined dock rows. The metadata will be expressed in stable dock-relative coordinates and passed through both full and dock-only viewport composition. Only the default ordinary input surface contributes prompt rows; replacement surfaces remain covered and ineligible.

Inferring eligibility from `❯`, path, model, or footer text was rejected because prompt wrapping, themes, extension statuses, and localized or user-controlled values make text an unsafe classifier. Treating the complete input segment as copyable was rejected because that segment can include borders, counters, autocomplete, and other presentation rows around the editor body.

### 2. Use one declared frame-copy eligibility policy for release and Ctrl+C

Complete-frame extraction will admit persistent transcript rows plus declared ordinary prompt-body and footer/status rows for both automatic and explicit intents. Pointer release requests a snapshot only while copy-on-select is enabled; `Ctrl+C` requests the same eligible snapshot from a retained frame selection regardless of the setting. Existing filtering, whole-payload trimming, grapheme handling, covered-cell exclusion, and immutable snapshot limits remain shared.

Keeping status eligibility explicit-only was rejected because it preserves the inconsistency the change is intended to remove. Maintaining separate automatic and explicit row sets was rejected because the requested behavior makes their content policy identical; the setting controls when capture occurs, not which selected text is eligible.

### 3. Report editor-owned pointer selection completion without invoking copy keys

The owned editor pointer boundary will expose the exact expanded selected text, if any, after an editor-owned release. Reading this value will not collapse or mutate the selection. The viewport controller will convert it to the existing literal bounded copy snapshot only when copy-on-select is enabled. A single click yields no range and no snapshot. Distinct drag motion remains frame-owned and therefore cannot also produce an editor snapshot.

Synthesizing `Ctrl+C` on editor release was rejected because that would collapse selection and conflate automatic copy with an explicit keyboard action. Re-routing prompt double/triple clicks into frame selection was rejected because it would weaken semantic word/logical-line selection and could reintroduce the full-width prompt selection flash.

### 4. Keep one delivery and acknowledgement path

Frame-owned and editor-owned automatic snapshots will return through the controller's existing `copySelection` result and enter the shell's current newest-intent, bounded clipboard coordinator. Successful delivery therefore retains the existing `copied N chars to clipboard` acknowledgement, stale-completion suppression, and failure presentation. No direct clipboard write will be added to editor or viewport components.

A separate editor clipboard callback was rejected because it could race frame copies, bypass shared acknowledgement ordering, and duplicate timeout and failure policy.

### 5. Cover ownership boundaries and mixed payloads at focused layers

Viewport tests will exercise structural row classification, partial columns, wrapped prompt rows, reverse and mixed transcript/prompt/status ranges, excluded chrome, whitespace, reflow, and dock-only recomposition. Controller tests will cover live setting changes, editor multi-click completion, no-copy single clicks, disabled release followed by `Ctrl+C`, and exactly-once ownership. Full shell tests will assert actual clipboard payloads and acknowledgement behavior for prompt-only, status-only, and cross-frame selections.

## Risks / Trade-offs

- **[Prompt body metadata drifts from rendered geometry]** → Derive it from the same body geometry used for pointer routing and cover wrapped input plus autocomplete transitions.
- **[One gesture submits through both editor and frame routes]** → Preserve the existing pending-click versus distinct-motion ownership latch and assert one snapshot per release.
- **[Editor extraction leaks visual prompt chrome or chip markers]** → Reuse the editor's existing expanded semantic selection extraction rather than parsing rendered rows.
- **[Dock-only composition loses copy classification]** → Carry the same dock-relative ranges into incremental composition and test reflow and footer updates.
- **[Broadening status auto-copy surprises existing users]** → Gate submission strictly on the existing `Copy on select` value; disabled mode remains retained-selection plus `Ctrl+C`.

## Migration Plan

No persisted-data migration is required. Implementation will first add focused failing tests, then introduce structural dock eligibility and editor pointer-completion extraction, and finally route both through the existing snapshot delivery path. Rollback removes the new prompt/status eligibility and editor completion result, restoring transcript-only automatic copying and explicit-only status copying without changing stored settings or sessions.
