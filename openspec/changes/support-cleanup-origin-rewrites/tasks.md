## 1. Preserve the blocker and identity boundary

- [ ] 1.1 Add a fixture whose canonical local GitHub origin is rewritten by `url.*.insteadOf`, proving effective transport uses an SSH alias while repository discovery retains `owner/repository`.
- [ ] 1.2 Retain negative coverage for literal unsupported aliases, malformed URLs, empty values, and ambiguous repository-local origin configuration.

## 2. Separate identity from transport

- [ ] 2.1 Read exactly one literal repository-local `remote.origin.url` for GitHub API identity without applying transport rewrites.
- [ ] 2.2 Keep fetch, ref observation, and authorized remote operations on the normal named Git remote so Git's credential alias remains effective.
- [ ] 2.3 Document canonical-origin requirements and supported `insteadOf` credential routing without broadening trusted hosts.

## 3. Validate and deliver

- [ ] 3.1 Run dependency-free cleanup fixtures, focused governance tests, strict OpenSpec validation, changed-documentation checks, and diff checks; do not exercise cleanup mutation against the live repository during implementation validation.
- [ ] 3.2 Reconcile current `origin/develop`, complete evidence and known-gap disposition, review the implementation diff, and add implementation-specific acceptance scenarios.
