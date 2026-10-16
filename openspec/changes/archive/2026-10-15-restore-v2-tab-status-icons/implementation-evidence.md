## Implementation evidence

### Native progress rendering

- `native/terminal-host/src/roles/strip.rs` owns the exact v2 sequence `⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏` and the 80 ms cadence.
- Working, starting, and restoring select the shared sequence. Working retains its per-tab reported accent; starting/restoring retain the established dim lifecycle foreground and now keep the animation repaint loop active.
- The reduced attach fallback uses the shared native frame selector. Existing semantic status glyphs, chip width calculation, clipping, close hit regions, and color fallback transformations are unchanged.

### Focused validation

- `cargo fmt --check` — passed.
- `TERMINAL_HOST_LOCAL_BUILD=1 TERMINAL_HOST_CONTRACTS_ONLY=1 cargo test --lib` — passed: 92 tests, 0 failed, 1 intentionally ignored manual million-seed target. This covers all ten frame slots and wraparound, single-column display width, progress lifecycle mappings, semantic glyph preservation, repaint eligibility, fallback rendering, independent accents, clipping, and hit geometry.
- `openspec validate restore-v2-tab-status-icons --strict --no-interactive` — passed.
- `npm run typecheck` — passed.
- `npm run preflight` — passed on the committed implementation head, including build, type checking, architecture and documentation governance, strict OpenSpec validation, 197 PR-core tests, and 79 resident-tab selected tests.

The contract-only local native run is development evidence by repository policy; the selected Windows x64, Linux x64, and macOS arm64 native lanes remain the required product-build evidence after finalization.

## Known gaps

None identified. Platform-native build and test execution remains required CI evidence, not a waived gap.
