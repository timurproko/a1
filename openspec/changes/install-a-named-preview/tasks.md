## 1. Name a preview after the colon

- [x] 1.1 Parse `update:<commit>` alongside `update:next`, refusing an empty or
  unusable suffix and any trailing argument
- [x] 1.2 Resolve the named preview against the published versions, refusing one
  that was never published or that matches more than one version
- [x] 1.3 Cover the grammar and the resolution, including both refusals

## 2. Say so

- [x] 2.1 Document it in the README and the runbook, and in the usage text

## 3. Validate and integrate

- [x] 3.1 `npm run typecheck`, `npm run check:architecture`, and `openspec validate --strict` pass
- [ ] 3.2 Open the pull request and let CI validate
- [ ] 3.3 Record manual acceptance — install a named preview, then the newest — then archive
