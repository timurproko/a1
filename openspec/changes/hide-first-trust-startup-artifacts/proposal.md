## Why

On a profile's first resident-tab launch, confirming the project-trust dialog can leave a transient animated glyph in the tab chip and a lone cursor in an otherwise blank body before the owned shell appears. That handoff should stay visually quiet rather than exposing startup plumbing as user-visible content.

## What Changes

- Suppress the starting lifecycle glyph while the viewed tab is presenting the blank handoff between the project-trust dialog and the owned shell.
- Force the child cursor hidden for that blank starting handoff, then restore the shell's normal cursor behavior with its first drawn frame.
- Preserve working, input-needed, completion, failure, and ordinary restoration/restart status presentation outside this narrow first-run transition.
- Cover the trust-dialog-to-shell sequence with focused native presentation tests.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `multi-agent-tabs`: keep the first-run project-trust handoff free of transient startup glyphs and stray body cursors.

## Impact

- Native resident attach presentation and strip-state projection under `native/terminal-host/src/roles/` and, if a pure state helper is needed, `native/terminal-host/src/core/attach/`.
- Focused Rust unit coverage for starting blank surfaces and the following drawn shell frame.
- No new setting, protocol field, dependency, or change to `a1 solo` / `a1 pi`.
