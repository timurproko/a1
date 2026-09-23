## 1. Capture copy preference and feedback behavior

- [ ] 1.1 Add viewport-controller fixtures for enabled and disabled release-time copying, live value changes, retained selection, and setting-independent explicit `Ctrl+C`; verify disabled release creates no copy snapshot.
- [ ] 1.2 Add shell and terminal-replay fixtures for exact `copied N chars to clipboard` wording, right-aligned accent styling immediately above the editor, one-row replacement, expiry, whitespace-only suppression, narrow clipping, and timer cleanup; verify no reverse-video/top-right flash remains.
- [ ] 1.3 Add settings fixtures proving Pi's generated `Fullscreen copy on select` entry appears exactly once under Agent in bare A1, persists through the engine port, applies live, and leaves `a1 pi` unchanged.

## 2. Apply Pi's copy-on-select setting

- [ ] 2.1 Promote `fullscreenCopyOnSelect` to a supported live shell effect for the custom viewport and verify bare-mode effect inventory and capability filtering pass.
- [ ] 2.2 Initialize and bind the custom selection controller to Pi's effective value, gate release-time snapshot capture, and verify explicit copy still captures and clears a retained selection when automatic copy is disabled.
- [ ] 2.3 Verify settings writes update the next release before reporting success and that profiles without A1's selection owner do not install the bare-A1 effect.

## 3. Replace stacked flashes with owned dock feedback

- [ ] 3.1 Add a single timed copy-acknowledgement state to the shell root, render it after above-editor widgets and before the editor with ANSI-aware right alignment and accent styling, and verify measured dock/editor geometry remains valid.
- [ ] 3.2 Route successful latest-intent frame copies to the owned acknowledgement using exact payload count and non-whitespace metadata; verify whitespace copies still deliver and stale, failed, timed-out, canceled, or superseded completions do not show success.
- [ ] 3.3 Cancel and replace the acknowledgement timer on new success, reset, session replacement, and disposal; verify rapid copies never stack and no post-disposal render occurs.

## 4. Validate and hand off the exact candidate

- [ ] 4.1 Run focused viewport, selection, response-copy, settings bridge/section, shell, and terminal-replay tests plus typecheck, build, architecture/documentation checks, and strict OpenSpec validation; record evidence and explicitly disposition any gap in `design.md`.
- [ ] 4.2 Build the exact candidate and provide a color-preserving `./scripts/dev` handoff that verifies lower-right non-stacking feedback, whitespace suppression, live automatic-copy toggle behavior, explicit copy when disabled, and unchanged `./scripts/dev pi` comparison behavior.
