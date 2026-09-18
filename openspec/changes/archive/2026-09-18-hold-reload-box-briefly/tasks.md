## 1. Hold the reload box

- [x] 1.1 Add `reloadPresentation?: { minVisibleMs?, now?, sleep? }` to `OwnedUiSessionShellOptions` in `session-shell-root.ts` and store it on the shell.
- [x] 1.2 In the workflow surface path of `session-shell.ts`, record `now()` when the operation surface is set and, for `reload`, await `#holdReloadSurface(elapsed)` before clearing the surface; return early when nothing remains or the shell is disposed; default the window to 400 ms.
- [x] 1.3 Pass `reloadPresentation: { minVisibleMs: 0 }` from the shell test fixture by default and add two cases: a 50 ms reload holds for exactly 350 ms with the box still rendered until the sleep releases, and a 400 ms reload records no sleep.
- [x] 1.4 Raise the startup graph byte baseline to the new exact size; run `npm run typecheck`, the session-shell suite, and the architecture and code-documentation checks; record outcomes: `npm run typecheck` clean, `npx vitest run test/integrations/pi/session-ui/session-shell.test.ts` 301 passed, architecture and code-documentation checks OK; baseline raised 2647587 -> 2648908.
