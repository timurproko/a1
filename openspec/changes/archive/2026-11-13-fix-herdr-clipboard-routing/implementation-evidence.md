# Implementation evidence

## Delivered behavior

The shared session-shell destination policy recognizes a nonempty Herdr terminal ID independently of the emulator name, or the `herdr` terminal-program marker alone. Existing terminal transport and paste boundaries provide terminal-only copy and refuse wrong-host native paste acquisition without changing explicit clipboard ports or the comparison profile.

Hermetic regressions cover the destination matrix, exact short/Unicode OSC 52 delivery when a fake native writer would succeed, unavailable/denied/oversized terminal routes without platform fallback, selection autocopy and explicit copy, exactly-once bracketed paste without a redundant read, and native-paste refusal with the explicit-port control. Test setup clears inherited Herdr identity so unrelated fixtures retain their neutral terminal contract. No real system clipboard is read or written by these regressions.

## Focused checks

- `npm run build`: passed.
- `npm run typecheck`: passed after building emitted modules required by the bin configuration.
- `npx vitest run test/app/session-shell/response-copy-transport.test.ts test/app/session-shell/herdr-clipboard.test.ts test/repository-governance/terminal-environment.test.ts`: 53 tests passed across three files.
- `npx openspec validate fix-herdr-clipboard-routing --strict`: passed.
- `npm run check:code-documentation:changed`: passed.
- `git diff --check`: passed.

The first typecheck on the fresh dependency-only checkout could not resolve generated `dist/` imports in the bin configuration. Building the checkout resolved that prerequisite; no source repair was needed.

## Known-gap disposition

No substantive implementation gaps remain. Physical Herdr cross-machine clipboard delivery is not certified by these fixtures and remains an optional maintainer check: copy a short word on each machine and paste into the other session in both directions. Existing OSC 52 permission denials and lack of desktop clipboard acknowledgement remain transport limitations, not deferred implementation work. The existing copy acknowledgement wording is unchanged by design.
