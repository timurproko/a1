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

PR #170 combined this evidence file outside the exact automatic allowlist with an
OpenSpec task update. Development validation run `33188542485` passed for exact head
`b95bdbf08ad6db76c5fab2bfca254026a3c4bcc1` without product tests. Auto-merge
remained disabled and the pull request remained open and mergeable until `timurproko`
manually squash-merged it to `6ab1e4d29b9edec8501bac774bc755e66240ea40`.
Close-event cleanup run `33188616709` reported `already-absent`, and the remote branch
was verified absent after the explicit merge.

## Automatic maintained-documentation acceptance

- Implementation PR #180 was manually squash-merged after required validation from
  head `8f40bfaaa5e8410e77b1c9cc0667c62bc4c62d4b` to
  `45a59a7b696d537a4dc8fe62000a60c20e504ab2`.
- PR #PENDING changes only this maintained `docs/**` file and is the live acceptance
  probe for the expanded allowlist.
- Acceptance requires current-head documentation validation, automatic squash
  integration without maintainer merge action, and exact-head remote branch cleanup.
  Exact run and merge evidence is recorded with the completed OpenSpec change.

## Advanced-ref refusal and final policy state

The isolated mocked-GitHub fixture executed the production shared reconciler with
expected SHA `1111111111111111111111111111111111111111` and advanced live SHA
`2222222222222222222222222222222222222222`. It returned `refused` with reason
`live branch advanced after merge` and issued zero DELETE requests. The bounded
record is archived as `evidence/advanced-ref-refusal.json`.

The final read-only live report matched all declared repository settings, Actions
policy, security capabilities, environments, protected refs, complete rulesets, and
workflow inventory with zero differences. No policy apply was run.
