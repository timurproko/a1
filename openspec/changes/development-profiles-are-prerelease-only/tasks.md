## 1. Decide what a build exposes from its own version

- [x] 1.1 Add CLI capabilities derived from the running version, with a prerelease
  version being the one that carries the development profiles
- [x] 1.2 Cover the version reading and the frozen result in `test/cli`

## 2. Make the command surface follow it

- [x] 2.1 Take capabilities in `parseCliCommand` and `dispatchCli`, and turn the
  fixed usage constant into usage for the build in hand
- [x] 2.2 Let `pi` fall through to the unknown-subcommand path when a
  build does not expose them
- [x] 2.3 Read the version once in `bin/cli.js` and pass the capabilities in
- [x] 2.4 Keep every other command identical between the two builds, and cover that
  in `test/cli`

## 3. Say so where the commands are documented

- [x] 3.1 Split the README command list so the development profiles are named as
  prerelease-only
- [x] 3.2 Say the same in the launch profiles document, including that the
  repository's own launch does not go through the command line
- [x] 3.3 Update the pinned usage assertion in repository governance to cover both
  builds

## 4. Validate and integrate

- [x] 4.1 `npm run typecheck`, `npm run check:architecture`, and `openspec validate --strict` pass
- [ ] 4.2 Open the pull request and let CI validate
- [ ] 4.3 Record manual acceptance — a prerelease build still opens both profiles,
  and a release-versioned build rejects them — then archive
