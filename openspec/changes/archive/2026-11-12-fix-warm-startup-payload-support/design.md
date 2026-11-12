## Context

The source brief is `C:/Users/tprokopiev/AppData/Local/herdr-core/default/files/t61/a1-startup-color-warm-restart-fix.md`. It reports installed `0.2.7-dev.1291` advertising `{"version":1,"launchColor":true,"terminalIdentity":true}` but rejecting `--session-color` after selecting its compatible retained UI. Installed/runtime state was not inspected or modified during this planning pass.

Planning starts from refreshed `origin/develop` at `28161cb5d561c2a230fc24f405281bc0856805b6`. `a1 worktree enter fix/warm-startup-payload-support` successfully created and attached `D:/Git/a1/.worktrees/warm-startup-payload-support`. The initial commit and draft PR #919 were planning-only. The maintainer subsequently approved the presented plan and requested implementation in the same attached worktree/branch/PR; integration authority remains separate. This is a focused delivery, not a continuation or rewrite of the earlier session-color PR.

The supplied external path `C:/Users/tprokopiev/.config/herdr-app/customizations/docs/A1-COLOR-CONTRACT.md` is absent locally. The brief, canonical launch/session-color specifications, `docs/features/session-colors.md`, and the maintained Herdr consumer fixture remain available. No consumer deployment or live Windows/Unix/SSH behavior is claimed from source inspection.

### Confirmed source seams

- `bootstrap.ts` sends every ultimately selected release through `launchSelected`, whose synchronous `assertStartupPayloadSupport` checks for `dist/features/launch/interactive-arguments.js` in `release.files` when `sessionColor` or `promptArguments` is present.
- `readRestartCertifiedRelease` authenticates an approved record, immutable certification, seal digest/platform policy, selected release identity, managed roots, manifest path evidence, executable entries, and dependency evidence. It intentionally returns `files: seal.launchEntries`.
- Restart seal version 1 requires only `bin/ui.js`. The optional parser file is not a minimal executable-entry requirement.
- Full materialization and complete manifest reads provide the parser inventory. `readCertifiedReleaseManifest` requires previously established certification/process authority; it validates manifest structure and content/contract digest, matches release ID/content digest/version, checks selected-store containment and directory identity, and validates certified dependencies/binding. It is not an arbitrary file-existence probe or an independent source of certification authority.
- Bootstrap already uses that reader for update-prior selection, newer-active selection, activation races, and retained fallback. Its admitted selected object can provide the exact identity record for a conditional metadata read.
- `startup-arguments.test.ts` currently mocks restart recovery with the same full-shaped object as cold materialization. Its warm parameter therefore does not characterize the compact projection. `restart-certification.test.ts` has real filesystem fixtures and deterministic operation-count coverage; `update-launch.test.ts` covers selection and bounded reselection.
- Ordinary bootstrap already has its presence-check and recovery policy. This repair must preserve that baseline rather than claim to eliminate its existing inventory work; the bounded restart validator itself must remain independent of payload size.

## Goals / Non-Goals

**Goals**

1. A compatible selected release accepts color and literal startup payloads on cold, warm, and repeated warm launches.
2. Compatibility comes from complete authenticated evidence for that release, never from missing entries in an abbreviated projection or a different installed/active candidate.
3. Unsupported or unverifiable selections fail closed before spawning their UI with the payload.
4. Existing seals, dependency authority, identity checks, no-payload operation boundaries, first-frame color, and live-session isolation remain unchanged.

**Non-goals**

- New public capabilities, color names, settings/replacement policy, Core labels, release migration, or a release/update/rollback redesign.
- Herdr consumer edits, native/Core/renderer changes, manual certification repair, forced recertification, retained-release deletion, or direct `bin/ui.js` launching.
- Dropping color/prompts, retrying without overrides, weakening compatibility checks, full payload rehash/recursive scan for feature discovery, or per-frame capability work.
- Existing-agent control, remote setup changes, desktop automation, publication, or merge authority.

## Decisions

### 1. Make selected-release compatibility resolution asynchronous and payload-only

Keep the compatibility gate at the common `launchSelected` boundary and await it before `launchUi`. Return immediately when neither `sessionColor` nor `promptArguments` is supplied. Preserve existing argument-presence semantics, including an explicit empty prompt-argument array; do not redesign launch grammar.

For an already authenticated complete selected release carrying the parser entry, retain the successful inventory check. If the selected evidence lacks that entry, absence alone is inconclusive because the object may be the compact restart projection. Load the full manifest through `readCertifiedReleaseManifest` using the selected object's release root, release ID, content digest, package version, and the current managed release-store root, then inspect that authenticated complete inventory. A genuine old full inventory may incur the same conditional metadata read before rejection; this is restricted to explicit startup payloads.

Reuse the existing reader's trust precondition: the selected object reached this boundary only through verified materialization, approved certified selection, or successful restart validation. Do not treat the installed npm package version as proof, bypass approval, or use a raw filesystem existence check. Evidence-loading failure must propagate as a startup failure, not a successful launch without the requested payload.

Avoid new public exports or a new feature owner unless a real production consumer needs them. Release foundation owns compatibility evidence and may use the existing parser-path marker without importing product feature implementation or palette policy.

### 2. Bind compatibility evidence to the exact selected identity

The conditional reader must match selected release ID, version, content digest, canonical managed root, directory identity, manifest digest, and dependency evidence under existing checks. No active-state lookup that substitutes a different release and no installed-package capability borrowing is allowed.

Each `launchSelected` invocation resolves its own support. Bounded reselection re-enters bootstrap and resolves the new selected release independently; a previous successful guard cannot authorize a successor. Update-prior selection, installation-read fallback, newer-active selection, and activation races continue through the same gate. Preserve the current selection/retry/error policy rather than adding a new recovery route.

Changed restart authority may still use the existing complete-verification/repair fallback when exact approved bytes can be established. Failed or mismatched evidence must never become approval for unverified content. Tests must distinguish legitimate existing recovery from an unsafe compatibility bypass.

### 3. Preserve seal compatibility and the ordinary fast path

Do not change `REQUIRED_LAUNCH_ENTRIES`, restart seal version, digest schema, or the compact projection to add an optional feature file. Existing seals remain readable without forced recertification.

The support-only full-manifest read is conditional on an explicit invocation payload and inability to establish support from selected inventory. It must not trigger full payload/dependency rehash, recursive discovery, installed-package scanning, or frame-level work. No-payload launches add zero capability-resolution manifest reads and retain the existing restart operation counts and fallback boundaries.

### 4. Keep the public launch contract unchanged

The child receives the same literal argument array after validation. Color is invocation-only and is applied by the existing early/trust/settings/composition path before first visible presentation, without a saved-Default flash or settings write. Literal color-looking prompt tokens remain data after `--` and are submitted under the existing successful-startup/first-presentation contract.

`a1 session color capabilities` remains exactly version 1 with the existing booleans and clean output. Live get/set acknowledgements, peer sessions, successful/failed replacement policy, native terminal labels, and comparison mode are unaffected. Retain the unsupported-release diagnostic unless the actual repair needs a focused distinction for unverifiable evidence; document only maintained behavior, not a consumer workaround.

## Validation Strategy

Deliver outcomes in PR order: write each group's code/tests, tick its detailed tasks, commit/push, and tick the matching PR item before beginning the next. Planning writes no product code or tests and requires strict OpenSpec validation only. Implementation local checks remain typecheck, explicitly selected test files, and strict OpenSpec validation; no preflight or broad directory/tier suites.

| Boundary | Planned deterministic coverage |
| --- | --- |
| Real release startup | Disposable package/release/data/runtime roots, real materialization and certification, intercepted or harmless fixture child spawn; verify complete cold inventory, actual compact warm `files` containing only `bin/ui.js`, and at least two warm launches after certification for color-only, literal-only, and combined payloads. |
| Evidence and identity | Genuinely old release lacking the parser rejects color and literal payloads before spawn but remains ordinarily launchable; changed/mismatched manifest ID/version/content digest/root, certification/platform/binding failures, and another supported release or installed candidate cannot authorize an unsupported selection. Reuse release-store and restart fixtures rather than duplicate their full security matrices. |
| Selection and concurrency | Update-prior selection, retained fallback when installed materialization fails, newer-active selection, activation race, and bounded reselection; exercise support changes between different releases and assert the payload is forwarded only to supported selected children. |
| Operation boundaries | Existing restart event counts stay equal for small/large payloads; no-payload bootstrap adds zero support-only full-manifest reads; support discovery is metadata-only and never calls full verification/recursive discovery solely for capability resolution. Use spies/events instead of wall-clock-only thresholds. |
| Existing public/color behavior | Focused `test/cli/session-color.test.ts`, `test/features/owned-ui/project-trust-prompt.test.ts`, `test/composition/startup-color.test.ts`, and `test/composition/session-colors.integration.test.ts` preserve exact discovery, first emitted trust/editor color, literal submission, no persistence, acknowledged live changes, peer isolation, replacement policy, and comparison separation. Adjust the exact selected files to the touched boundaries without running directory-wide suites. |

Delivered release test homes include `test/foundation/release/startup-arguments.integration.test.ts`, `restart-certification.test.ts`, `release-store.test.ts`, and `update-launch.test.ts`. The former mock-only `startup-arguments.test.ts` was replaced by the real package/release/certification integration fixture, retaining literal argv assertions and unsupported ordinary-launch compatibility. Only terminal child creation is intercepted in that fixture; its package materialization, approval, full manifest reader, and restart authority are real.

### Optional disposable smoke boundary

Actual physical Windows, supported Unix, and Core-only SSH smoke require separate explicit authorization and disposable infrastructure. Once authorized, build/package the source candidate through maintained tooling, launch the compatible selected release at least twice with a nondefault color, and confirm first-frame behavior. The Core-only SSH case must use the same public configured-executable launch contract without remote Herdr App/companion configuration.

Do not stop, replace, resume, type into, or repurpose anyone's existing agents. Fixtures and deterministic composition checks do not certify a physical terminal or remote deployment. Manual smoke is not a task checkbox or a readiness prerequisite; record its unperformed/authorized result truthfully in implementation disposition.

## Risks / Trade-offs

- The certified manifest reader relies on established caller authority. Moving the guard before release admission or substituting a fabricated record would violate that precondition; retain the common admitted-selection boundary.
- A payload-specific full manifest read is extra metadata work on warm launches with overrides. This is smaller and backward-compatible compared with capability schema migration; preserve the no-payload boundary and avoid payload rehashing.
- Mock-heavy startup tests currently hide the bug. At least one regression must use the real certified filesystem release and restart projection.
- Release reselection may change support after an earlier guard succeeded. Avoid support caches/global booleans and assert each selected identity independently.
- Existing fallback catches may retain their historical diagnostics. This bug-fix does not redesign unrelated fallback error reporting, but must never hide a rejected payload behind a successful no-payload launch.

## Implementation Disposition / Known Gaps

- Delivered the payload-only asynchronous compatibility gate in the common admitted-selection boundary. Full inventory support remains immediate; an inconclusive compact projection loads the exact selected release's authenticated full manifest through the existing reader. No new exports, dependencies, capability schema, or release/certification migration were needed.
- Real disposable fixtures reproduced the original color-only, literal-only, and combined failures at the first warm launch before the fix. They now cover cold plus two repeated compact warm launches, exact identity passed to the full reader, literal argument order, explicit empty boundary semantics, and unsupported cold/warm pre-spawn rejection with preserved ordinary launching.
- Resolved selected-evidence failure coverage with real missing/malformed/different-identity manifest failures after compact admission, a supported installed candidate unable to authorize a newer unsupported retained release, and the existing manifest/restart identity, digest, root, platform, immutability, and dependency matrices.
- Selection fixtures independently guard color and literal prompts for update-prior selection, installed-tree failure fallback, newer-active selection, activation races, and support changes during bounded reselection. Existing fallback error handling can report the original installed-tree failure after a retained payload rejection; it still fails closed, does not spawn the unsupported UI, and never drops/retries without the payload. Unrelated diagnostic policy is intentionally unchanged.
- Deterministic no-payload fixtures compare two warm launches over small and 100-extra-file releases: zero support-only full-manifest, materialization, complete verification, or repair calls; equal compact restart evidence operation counts; no extra payload-file evidence reads. Payload support lookup likewise does not call complete verification or repair solely for capability discovery. Existing presence-check work is unchanged, not claimed to be eliminated.
- Focused Windows checks cover exact version-1 discovery, first trust/editor invocation color despite a different Default, unchanged saved settings bytes after startup/live edits/replacements, acknowledged live control, peer isolation, replacement policy, and comparison separation. Detailed commands and outcomes are recorded in `implementation-evidence.md`; broad regression and required exact-head validation belong to trusted CI.
- The external customization contract file remains unavailable. The supplied contract and maintained repository specifications suffice for this producer-only repair; no consumer edits are required. Installed release and Herdr deployment claims remain supplied observations, not independently verified runtime evidence.
- Deferred optional physical Windows/Unix/Core-only SSH smoke: no such authorization or disposable remote infrastructure was supplied. Windows filesystem/composition fixtures are not physical terminal certification, and this Windows run does not claim native Unix or live SSH execution. No installed release payload, manual seal, existing agent, remote App, or companion configuration was modified.

## Rollout / Rollback

Implementation followed explicit approval in the same draft PR/worktree/branch. Leave published release bytes and existing agents untouched; normal validated delivery/publication provides the repair. No certification migration or consumer workaround is needed.

Rollback is an ordinary source revert/corrective delivery, never state deletion, manual seal rewriting, or silent omission of invocation payloads. Trusted automation owns readiness/finalization, and maintainer integration remains separate exact-candidate authority.
