## 1. Establish the accepted implementation stream

- [ ] 1.1 After this proposal merges and implementation is explicitly requested, create a fresh detached worktree from current `origin/develop` and a separate code PR citing this change; verify the base commit and absence of unrelated changes.
- [x] 1.2 Record the original macOS job, failing truecolor/256-color cases, and 80-column row difference alongside the owned-versus-pinned key-label implementation comparison; verify the evidence identifies the omitted formatting rather than attributing the failure to color depth or Node version.

## 2. Restore scoped-model key-label presentation

- [x] 2.1 Add focused default, custom Alt chord, multiple-alternative, non-Alt, and unbound selector cases using independent expected labels; verify the macOS default/custom cases detect the raw-Alt defect before correction and Windows/Linux expectations retain Alt.
- [x] 2.2 Correct the selector's shared local key-label boundary before styling and layout, retaining effective binding lookups and input matching; verify header save and all footer hints pass the focused cases without modifying configured binding identities.
- [x] 2.3 Cover reorder/toggle, dirty and saved states, refresh outcomes, and cancellation using action callbacks and rendered hints; verify model changes stay session-only until explicit save and platform labels remain correct after the component refreshes.
- [x] 2.4 Correct the local attribution comment, recompute only the scoped-model ledger entry's `localSha256` from the final owned selector file bytes, and clarify its modification description if needed; verify digest equality and provenance checks pass while pinned versions, upstream `sha256`, approved deviations, unrelated ledger entries, and rendered baselines remain unchanged.

## 3. Prove strict cross-platform parity

- [x] 3.1 Retain the independent `command-outcome-parity.test.ts` oracle and extend only narrowly needed cases/worker support; verify exact scoped-model rows at 80 and 28 columns, dark/light themes, existing padding variants, and both color modes, including a negative label/ANSI/wrapping mutation that still fails.
- [ ] 3.2 Pass strict OpenSpec validation and required implementation CI, then obtain native macOS Node 24, Linux Node 24, and Windows Node 22/24 Full regression evidence; record source and run URLs and verify the formerly failing resource-sensitive command-outcome gate passes without new skips, exceptions, retries, or timeout increases.

## 4. Accept and validate the merged package

- [ ] 4.1 Provide the exact runnable worktree/commit and build-first color-preserving UI commands for manual scoped-model label, wrapping, reorder, save, and cancel review; record maintainer acceptance and explicit manual merge authorization while confirming code-PR auto-merge is disabled.
- [ ] 4.2 After accepted code merges, validate the newly numbered merged implementation package with full nightly-equivalent scope; record source, version, digest, and all four lane outcomes without modifying published package bytes or claiming an unrelated blocked gate passed.
- [ ] 4.3 Record complete acceptance and validation evidence, then synchronize and archive this change in a specification-only follow-up; verify strict validation and merged PR states before cleaning its retained worktrees, without prematurely completing the separate nightly change.
