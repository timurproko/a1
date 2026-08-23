## 1. Name the preview after its commit

- [x] 1.1 Resolve the preview version from the commit being published rather than
  from the run counter, refusing a sha that does not resolve
- [x] 1.2 Pin it in the release pipeline policy, including that the run counter is
  not used

## 2. Say so

- [x] 2.1 Update the README, runbook, and toolchain document

## 3. Validate and integrate

- [x] 3.1 `npm run typecheck`, `npm run check:architecture`, and `openspec validate --strict` pass
- [ ] 3.2 Open the pull request and let CI validate
- [ ] 3.3 Record manual acceptance — a merge publishes a preview naming its commit — then archive
