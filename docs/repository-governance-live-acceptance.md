# Repository governance live acceptance

## Implementation lifecycle

- PR #165 was manually squash-merged by `timurproko` from validated head
  `45aab61c5e4568d3d26dc970f76e9ec86918f323` to `develop` commit
  `e4cdc67555e9f25d03f251be19baa8fc446ac313`.
- Cleanup run `33185942656` used trusted `develop` policy with `contents: write` only
  and reported `already-absent`; the implementation branch remained absent.
- The read-only live governance report matched every declared field after merge.

## Acceptance defect and correction

- Initial OpenSpec probe PR #166 automatically squash-merged validated head
  `c30c0a091a6a6a727057befcdd775422988be382` to
  `f8d60080cfd9925b33a19a5d40c707637ac00b08`, but GitHub suppressed the recursive
  close-event workflow because integration was authored with `GITHUB_TOKEN`.
- Its exact unchanged branch remained, proving the first implementation incomplete.
  The branch was manually deleted only after its expected SHA and lack of an open PR
  were reverified.
- Corrective PR #167 was manually squash-merged from validated head
  `3a09042386df2501accc1eec3b424b94ae84daa4` to
  `e8d639985a811f01cd5daeb027db5069d1724596`. Cleanup run `33188206793`
  succeeded with `already-absent`.

## Automatic OpenSpec acceptance

- PR #168 contained only `openspec/**` paths.
- Development validation run `33188285639` passed for exact head
  `6678d9237ca7c4109beaed0d97d5fb1183fe5f97` without product tests.
- `github-actions` automatically squash-merged it to
  `c2fa730a4b070f9f6717329c24158def5c766f11`.
- Trusted documentation reconciliation run `33188329123` reported `deleted` for the
  same expected head SHA, and the remote branch was verified absent.

## Automatic root README acceptance

- PR #169 changed only root `README.md`.
- Development validation run `33188400573` passed for exact head
  `165c5159031d80059c4d93c36c6d10113ec7ba8e` without product tests.
- `github-actions` automatically squash-merged it to
  `0180088a42b7cdacaf84ec66ff5a87be1a697155`.
- Trusted documentation reconciliation run `33188434277` reported `deleted` for the
  same expected head SHA, and the remote branch was verified absent.

## Mixed-path manual acceptance

This evidence file is outside the exact automatic allowlist while the same pull
request updates OpenSpec acceptance state. The pull request must remain open after
green CI, retain auto-merge disabled, and be merged only after explicit maintainer
acceptance. Its unchanged branch must then be reconciled by the trusted close-event
workflow. Final PR, run, merge, and ref evidence is recorded before archival.
