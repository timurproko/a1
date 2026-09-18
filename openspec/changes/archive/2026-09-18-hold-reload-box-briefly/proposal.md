## Why

`/reload` in bare A1 replaces the editor with a "Reloading keybindings, extensions, skills, prompts, themes, and context files..." box while the resources reload. On a warm machine the reload finishes in a few milliseconds, so the box is drawn for at most one frame or never reaches the terminal at all: the editor blinks, or nothing visibly happens, and the reader cannot tell whether the command ran. Pi's own reload has the same box but its bundle loading is slow enough that it always reads.

## What Changes

- Keep the reload box on screen for a minimum visible window (400 ms) measured from when it was first shown; a reload that takes longer than that removes the box immediately when the workflow finishes, and a reload that finishes sooner waits out the remainder before the editor returns and the completion notice is shown.
- Expose the window, the clock, and the sleep as an injectable `reloadPresentation` option on the session shell so tests are deterministic; production uses the defaults.
- Disposing the shell during the hold releases it without restoring the editor.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: the reload box stays visible for a minimum window so a fast reload still reads as one.

## Impact

Implementation affects the workflow surface handling in `src/integrations/pi/session-ui/session-shell.ts`, the shell options in `src/integrations/pi/session-ui/session-shell-root.ts`, the shell fixture and two new cases in `test/integrations/pi/session-ui/session-shell.test.ts`, and the startup graph byte baseline. The share (`/share`) surface, the `a1 pi` route, and the completion notice itself are unchanged.
