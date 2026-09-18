# Design

## Rewrite only what drifted

A reviewed anchor or line range that still holds is left byte-for-byte alone, so a run against the current pin is a no-op and a run against a candidate produces a diff that is exactly the drift. Anchors are snippets checked with `includes`, so the only safe rewrite is to a line that contains the snippet ignoring whitespace; anything looser would be guessing, and guessing is what `orphaned` is for. Line ranges are widened to the named symbols' span (first definition line to the closing brace of the last one) and then to the nearest occurrence of each anchor, which reproduces how the ranges were chosen by hand.

## Orphaned and unmapped are states, not fixes

The governance tests already reject a missing anchor, a stale hash, or a stale manifest. The sync adds `status: "orphaned"` so the entry is visibly the one to review, and reports components the modal graph has never recorded as unmapped instead of inventing nodes for them (a node needs a controller, evidence, and acceptance mapping only a human can supply). Both make `--check` fail, so an upgrade pull request that carries them cannot look clean.

## Core and CLI

The resolution is a pure function over inventories and source text so the suite can drive it with a sixteen-line fake `interactive-mode.ts`; the CLI reads the installed packages, the lockfile, and the inventories exactly as the tests do (dist JavaScript for the modal and presenter anchors, source maps for the behavior baseline).

## What the sync does not decide

It never bumps the pinned version on its own: an installed version that differs from the inventories' pin requires `--commit`, which the upgrade workflow resolves from the release tag. The tests' hard-coded `0.84.2` and commit checks stay; the first real bump (plan PR19) moves them with the pin.
