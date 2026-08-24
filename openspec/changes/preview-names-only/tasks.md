## 1. Keep the preview path to previews

- [x] 1.1 Refuse a release named after the colon, telling it apart from a preview
  and pointing at the release command
- [x] 1.2 Cover the refusal, including that nothing is installed

## 2. Say less

- [x] 2.1 Show only the commit form in the README, and describe the version form
  as the forgiving spelling rather than a second way

## 3. Validate and integrate

- [x] 3.1 `npm run typecheck`, `npm run check:architecture`, and `openspec validate --strict` pass
- [ ] 3.2 Open the pull request and let CI validate
- [ ] 3.3 Record manual acceptance — naming a release is refused — then archive
