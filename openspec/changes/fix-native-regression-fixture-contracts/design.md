## Context

See proposal.md for motivation and scope. A design is needed because native-platform acquisition, failure-path process ownership, and exact-package acceptance must remain distinct from simulated clipboard success.

Planning base `d5d7c1b100158e9d0efdb44f0490ced2ee4ea266` is the #402 merge. Its source was `58627bb20a5b18c9b0546a23eeea6dde2f76bd05`. Normal PR CI [34880028901](https://github.com/timurproko/a1/actions/runs/34880028901) passed; Full regression [34880029189](https://github.com/timurproko/a1/actions/runs/34880029189) did not:

| Lane/job | Observed result | Owner and evidence |
| --- | --- | --- |
| macOS 24 / 104096883058 | Failed: 1 test, 303 files passed | New #402 command test expected `/var/folders/.../predecessor space ...`; child reported `/private/var/folders/...`. Other fields matched. |
| Linux 24 / 104096883101 | Failed: 5 tests, 301 files passed | Source native/empty acquisition and emitted paste acquisition returned `paste-unavailable`; repeated lifecycle failed on paste; next capacity check expected 8 forks but observed 7. |
| Windows 24 / 104096883050 | Failed: 2 tests, 303 files passed | `session-shell.test.ts:3660` retained a pending image paste; line 3697 retained a screenshot chip instead of `text fallback`. Separate cause not established. |
| Windows 22 / 104096882973 | Failed: 1 test, 303 files passed | `release-command.test.ts:20`, development patch-release/manual-gates scenario exceeded its existing 20000 ms limit. Separate cause not established. |

All four lanes have now completed with failure. The actual published-predecessor integration test passed in the completed Linux and both Windows logs; successful helper assertions or absence of the old RPC error do not establish the historical RPC origin or complete recovery.

Source review establishes a concrete Linux fixture mismatch: `system-clipboard.ts::readSystemClipboardText` uses native `getText()` only on Windows/macOS, then Linux tries `wl-paste` and `xclip`. `paste-fixture-base.mjs` and `clipboard-built-fixture-base.mjs` replace the native module but do not intercept successful/empty Linux commands. Their documented no-host-clipboard promise is therefore incomplete. The source denied/blocked-command fixtures already demonstrate a process-local import-hook boundary for `node:child_process` specifically when imported by `system-clipboard`.

The lifecycle test's failing paste assertion executes `cancel()` in `finally` without awaiting `stopped`; the executor's live set is released only on exit/close. The initial implementation at `ab0035b4` reproduced one occupied slot after rejection and restored full admission by awaiting shutdown; this proves the contamination mechanism, not every historical event. Its 57 focused tests passed on Windows Node 22/24; native Unix confirmation remains pending.

The maintainer subsequently approved extending both the plan and implementation to the Windows test/fixture owners. This supersedes the diagnostic-only boundary recorded at the initial implementation checkpoint. Selective unchanged Windows diagnostics passed (shell cases 1067/714 ms; release case 5235 ms), while the failing native release case took 21744 ms against its existing 20000 ms test limit. There is not yet enough evidence to identify a production defect or a specific removable cost.

## Goals / Non-Goals

**Goals:** Repair the observed macOS expectation and Linux fixture boundary; make failed scenarios release owned resources deterministically; identify and correct demonstrated Windows test/fixture defects; preserve real source/emitted helper execution, real release operations, and independent output oracles; produce native evidence without hiding other failing owners.

**Non-Goals:** Change production clipboard selection, fallback behavior, paste protocol, image conversion, lifecycle admission policy, or the eight-request limit. Do not add dependencies, host clipboard services, desktop automation, sleeps, retries, longer timeouts, pool changes, skips, relaxed payload assertions, regenerated baselines, or changes to independent rendering/input budgets. Windows test/fixture diagnosis and evidence-driven correction are now authorized, but production shell/clipboard/release changes are not. No replacement of a bounded polling assertion with a longer or unbounded completion wait, prewarming to hide cold behavior, reuse of mutable fixtures across scenarios, or fabricated completion is permitted. Production defects or additional corrective surfaces require a reviewed plan refinement before edits.

## Decisions

### 1. Assert requested directory identity independently

Derive the expected canonical identity from the created fixture directory using filesystem resolution; keep passing the original requested path to the command. Compare the filesystem identity of the child's reported cwd to that independently identified directory, resolving the reported path too where a platform preserves an alias spelling. Never derive the expected directory from the child's answer. Retain the exact argument vector and environment assertions. Do not strip `/private`, normalize arbitrary strings into an accepted shape, or accept any temporary directory.

Exercise a controlled alias/junction as well as an ordinary path containing spaces, and include a distinct-directory negative control. Native macOS must run the original failing case. The negative control ensures this correction cannot make a child launched from the wrong cwd pass. No production path logic or command-runner behavior changes are necessary.

**Rejected:** Literal `/var` substitution is platform-specific string relaxation; dropping cwd from equality loses the original contract; changing the spawn cwd to mask the test defect fails to test aliases.

### 2. Interpose only the actual clipboard I/O boundary

Extend the existing fixture-local import-hook approach, using a narrowly scoped reusable fixture module if helpful. The source `tsx` entry and emitted JS entry must both install interception before importing their real helper. Native adapter fixtures continue serving Windows/macOS; Linux command interception serves the known `wl-paste --no-newline --type text` and `xclip -selection clipboard -o` contracts.

Keep explicit controlled modes: text, successful empty, denied, and first-backend unavailable with successful fallback. Preserve exact source text `external clipboard text`, emitted text `packaged native text`, empty `null`, and denied `paste-unavailable`. Unknown commands or argument shapes must fail closed rather than forward to a real clipboard utility or accidentally pass through fallback. Verify bounded acquisition observations and backend order independently without adding messages to the production paste protocol or disclosing actual clipboard data.

Intercept only imports owned by the actual system-clipboard module, retaining unrelated process functionality and the deliberately real blocked-command descendant test. Source helper, emitted helper, classification worker, image worker, inventory assertions, and IPC handling remain real. Do not spoof `process.platform`, install a desktop clipboard server, mock the whole system-clipboard module, or send pre-computed final paste results from a fake helper.

### 3. Treat result failure and process completion as separate boundaries

Use `try/finally` around the affected executor assertions. Always cancel where needed and await the existing `stopped` promise before the test finishes or removes owned fixture paths. Apply the same rule to jobs admitted in arrays, including failed recovery iterations. Preserve the original assertion failure if teardown also fails; do not swallow errors or wait only on successful result paths.

Reproduce early acquisition failure while the helper has not yet closed, using explicit lifecycle coordination rather than sleeps. Demonstrate cleanup completes before a subsequent batch is admitted and that all eight requests, ninth rejection, 12 copy/paste cycles, 16 cumulative recovery forks, and conversion serialization assertions remain intact. Keep exact child/process ownership and unrelated-state controls. If capacity remains wrong after proven cleanup, stop and seek approval for the newly established production or test-owner defect.

### 4. Attribute Windows shell failure before changing its fixture

Instrument the affected shell cases using existing paste diagnostics and test-owned lifecycle observations. Record bounded operation/phase labels, elapsed durations, pending/completed state, and cleanup outcome; exclude clipboard content, image bytes, prompts, credentials, and arbitrary terminal output. Capture the first failing attempt and retain its original assertion, rather than repeating it until it succeeds.

Distinguish acquisition, helper startup, classification/conversion, application of the prepared result, and teardown. The shell's existing success-only disposal is a concrete failure-path gap: make disposal failure-safe and verify a failed scenario cannot retain pending work into the next one. Do not infer that this alone fixes the first pending-image assertion. Add controlled regressions only once the cause is identified, retaining the real asynchronous helper/codec path and the exact canonical image bytes, text fallback, editor state, and normal/steering/follow-up submission assertions.

Correct only measured fixture sequencing, isolation, or overhead defects without changing the original wait/test deadlines or synthetic readiness. If real production work exceeds a retained limit and no valid fixture-only correction exists, report the measured blocker and request separate production scope rather than redefining success.

The measured fixture correction selects the current build's real cold emitted paste helper and, only for the exact source image-worker bootstrap, the emitted image worker. It removes test-only TypeScript loader/transpilation from these two shell integration scenarios, not asynchronous preparation or cold startup. The source helper tests remain unchanged in coverage, and independent source/emitted worker equivalence tests compare exact valid-image and malformed-image results. All payload, pending-state, copy, normal/steering/follow-up submission assertions and wait deadlines remain intact. Worker options/data, native ownership, and unrelated worker entries are preserved. A per-test completion hook guarantees disposal and restores the scoped selection even after an assertion fails.

Local first-attempt phase evidence showed the image request through cleanup at 558 ms on the source-loader fixture versus 139 ms with cold emitted entries; these are diagnostic observations, not a replacement for native CI or a new performance budget.

### 5. Attribute Windows release fixture cost while retaining real Git authority

Add bounded per-operation timing/counts to test-owned Git execution and fixture setup, assertion probes, manual-merge emulation, workflow calls, and teardown. Capture operation categories and durations without raw command output, arbitrary arguments, user paths, or generated payload contents. Include failed/unfinished operation identity where observable, preserve the original timeout/failure, and bound retained trace size. Verify instrumentation does not change returned Git values, command order, fixture clock semantics, mutation boundaries, or the real release workflow's decisions.

Use the measured evidence to correct fixture-only lifecycle or overhead defects. Keep real isolated repositories/worktrees and real Git reads/writes, exact manifest/lockfile assertions, stable-then-publication-then-development ordering, manual merge gates, advanced-source/branch rejection, and dirty/unrelated state controls. Do not replace Git with a self-model, cache stale assertion answers, omit independent verification, share mutable repositories, add warmup passes, or move work outside the measured scenario to evade the deadline. Any consolidation must preserve the independently observed operations and effects, with before/after evidence; otherwise leave it blocked.

Measured fixture-only overhead was Git's ancillary automatic housekeeping: 18 maintenance children in the controlled scenario. Set `gc.auto=0`, `maintenance.auto=false`, and `receive.autoGC=false` only in each disposable fixture's private Git configuration, including its local bare remote. The control retained all 80 workflow Git calls, the same publication/reopening outcome, and identical other child categories (including pack-objects and rev-list), while eliminating those 18 housekeeping children. The full assertion-bearing local scenario retained all 113 diagnostic operations and decreased from 5674 ms to 4272 ms. No workflow Git call, real transport/object operation, or independent assertion is omitted or cached; user/repository Git settings are untouched. Register fixture cleanup as soon as its private root exists so setup failures also retain a cleanup owner.

Retain the 20000 ms scenario limit and all other existing limits. A synchronous API alone is not proof that converting it to async will fix a wall-clock overrun. If a production release change is needed, stop for approval.

### 6. Keep native validation and recovery acceptance explicit

After approval, use focused source and build-first emitted tests on native Linux/macOS plus Windows Node 22/24. Record the red/green mechanisms; local Windows-only tests cannot certify Unix behavior. Run strict OpenSpec, full/changed documentation and applicable architecture checks. Keep this same PR, mark completed implementation ready before ordinary PR CI, and run the separate existing four-lane Full regression without duplicate draft dispatches. Do not seek merge while that required recovery run is failed or unfinished.

Retain all original final job outcomes. Windows 24's two shell assertions and Windows 22's release-command timeout remain named blockers until evidence verifies correction. If local selection cannot reproduce them, the existing dedicated Full regression workflow may validate a new instrumented head as an explicitly identified diagnostic run; this is not a retry of unchanged code, acceptance, or an ordinary draft CI dispatch. Seek a separate refinement if corrective code lies outside the approved test/fixture surface. Never treat limited implementation scope as permission to skip a test or call recovery complete.

After actual maintainer validation and explicitly authorized manual integration, retain #402's scheduled `mode=nightly` gate: newer numbered merged source, same immutable package bytes in all four full-release lanes, successful aggregate publication/verification, exact source/version/digest/run/jobs and registry identity. No reduced-scope development dispatch or existing-version no-op substitutes. Final acceptance and canonical-spec review precede archive preparation; coordinate #402 and earlier obligations individually instead of auto-completing them.

## Risks / Trade-offs

- [A fixture hook intercepts too broadly] → Match the importing clipboard boundary and known operations; test unexpected-operation failure and retain unrelated-process/real-descendant controls.
- [Native module replacement appears to work while Linux escapes] → Assert actual backend observations on native Linux and exercise emitted JS without a TypeScript loader.
- [Seven-versus-eight is not secondary contamination] → Require controlled reproduction and verified teardown; leave capacity unchanged and stop for refinement if the evidence contradicts this diagnosis.
- [Windows failures are production defects rather than fixture defects] → Retain phase evidence, block recovery, and obtain separate production approval; do not repair production behavior through test exceptions.
- [Instrumentation changes scheduling or cost] → Bound it, verify observation equivalence, and report its contribution; never compensate by extending a deadline.
- [Canonicalization weakens a directory oracle] → Keep independently resolved expected identity and distinct-directory rejection, not string surgery.
- [Current develop or nightly package advances] → Bind evidence to exact source and bytes and verify inclusion of all repairs, not a remembered version.

## Migration Plan

No application or data migration. Implement only after approval in this same new PR; #402 remains merged history. Rollback reverts only the new test/fixture corrections and retains failed-run evidence. Archive this follow-up and reconcile older streams only after real recovery evidence and maintainer acceptance; cleanup follows verified archive integration, not creation.
