# Design

## Propose, never adopt

Every step that could take a decision is designed not to: the merge leaves conflict markers instead of choosing a side, the inventory sync marks orphans instead of deleting them, a failed gate is recorded instead of aborting, and the workflow opens a draft instead of merging. The pull-request body is the complete list of what a reviewer must decide, in the repository's OpenSpec layout so the same finalization applies once the reviewer adds the acceptance section.

## Three-way merge from the packages

The old upstream source is only available from the installed package's source maps, so the driver reads every owned record's upstream text before bumping, and the new text after `npm ci`. `git merge-file --diff3` merges the A1 copy (header stripped) against them; the ledger updater then rewrites the header and records the hash, so a clean merge yields a copy that already passes the ledger check.

## One identity authority

Five suites and the ledger check named `0.84.2` and its commit by hand. They now read `pinned-pi-identity.mjs`, so the driver moves the pin by editing package.json, the lockfile, the ledger (`--commit`), and the inventories (`--commit`), and the checks follow. The many `Provenance:` comments in source that cite the old version describe where a behavior came from and are listed in the body as review items rather than rewritten.

## Trusted code, pinned actions

The workflow checks out the default branch with the App token, so the proposal runs only trusted policy code; the only untrusted input is the published package, which the candidate evaluator installs in an isolated root before the working tree is touched. Actions are pinned to reviewed commits as the governance spec requires; the App identity opens the pull request so ordinary CI runs on it.
