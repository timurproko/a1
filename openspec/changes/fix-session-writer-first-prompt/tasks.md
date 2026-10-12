## 1. Repair fresh-session handoff

- [ ] 1.1 Initialize a newly reserved session with its original Pi header only after native identity binding, reload that exact manager from the initialized path, and preserve session id, cwd, parent metadata, owner-only creation, and acquire-before-release ordering.
- [ ] 1.2 Keep existing, resumed, imported, and conflicting session paths unchanged; verify the repair applies through the shared runtime factory to initial startup, `/new`, and root-fork fresh managers.

## 2. Prevent regression

- [ ] 2.1 Add a focused initial-runtime regression that appends the first user message and verifies no `EEXIST`, valid header/message JSONL, unchanged session identity, and an exclusively held writer lease.
- [ ] 2.2 Extend replacement coverage to append the first user message after `/new`, verify valid persistence, and retain the existing bind-before-prior-release assertions.

## 3. Validate delivery

- [ ] 3.1 Run focused session-writer/runtime integration tests, type checking, strict OpenSpec validation, and diff checks; record evidence and any explicit known-gap disposition.
