## Context

See `proposal.md` for motivation. The existing contextual-suggestion component already applies SGR faint (`2`) to ghost text and clears that treatment when Tab accepts the suggestion into ordinary editor text. Component tests assert both states. The regression begins only after multi-agent tabs route the child terminal through the resident native host.

The resident holder parses child output into libghostty-vt and later composes retained cells into ANSI frames for the attached outer terminal. `GhosttyStyle` already receives libghostty's `faint` boolean, but the host's `cell_style` conversion drops it from `ActiveStyle`, and `write_style` has no SGR `2` emission. Foreground colors, bold, italic, underline, and inverse survive this boundary; faint alone is erased. Direct/solo rendering does not pass through this conversion and therefore retains the previous behavior.

## Goals / Non-Goals

**Goals:**
- Preserve faint intensity across resident initial paint, repaint, and reattach frame composition.
- Keep contextual suggestions dim until acceptance and ordinary accepted or typed prompt text at normal intensity.
- Add a native fidelity regression that fails at the exact conversion boundary.

**Non-Goals:**
- Changing suggestion generation, lifecycle, wording, or acceptance/submission behavior.
- Introducing a new theme color in place of ANSI faint intensity.
- Expanding terminal protocol messages or changing libghostty-vt.

## Decisions

### Carry faint as a first-class composed cell attribute

Add `faint` to `ActiveStyle`, populate it from `GhosttyStyle.faint`, force it off for the host-owned uniform selection style, and emit SGR `2` after the existing reset when active. The composer already emits a full reset whenever its active style changes, so a following non-faint cell naturally returns to normal intensity without needing a separate partial reset path.

Alternative considered: translate faint cells to a hard-coded grey foreground. Rejected because faint is terminal semantics, themes and outer terminals own its visual result, and foreground substitution would not preserve arbitrary faint child content.

### Prove both ghost and accepted intensity at the native boundary

Extend the existing input/fidelity probe with a faint-span frame and a subsequent normal-intensity repaint. Require the emitted faint SGR for the first frame and reject faint leakage in the normal frame, then expose the result as an additive fidelity field required by `verify-terminal-fidelity.mjs`. Existing editor tests continue to prove that Tab changes the suggestion from semantic ghost state to ordinary text; the native probe proves the resident transport no longer erases or leaks the corresponding intensity.

Alternative considered: add only another TypeScript editor snapshot. Rejected because current component coverage already passes while the bug remains downstream in native frame replay.

## Risks / Trade-offs

- **[Risk] Faint state leaks into later cells or frames** → retain the full-reset style transition and assert a normal-intensity repaint after the faint frame.
- **[Risk] Selection combines with child faint styling unexpectedly** → preserve the host's existing uniform selected-cell style and explicitly set its composed faint flag false.
- **[Trade-off] The fix preserves faint for all resident child content, not only suggestions** → this is the correct terminal-fidelity behavior and matches the resident surface contract.

## Migration Plan

No state or protocol migration is required. Ship the corrected terminal-host artifact through the ordinary package pipeline; already-running resident cohorts retain their immutable older host until stopped, and new cohorts use the corrected composer. Roll back by reverting the additive style field and probe requirement in an ordinary corrective change.

## Evidence

`ActiveStyle` now carries `faint` from `GhosttyStyle.faint`, the host-owned selected-cell style sets it false, and `write_style` emits SGR `2` after its leading reset. Every style change still begins with `ESC[0m`, so ordinary cells after faint ones return to normal intensity; foreground, background, bold, italic, underline, and inverse emission is unchanged.

`--probe-input` writes `> fix ` followed by faint `the tests`, then repaints the row as plain `> fix the tests`. It resolves SGR intensity at each needle in the composed frames, skipping extended-color operands, and requires `fix` normal and `the tests` faint in the first frame and the accepted text normal in the repaint. It reports `faintIntensity`, which `verify-terminal-fidelity.mjs` now requires.

- Local, Windows: `TERMINAL_HOST_LOCAL_BUILD=1 TERMINAL_HOST_CONTRACTS_ONLY=1 cargo check --all-targets` and `cargo fmt --check` passed; `npm run preflight` passed. The terminal host is not built locally (endpoint protection quarantines its Zig build), so the probe runs in CI only.
- CI, Development validation on `4b07fc24`: native terminal host passed on Linux x64, macOS arm64, and Windows x64 with `"faintIntensity":true` in the probe output, and resident chaos passed on all three. Changed-file documentation validation failed on one unprefixed probe comment (DOC005); `228db6ee` prefixed it, and the run on that head succeeded with every selected lane passing.

Gaps: the physical bare-A1 suggestion in a resident tab is not exercised by an automated test; the editor's own faint/accept tests plus the native probe cover each side of the boundary, and the end-to-end view is left to maintainer acceptance. The selection-over-faint scenario relies on the unchanged uniform selection path with `faint` forced false, covered by the existing `--probe-selection` uniform-style check rather than a faint-specific probe.
