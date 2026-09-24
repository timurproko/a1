## Implementation result

- Bare A1 now owns terminal mouse and focus reporting without also enabling Pi's mouse selection path.
- Pre-input owners retain first refusal; complete residual SGR reports are removed at the Pi adapter boundary before Pi can establish its reverse-video selection.
- Keyboard bytes and opaque bracketed-paste payloads remain ordered and unchanged, including mouse-looking bytes inside paste.
- The policy is opt-in for the custom viewport. Default adapter behavior, regular mode, and the pinned `a1 pi` comparison path remain unchanged.

## Focused automated evidence

- `npx --no-install vitest run test/integrations/pi/tui-runtime/mouse-report-input.test.ts test/integrations/pi/tui-runtime/adapter.test.ts test/integrations/pi/tui-runtime/conformance.test.ts test/ui/components/mouse.test.ts` — 43 tests passed.
- `npx --no-install vitest run test/app/session-shell/session-viewport-controller.test.ts test/app/session-shell/session-shell-lifecycle.test.ts` — 88 tests passed.
- `npx --no-install vitest run test/app/session-shell/session-shell-selection.test.ts` — 69 tests passed, including terminal-output proof that residual modified drags cannot paint Pi reverse video and that A1 dark-blue selection still paints.
- `npx --no-install vitest run test/app/session-shell/session-shell-links.test.ts test/app/session-shell/session-shell-reference-screens.test.ts test/app/session-shell/session-shell-paste.test.ts` — 119 tests passed for controls, hover/link routing, replacement screens, wheel behavior, and paste paths.
- `npx --no-install vitest run test/repository-governance/damage-aware-terminal-boundary.test.ts test/repository-governance/input-presentation-boundary.test.ts` — 6 tests passed.
- `npm run build` and `npm run typecheck` — passed.
- `npm run check:architecture` — architecture, identity, pinned-source provenance, and terminal-host checks passed; the startup graph baseline records the exact reachable-source increase.
- `npx --no-install openspec validate block-pi-fallback-selection --strict` and `git diff --check` — passed.

## Broader validation note

`npm run test:fast` completed its build, typecheck, documentation checks, and 341 test files, but its highly parallel Vitest remainder reported unrelated wall-clock timeouts and Windows temporary-directory cleanup locks. The timed-out suites passed on focused reruns; for example, `test/ui/components/transcript-viewport.test.ts --testTimeout=60000` passed 40 tests and `test/foundation/lifecycle/session-repository-context.test.ts --testTimeout=60000` passed 3 tests. All change-focused suites passed at their ordinary configured timeouts.

## Windows Terminal check

The maintainer tested pushed implementation commit `ea65b95621e2a1c57765d97570bcb51ce6b2a502` in Windows Terminal on 2026-09-24 and confirmed that no white selection appeared. The exercised check covered the planned Shift-modified navigation, wheel scrolling, streaming updates, A1 frame selection, overlays, and replacement surfaces. A terminal-native selection explicitly invoked through the host remains host-owned and distinct from the removed Pi viewport-anchored reverse-video selection.

## Known gaps

No known implementation gap remains.
