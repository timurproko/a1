## 1. Publish before recording

- [x] 1.1 Trigger the pipeline from pushes to `develop` alone and resolve the channel
  from what the commit declares
- [x] 1.2 Write the tag, the GitHub Release, and `master` after the registry is
  verified, and drop the draft staging that existed to protect the earlier order

## 2. Take the tag out of the command

- [x] 2.1 Stop creating and pushing a tag in `scripts/release.mjs`
- [x] 2.2 Wait for the publication to succeed before opening the next prerelease, so
  the command fails when the release fails

## 3. Say so

- [x] 3.1 Update the runbook, README, and toolchain document
- [x] 3.2 Rewrite the release pipeline policy tests around the new order

## 4. Validate and integrate

- [x] 4.1 `npm run typecheck`, `npm run check:architecture`, and `openspec validate --strict` pass
- [ ] 4.2 Open the pull request and let CI validate
- [ ] 4.3 Remove the `v0.1.2` tag left by the failed release
- [ ] 4.4 Record manual acceptance — a release that fails leaves nothing, and one
  that succeeds writes all three records — then archive
