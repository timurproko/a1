# Implementation evidence (not acceptance)

## Authorization and connected policy

The maintainer requested implementation of connected PRs #401 and #400, then explicitly requested continuation. This authorizes the implementation, not live watcher activation, destructive live acceptance fixtures, final acceptance, or merging either PR.

Implementation remains in PR #400 on `chore/automate-local-worktree-cleanup`, worktree `D:/Git/a1/.worktrees/automate-local-worktree-cleanup`. PR #401's policy commit `434b021ee57b8ce0a4d3e6dfa5025dd18edf2798` was incorporated locally by merge commit `adebc206`; neither GitHub PR was merged. The order is completed implementation -> ready PR -> ordinary current-head PR CI -> actual maintainer review -> authorized manual integration -> automatic archive integration -> eligible cleanup.

## Delivered and locally verified

- Local registration/claim/release/recovery, canonical Git/filesystem identity, hidden-index and backlink checks, conservative content inspection, exact archive/acceptance/CI provenance, and absent remote-ref gates.
- Non-force worktree deletion, expected-SHA local-ref deletion, durable recovery journals, preservation of residual/reused paths and unrelated registrations, bounded reports, and opt-in bounded watch scheduling.
- Repository-owned delivery instructions and `docs/local-worktree-cleanup.md`; existing remote publication/deletion authority is unchanged.
- Dependency-free native fixtures are bridged into the ordinary Windows fast CI selection as a resource-sensitive test.

Local validation on Windows:

- `npx vitest run test/repository-governance/local-cleanup.test.ts --maxWorkers=1 --minWorkers=1`: passed; the bridge executes 42 focused native cases. The real Windows exclusive-file-handle and junction cases passed, not skipped.
- The final rate-limit change was additionally checked with `node --test test/repository-governance/local-cleanup-evidence.node.mjs`: 9 passed, 0 failed.
- `npx tsgo -p tsconfig.json --noEmit`: passed.
- `openspec validate automate-local-worktree-cleanup --strict`: passed.
- `node scripts/governance/check-docs-governance.mjs`: passed, 75 inventoried legacy occurrences matched.
- Targeted code-documentation inspection of all cleanup modules and fixtures: no violations.
- `git diff --cached --check`: passed.

No `test:fast`, `test:full`, or `test:release` suite was run locally. `npm ci --ignore-scripts --no-audit --no-fund` installed exact dependencies only in this implementation worktree for the focused bridge/typecheck.

## Safe inspection

From the implementation worktree, this command exercises read-only preview against the primary repository:

```bash
cd D:/Git/a1/.worktrees/automate-local-worktree-cleanup && node scripts/governance/local-worktree-cleanup.mjs preview --repo D:/Git/a1
```

Expected: unregistered existing worktrees are reported `unmanaged`; no live worktree, ref, ownership record, or retry checkpoint is changed. This preview was exercised locally. The primary branch and unrelated files were left untouched.

Destructive behavior has only been exercised in disposable temporary Git repositories. No live registration was released, no live cleanup was enabled, no watcher was started against this repository, and no remote mutation was performed by the new command.

## Same-PR CI repair

PR head `8166457ed226473c9375d105b7256997aeaf3642` failed Fast validation in run `34876664384`, job `104085535674`, during typechecking before the cleanup tests ran. The develop refresh brought in an existing incompatible assertion at `test/integrations/pi/session-ui/transcript-presentation-lifetime.test.ts:71`: `copyText` no longer exists on `SessionViewportInputResult`. Rendering, startup budget, both process-containment lanes, naming, and changed-file documentation checks passed; the aggregate correctly failed.

The maintainer explicitly directed that failed PR tests be repaired and repushed in the same PR without a separate proposal. Delivery configuration, skill, runbook, and existing change artifacts now record that policy, including narrowly scoped inherited failures while retaining tested behavior, required checks, and acceptance boundaries.

The assertion now extracts the existing `copySelection` snapshot through `selectionCopyRowText`, as adjacent viewport tests do, and still requires exactly `COPY_CURRENT` at both viewport sizes. No production API, test coverage, expected text, timeout, or CI gate was weakened.

Repair validation on the refreshed checkout:
- `npx tsgo -p tsconfig.json --noEmit`: passed (the original error was first reproduced locally).
- `npx vitest run test/integrations/pi/session-ui/transcript-presentation-lifetime.test.ts test/integrations/pi/session-ui/session-viewport-controller.test.ts --maxWorkers=1 --minWorkers=1`: both files passed, 69 tests.
- Strict OpenSpec validation, docs-sensitive governance (75 occurrences), and whitespace checks passed.

Normal synchronize-triggered CI must validate the repushed candidate. These focused results do not mark task 6.2 or acceptance complete.

## CI suite-registration repair

Run `34877744234` at `b60152f1f9c450ed7b1b3b5ff071809cba960ff3` passed typechecking and architecture, then failed two fast-suite assertions: the expected active resource-sensitive lists in `resource-sensitive-validation.test.ts` and `validation-suite-policy.test.ts` omitted the newly registered `local-cleanup.test.ts`. The ordinary invocation reported 3165 passing tests and two failures; the resource-sensitive invocation had not yet run. Other required jobs passed, and the aggregate correctly failed.

Both independent expected lists now include the cleanup bridge in manifest order. Exact list equality, exclusion from the ordinary remainder, single execution, and timeout/retry checks remain intact; historical incident partitions are unchanged. No production code or CI selection was weakened.

Local repair validation: the two policy suites and cleanup bridge passed together with file parallelism disabled (20 Vitest tests, including the bridge's 42 native cleanup cases). Typechecking, strict OpenSpec validation, and whitespace checks passed. Required current-head CI remains pending, so task 6.2 is not complete.

## Windows lock-fixture lifetime repair

Run `34879154754` at `fd7f1258a4c8814f0215259cb5f072b228ff3a6c` passed the ordinary fast invocation but failed the cleanup bridge in the resource-sensitive invocation: 41/42 native cases passed, while the Windows exclusive-handle case unexpectedly read the file after a partial removal result. Other required jobs passed. The log did not establish whether the lock holder had already released its handle.

The fixture previously relied on `Console.ReadLine()` to hold the handle, making EOF an implicit release. It now deliberately closes stdin and uses an explicit release file outside the target. It requires read-sharing errors before and after the real non-force Git removal, an alive holder, a Git removal failure rather than masked fixture-startup failure, retained directory/journal/ref, exact bytes after release, and refusal to retry deletion of the residual path. Readiness handles split output and early exits; holder lifetime and shutdown are bounded. Production deletion code, assertions about locked content, suite membership, test deadlines, and CI gates were not relaxed.

An unchanged copy of the original focused test also passed locally with verified Node `v24.20.0` and Git `2.55.0.windows.5`, so the exact historical hosted-runner cause remains unproven. Matching tools were downloaded into temporary storage (Node archive checked against official SHASUMS256); no system installation or repository dependency changed. Initial `npm exec --package=node@24.20.0` attempts still resolved Node 24.16.0 and are not evidence of version parity; subsequent runs invoked the downloaded executable via a temporary PATH and verified its version.

Broader repair validation with those verified tool versions and CI environment flags:
- Candidate build and typecheck passed.
- All 12 manifest-selected resource-sensitive files passed without file parallelism: 94 Vitest tests, including the bridge's 42 native cases.
- All four `dist-integration` files passed against that build: 12 tests.
- Strict OpenSpec validation and whitespace checks passed.

The full fast/full/release suites were not run locally. Hosted current-head CI remains required; this fixture hardening is not a claim that the original runner-only cause was reproduced, nor acceptance or live cleanup authorization.

## Develop conflict resolution

Integrated develop `d5d7c1b100158e9d0efdb44f0490ced2ee4ea266` into the existing PR branch. Its merged #402 also repaired the transcript copy assertion, causing the only conflict. Retained develop's explicit `snapshot` presence check and exact `COPY_CURRENT` extraction; kept this PR's cleanup, Windows lock-fixture repair, and delivery policy intact. No other session's worktree was edited.

Post-merge validation with Node 24.20.0 / Git 2.55.0.windows.5: typecheck passed; transcript lifetime, viewport controller, and cleanup bridge all passed (70 Vitest tests, with 42 native cases inside the bridge); strict OpenSpec, docs governance, and staged whitespace checks passed. Required CI must run on the resolved merge head.

## Native Windows sharing probe

Run `34881881185` at `f885f1a62b3002c713d229848c68b9fa3f4f6243` again passed the ordinary fast invocation and failed only the cleanup bridge in the resource-sensitive group. Added diagnostics show `removalAttempted: false` (the failed assertion at line 306), a live holder, empty holder stderr, and a partial journal with `local-operation-failed`. Thus the fixture failed before invoking Git; the prior stdin-lifetime hypothesis did not resolve the hosted failure. The earlier run had also shown Node reading the supposedly locked file successfully. The underlying platform-specific reason for Node's read behavior is not established.

Replaced the Node-specific read-rejection checks with independent PowerShell/.NET file-open probes that require exactly Win32 `ERROR_SHARING_VIOLATION` (32), both before and after the real Git removal. Unlocked-before and released-after controls must reject the probe's locked verdict. Unexpected probe failures are included in the fixture diagnostics rather than hidden by the reconciler's content-free error classification. Explicit release, real non-force Git failure, live holder, retained file/directory/journal/ref, exact bytes after release, and refusal to delete residual content remain required. No production cleanup change or timeout/skip/gate relaxation was made.

Local validation with verified Node 24.20.0 / Git 2.55.0.windows.5 and CI flags: the focused Windows case passed; the cleanup bridge and both partition-policy suites passed (20 Vitest tests including all 42 native cleanup cases); typecheck, strict OpenSpec validation, and whitespace checks passed. Hosted current-head CI is still pending, and task 6.2 remains incomplete.

## Image retry fixture synchronization

Run `34883632667` at `9d3b966cecd036bfc69860f537f59bad16e77735` failed the ordinary fast invocation in `session-shell.test.ts`: the real-image rejection/retry fixture hit `vi.waitFor`'s default one-second limit while image preparation remained pending. The invocation reported 3196 passes and one failure and stopped before the resource-sensitive group; it therefore provides no hosted confirmation of the native Windows sharing-probe repair.

The fixture now captures the reserved chip and awaits the existing real `waitForPromptPastes` completion promise before asserting readiness. The overall test timeout is unchanged, as are the real image worker, explicit Enter rejection/retry flow, no-dispatch-on-rejection assertion, single successful dispatch, and exact image-byte assertion. It also verifies the ready editor still holds the same chip. No production change, mock image preparation, or CI exclusion was introduced.

With verified Node 24.20.0 / Git 2.55.0.windows.5 and CI flags, the complete session-shell file and cleanup bridge passed together: 282 Vitest tests, including all 42 native cleanup cases inside the bridge. Hosted current-head CI is still required.

## Remaining gates

Required current-head PR CI must run after readiness; local results do not substitute for it. The maintainer must separately authorize an isolated live accepted-implementation/automatic-archive lifecycle and actual final-head review. Tasks 7.2 and 7.3 remain unperformed; there is no acceptance record. Mechanical archive tasks 8.1 and 8.2 remain for the corresponding future verified operations. Do not archive or integrate based on these fixture results.
