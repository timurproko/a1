## 1. Confirm the development-publication contract

- [x] 1.1 Resolve the nightly time, manual-command wait behavior, and stable-release
  trigger
- [x] 1.2 Finalize the delta specifications from those answers before changing code

## 2. Trigger only deliberate development publications

- [x] 2.1 Remove development-preview publication from ordinary pushes while
  preserving pull-request validation
- [x] 2.2 Keep nightly at `03:17 UTC` and always run complete verification for
  current authoritative `origin/develop`; publish its exact candidate only when the
  numbered preview is absent, and otherwise verify the exact registry package with
  a publication-only no-op
- [x] 2.3 Add `npm run develop` as an authenticated GitHub Actions dispatcher that
  waits and reports the exact version; stop successfully before building when the
  current numbered preview exists, and never publish workstation-built bytes
- [x] 2.4 Make `npm run release` explicitly dispatch stable publication after the
  stable version pull request merges, wait for it, and only then open the next
  development line

## 3. Publish numbered previews

- [x] 3.1 Resolve the unique merged pull request associated with the selected
  `develop` commit through GitHub before packing, serializing publication checks so
  concurrent manual and nightly triggers reduce to one publish and one successful
  no-op
- [x] 3.2 Stamp `<base>-dev.<number>` without a version commit and bind the source,
  number, version, and digest into the packed-candidate evidence
- [x] 3.3 Keep exact-byte multi-platform preview gates, npm provenance, and the
  invariant that a preview moves `next` but never `latest`

## 4. Install and explain numbered previews

- [x] 4.1 Resolve `a1 update:<number>` against published preview versions while
  preserving full-preview-version selection and release refusal
- [x] 4.2 Replace the public `a1 update:next` spelling with `a1 update:develop`;
  refuse the removed spelling with an actionable redirect before registry or
  runtime work
- [x] 4.3 Replace user-visible `next` channel wording with `develop`, including
  `a1 update (develop)` progress and the `Develop` field in `a1 version`, while
  retaining npm's internal development dist-tag convention
- [x] 4.4 Update `README.md`, `docs/ci-release-runbook.md`, launch-profile docs, and
  architecture guidance to replace hash-based automatic-preview and `next`
  instructions with numbered examples, the nightly behavior, `npm run develop`,
  and `a1 update:develop`
- [x] 4.5 Update workflow, command, resolver, version-statistics, and governance
  tests for the accepted trigger, numbering, and terminology contracts

## 5. Validate and integrate

- [ ] 5.1 Open one implementation pull request and let GitHub Actions run the
  required validation
- [ ] 5.2 Manually request a development publication, confirm the expected numbered
  version reaches npm `next`, install it with `a1 update:<number>`, and record the
  acceptance before archiving
