## Context

See proposal.md for the approved correction. The styling reference is develop `53e924c8`, immediately before #360. Its `pinnedPromptSourceRow` uses `userMessageText` for the pinned timestamp. Its shared `quietSticky` painter applies faint to the whole row; hover uses the full prominent row. The default dark theme therefore shows white prominent/hovered text and timestamp and dims both in quiet context. Naturally visible source timestamps remain metadata-colored.

#360 changed the pinned timestamp to `dim`. The first #368 implementation additionally introduced `timestampColumns` and excluded those glyphs from quiet fading. Both deviations are now rejected by the user. Preserve the compaction presentation/navigation additions and all unrelated develop changes while restoring only the original shared style path.

## Goals / Non-Goals

**Goals:** Restore the baseline ordinary-prompt appearance and propagate it unchanged to completed compactions in every viewport state.

**Non-Goals:** No timestamp-specific styling API, protected metadata span, new palette, hardcoded white RGB, prompt-layout redesign, rendering-budget change, compaction collapse mechanism, or comparison-route change. Issue #366 remains separate.

## Decisions

### Restore the baseline instead of creating another exception

Remove optional timestamp columns from neutral anchors and quiet-painter arguments. Restore the previous owned prompt-source helper and one-argument quiet painter, including `userMessageText` for pinned timestamps. Reuse existing theme roles rather than compensating with RGB values or new intensity resets. No compaction-specific color branch is needed: the anchor classification from #360 already sends both block types through the same path.

Restore only these style changes, not entire old source files containing unrelated newer renderer behavior. Verify the resulting helper and quiet painter against `53e924c8` and check that the neutral viewport has no remaining diff from its pre-exemption version.

### Compare state behavior rather than enforcing constant metadata brightness

Replace the rejected invariant tests with explicit baseline-state assertions: source metadata color is unchanged; prominent and hovered timestamps use the normal prompt foreground with normal intensity; quiet prefix, content, and timestamp all use existing faint styling. Compare equivalent ordinary prompts and compactions across full rows, hover, reverse scrolling, and scrollbar appearances, preserving backgrounds and summary-internal semantics.

Retain edge-case coverage for metadata availability, narrow widths, resize, clock-like content, anchor replacement, and style leakage. Remove tests that exist solely to exercise the deleted timestamp-column API. Do not weaken compatibility or rendering-budget assertions.

## Risks / Trade-offs

- [Matching two equally restyled implementations misses baseline drift] → Compare restored source helpers with the pinned historical commit and assert the known baseline foreground/intensity transitions in real terminal cells.
- [A broad revert drops compaction navigation or renderer fixes] → Use targeted edits; review production diffs against both current develop and the baseline.
- [Old planning/evidence still asserts a timestamp exception] → Supersede all active artifacts coherently and label earlier validation as rejected, not current acceptance.

## Migration Plan

The user explicitly approved revising the specification and implementation together within open PR #368. Validate the revised artifacts before applying the code correction, then run focused suites, typechecking, strict validation, and required CI. Keep the PR open with auto-merge disabled for an exact-candidate visual comparison to baseline ordinary prompts. No data migration is needed. Earlier compaction acceptance and archive remain pending.
