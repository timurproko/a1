## 1. Restore v2 progress decoration

- [ ] 1.1 Define the exact ten-frame v2 Braille sequence and deterministic 80 ms frame selection in the native strip, replacing the quarter-circle working animation.
- [ ] 1.2 Render starting and restoring with the shared progress sequence in the established dim lifecycle color, and keep those states repainting while active.
- [ ] 1.3 Align the reduced native fallback strip's working decoration with the same v2 frame family without changing chip geometry or semantic status mappings.

## 2. Prove status and layout behavior

- [ ] 2.1 Add focused native tests for every frame, cadence wraparound, working/start/restore mappings, semantic `?`/`✓`/`!`/`✗` preservation, and absence of quarter-circle progress glyphs.
- [ ] 2.2 Verify one-column chip width, clipping, close-control hit targets, palette/truecolor paths, and independent per-tab accent styling remain unchanged.
- [ ] 2.3 Run focused terminal-host tests, strict OpenSpec validation, type checking, and preflight; record results and any known-gap disposition in implementation evidence.
