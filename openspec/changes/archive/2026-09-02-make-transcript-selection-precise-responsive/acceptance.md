# Acceptance

Accepted by the maintainer on 2026-09-02 after exact-candidate validation, physical Windows Terminal comparison, and manual integration.

## Delivery evidence

- Planning PR #198 merged as `b6b10c968804df9918104d4aefef2eb04c9b8e31`.
- Implementation PR #199 used exact head `973f5617d058f125c45f169fcab57f6e066f4f70` and merged manually as `b49a8f4662719e48e3fe2ad2aad4fea7d91611e1` with auto-merge disabled.
- Required development-validation run `33528624074` passed for the implementation head, including fast validation and Linux/macOS process containment.
- Deterministic evidence covered forward and reverse one-grapheme ranges, multiline selection and copy, grapheme integrity, latest-pointer coalescing, bounded row recomputation, streaming overlap, auto-scroll, styling, links, scrollbars, resize, and restoration.
- The representative selection diagnostic improved from approximately 28.9 ms average and 48.7 ms maximum to approximately 3.2 ms average while structural damage bounds remained authoritative.

## Physical acceptance

The maintainer accepted one-grapheme forward and reverse selection, multiline tracking and copy, Unicode/grapheme integrity, selection during streaming, auto-scroll, resize, source styling and links, scrollbar interaction, and comparison behavior in Windows Terminal. No contradictory lag, precision, copy, or visual finding remains open. Historical terminal version, geometry, and viewport-setting values were not retained in the active change before this archival reconciliation.

## Verdict

Accepted. Bare-A1 transcript selection now uses normalized display boundaries, tracks the latest pointer with bounded visible-row work, and preserves copy semantics, styling, controls, auto-scroll, and comparison-profile behavior.
