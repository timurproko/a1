## 1. Repair fresh-session handoff

- [x] 1.1 Initialize a newly reserved session with its original Pi header only after native identity binding, reload that exact manager from the initialized path, and preserve session id, cwd, parent metadata, owner-only creation, and acquire-before-release ordering.
- [x] 1.2 Keep existing, resumed, imported, and conflicting session paths unchanged; verify the repair applies through the shared runtime factory to initial startup, `/new`, and root-fork fresh managers.

## 2. Prevent regression

- [x] 2.1 Add a focused initial-runtime regression that appends the first user message and verifies no `EEXIST`, valid header/message JSONL, unchanged session identity, and an exclusively held writer lease.
- [x] 2.2 Extend replacement coverage to append the first user message after `/new`, verify valid persistence, and retain the existing bind-before-prior-release assertions.

## 3. Validate delivery

- [x] 3.1 Run focused session-writer/runtime integration tests, type checking, strict OpenSpec validation, and diff checks; record evidence and any explicit known-gap disposition.

## Implementation evidence

- `npm run build` passed in the exact implementation worktree.
- Focused Vitest coverage passed: 3 files and 19 tests, including first-message persistence at startup, after `/new`, and after a root fork, plus native-lock alias/reservation integration.
- `npm run typecheck`, `npm run check:architecture`, and `npm run check:code-documentation:changed` passed.
- `npx openspec validate fix-session-writer-first-prompt --strict --no-interactive` and `git diff --check` passed.
- The runtime test confirms a fresh first user message persists without `EEXIST`, retains one original session header and exclusive writer authority, and preserves the no-resume-hint behavior before conversation content exists.
- Known gap disposition: no known implementation gap remains; a physical provider response is left to the built-candidate manual handoff because the regression targets the synchronous persistence boundary before any provider request.
