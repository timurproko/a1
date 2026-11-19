# Implementation evidence

## Result

- Cleanup repository discovery now derives `owner/repository` from exactly one literal repository-local `remote.origin.url`, so Git transport rewriting no longer turns a canonical GitHub origin into `unsupported-origin`.
- Fetch and ref operations still use the named `origin` remote, preserving ordinary `url.*.insteadOf` routing to account-specific SSH hosts and keys.
- Literal SSH aliases, non-GitHub hosts, empty values, malformed URLs, and multiple configured origin URLs remain fail-closed; cleanup does not inspect or trust external SSH configuration.
- Documentation now distinguishes canonical repository identity from Git's effective credential transport.

## Validation

- `node --test test/repository-governance/local-cleanup.node.mjs` — 77 tests passed, including the real Git URL-rewrite fixture and negative origin-identity cases.
- `node --test test/repository-governance/local-cleanup-evidence.node.mjs test/repository-governance/local-cleanup-watch.node.mjs` — 18 tests passed.
- `npm run check:architecture` and `npm run check:code-documentation:changed` — passed.
- `npx openspec validate support-cleanup-origin-rewrites --strict` and `git diff --check` — passed.

## Known gaps

None.
