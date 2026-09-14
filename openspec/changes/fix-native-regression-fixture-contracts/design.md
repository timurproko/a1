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

The lifecycle test's failing paste assertion executes `cancel()` in `finally` without awaiting `stopped`; the executor's live set is released only on exit/close. This is a plausible explanation of the next test admitting seven new children, not a proven independent production capacity defect. Plan a controlled failure-path reproduction before attributing it.

## Goals / Non-Goals

**Goals:** Repair the observed macOS expectation and Linux fixture boundary; make failed scenarios release owned resources deterministically; preserve real source/emitted helper execution and independent output oracles; produce native evidence without hiding other failing owners.

**Non-Goals:** Change production clipboard selection, fallback behavior, paste protocol, image conversion, lifecycle admission policy, or the eight-request limit. Do not add dependencies, host clipboard services, desktop automation, sleeps, retries, longer timeouts, pool changes, skips, relaxed payload assertions, regenerated baselines, or changes to independent rendering/input budgets. The newly observed Windows session-shell failures and release-command timeout are explicit diagnostic blockers, not silently authorized session-shell or release-governance implementation scope. Production defects or additional corrective surfaces require a reviewed plan refinement before edits.

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

### 4. Keep native validation and recovery acceptance explicit

After approval, use focused source and build-first emitted tests on native Linux/macOS plus Windows Node 22/24. Record the red/green mechanisms; local Windows-only tests cannot certify Unix behavior. Run strict OpenSpec, full/changed documentation and applicable architecture checks. Keep this same PR, mark completed implementation ready before ordinary PR CI, and run the separate existing four-lane Full regression without duplicate draft dispatches. Do not seek merge while that required recovery run is failed or unfinished.

Retain all original final job outcomes. Windows 24's two shell assertions and Windows 22's release-command timeout remain named blockers. Diagnose them read-only and seek an explicit scope refinement if corrective code lies outside the proposed fixture surface. Never treat this plan's narrower implementation surface as permission to skip those tests or call the recovery complete.

After actual maintainer validation and explicitly authorized manual integration, retain #402's scheduled `mode=nightly` gate: newer numbered merged source, same immutable package bytes in all four full-release lanes, successful aggregate publication/verification, exact source/version/digest/run/jobs and registry identity. No reduced-scope development dispatch or existing-version no-op substitutes. Final acceptance and canonical-spec review precede archive preparation; coordinate #402 and earlier obligations individually instead of auto-completing them.

## Risks / Trade-offs

- [A fixture hook intercepts too broadly] → Match the importing clipboard boundary and known operations; test unexpected-operation failure and retain unrelated-process/real-descendant controls.
- [Native module replacement appears to work while Linux escapes] → Assert actual backend observations on native Linux and exercise emitted JS without a TypeScript loader.
- [Seven-versus-eight is not secondary contamination] → Require controlled reproduction and verified teardown; leave capacity unchanged and stop for refinement if the evidence contradicts this diagnosis.
- [Another clipboard owner is faulty] → Keep Windows shell findings separate and block recovery; do not repair production behavior through test exceptions.
- [Canonicalization weakens a directory oracle] → Keep independently resolved expected identity and distinct-directory rejection, not string surgery.
- [Current develop or nightly package advances] → Bind evidence to exact source and bytes and verify inclusion of all repairs, not a remembered version.

## Migration Plan

No application or data migration. Implement only after approval in this same new PR; #402 remains merged history. Rollback reverts only the new test/fixture corrections and retains failed-run evidence. Archive this follow-up and reconcile older streams only after real recovery evidence and maintainer acceptance; cleanup follows verified archive integration, not creation.
