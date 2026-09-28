## Automated Evidence

- `npx vitest run test/integrations/pi/engine/repository-pr.test.ts test/integrations/pi/engine/session-runtime.test.ts` passed: 2 files, 54 tests. Coverage includes CLI preference, public and authenticated REST fallback, exact remote/head/state/URL validation, bounded response handling, cancellation, silent HTTP failure, and existing runtime refresh/disposal behavior.
- `npx vitest run test/repository-governance/startup-graph-policy.test.ts test/repository-governance/startup-lazy-imports.test.ts` passed: 2 files, 12 tests. The REST collaborator remains dynamically loaded and declared optional.
- `npm run typecheck` passed for source and executable entry points. `npx tsc -p tsconfig.build.json` also produced the TypeScript build directly.
- `npx openspec validate support-pr-rest-fallback --strict`, `npm run check:code-documentation:changed`, `node scripts/pi/update-startup-graph-baseline.mjs --check`, and `git diff --check` passed.
- Architecture boundaries, product identity boundaries, product identity governance, and terminal-host provenance passed. The aggregate architecture command then reached the target branch's pre-existing stale `pi-coding-agent:src/core/keybindings` source-ledger mapping; this change does not edit that mapping or destination.
- A maintainer ran the live unauthenticated invocation in this worktree with `gh` absent from `PATH`; it resolved `{ number: 592, url: 'https://github.com/timurproko/a1/pull/592' }` through the new REST fallback.
- Focused owned-contract, linked-session-shell, and footer component coverage passed: 3 files and 63 tests. Together with the live probe and runtime metadata tests, this preserves the canonical linked `#<number>` footer path without changing rendering code.

## Environment Disposition

- `npm run build` is locally blocked before compilation because this machine lacks both GitHub CLI and the Rust toolchain required by the repository environment preflight. The complete TypeScript build and generated startup-public artifact passed directly; required CI owns the complete package/native build in its prerequisite-complete environment.
- No known implementation gap remains.
