## 1. One workflow, two triggers

- [x] 1.1 Add `release.yml`: resolve the channel and version from the ref, build the
  guardian on every platform, pack once, validate those bytes on every platform,
  publish, and verify the registry
- [x] 1.2 Stamp preview versions at publish time and never commit them
- [x] 1.3 Stage the stable GitHub Release as a draft, publish it after npm, and
  remove it when publication does not complete
- [x] 1.4 Verify the packed product is this product before uploading it

## 2. One command for a stable release

- [x] 2.1 Add `scripts/release.mjs`: land the version, tag it, push the tag, reopen
  develop at the next prerelease
- [x] 2.2 Expose it as `npm run release` and drop the preview publishing commands

## 3. Retire what it replaces

- [x] 3.1 Delete the preview and stable candidate, certification, physical, and
  publisher workflows and their scripts
- [x] 3.2 Make `master` a fast-forward-only record the release writes, and add
  release-tag protection beside it
- [x] 3.3 Point the product identity boundary check at the new publisher

## 4. Say how it works

- [x] 4.1 Rewrite the CI and release runbook
- [x] 4.2 Document both channels and the bump options in the README
- [x] 4.3 Replace the publication section of the toolchain document

## 5. Governance

- [x] 5.1 Replace the two publisher policy tests with one release pipeline policy
- [x] 5.2 Update the ruleset and runbook governance tests

## 6. Validate and integrate

- [x] 6.1 `npm run typecheck`, `npm run check:architecture`, and `openspec validate --strict` pass
- [ ] 6.2 Open the pull request and let CI validate
- [ ] 6.4 Record manual acceptance — a preview publishes from a push, then `0.1.1`
  publishes from its tag — then archive
