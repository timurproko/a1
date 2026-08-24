## 1. Require what is actually bound

- [x] 1.1 Restate publication as binding commit, version, and digest, dropping the
  declared certification status and gate-result records

## 2. Remove what served the retired vocabulary

- [x] 2.1 Delete the development preview evidence model and its test
- [x] 2.2 Drop it from the release barrel
- [x] 2.3 Remove the architecture guards that policed the deleted publisher script,
  and the policy fixtures that exercised them

## 3. Validate and integrate

- [x] 3.1 `npm run typecheck`, `npm run check:architecture`, and `openspec validate --strict` pass
- [ ] 3.2 Open the pull request and let CI validate
- [ ] 3.3 Record manual acceptance — a preview still publishes to `next` and leaves
  `latest` alone — then archive
