# Terminal Redesign Clean Baseline

- Recorded: 2026-08-13T07:23:59Z
- Branch: `milestone/terminal-redesign`
- Baseline commit tested: `61b98e8a0c96682f50941ade3ef3c80b265bb9c8`
- Package: `@timurproko/addone@0.1.5-dev.7`

Task 1.135 was completed before any replacement terminal implementation was added.

## Passed gates

- `npm run build`
- `npm run check`
  - TypeScript typecheck
  - architecture policy
  - deprecated dependency policy using lockfile and registry metadata
  - retained unit and integration suite: 19 files, 73 tests
  - architecture-independent N-1 update release gate: 3 tests
- `npm audit --audit-level=high`: 0 vulnerabilities
- `openspec validate establish-addone-foundation --strict --json`: valid
- Exact package/version check: manifest, lockfile root, compiled runtime, and installed metadata all resolve to `@timurproko/addone@0.1.5-dev.7`
- `npm pack --ignore-scripts --json`: `timurproko-addone-0.1.5-dev.7.tgz`, 111 files, 63,618 bytes
- Packed-file inspection found no retired `drivers/terminal`, `host-terminal`, `presentation`, `test-harness`, terminal-input, console-mode, renderer/frame-writer, `node-pty`, or xterm artifact.
- `addone version` reported installed `0.1.5-dev.7`, registry release `0.1.4`, and next `0.1.5-dev.7`.

The only working-tree entry before recording this evidence was the pre-existing unrelated untracked `NUL`; it was not staged or included.
