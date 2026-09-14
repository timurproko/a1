## Context

See `proposal.md` for motivation and the delta specs for required behavior. Release materialization currently discovers A1 distribution roots and recursively copies the complete installed dependency closure into a unique content-addressed release directory. The measured current payload is 13,557 files and 93.1 MiB; 8,400 files are declarations, TypeScript or MTS sources, source maps, Markdown, or SCSS. Between observed releases `.182` and `.218`, 13,343 paths and 90.2 MiB were byte-identical.

The launch fast path correctly avoids rematerialization, but the new release path makes the owned composition and broad Pi public root graph cold to filesystem and antivirus caches. A measured composition import fell from 17.8 seconds on a cold retained path to 1.47 seconds on the immediate second import. Immutable execution, old-session continuity, rollback, public Pi API governance, native dependencies, dynamic extension loading, and one Pi TUI module identity cannot be weakened for speed.

Manual acceptance of `0.1.8-dev.226` exposed a distinct retained-release path that the original implementation and gate missed. The mutable CLI started at `08:36:41.452`, while the replacement supervisor did not start until `08:37:07.831`: 26.38 seconds elapsed before UI process creation. The active release was already approved, layered, warmed, and compile-cached, but loss of the live supervisor selected complete release and layer verification. That path read and hashed 443 product files (7.04 MiB) and 5,846 dependency files (41.0 MiB) while Windows real-time antivirus protection was enabled. The exact-package performance fixture started a supervisor before labeling its next launch `post-update`, so it exercised the live-authority fast path rather than the no-live-supervisor path.

Post-merge development publication run `34022380161` exposed a second acceptance gap on Windows Node 22. Package surface and all seven packaged session-resume cases passed, but `package-install.integration.test.ts` rejected the warm `a1 pi` launch at 3,453 ms against the 3,000 ms budget. Structured evidence attributes 1,744 ms to `ui-modules-loaded`, 1,100 ms to `ui-entry`, and 147 ms to `guardian-connected`. Windows Node 24 passed the same candidate, so the correction must preserve the budget and optimize or remove Node 22-sensitive work rather than normalize the failure through retries.

This design depends on the accepted bounded-retention behavior from `bound-immutable-release-retention` for final layer collection. It can develop manifests, layering, and measurements independently, but must not enable shared-layer deletion before that protection model is integrated.

## Goals / Non-Goals

**Goals:**

- Keep unchanged dependency modules at a stable certified path across updates.
- Reduce copied and scanned files using evidence-backed runtime payload selection.
- Bound post-update, no-live-supervisor, and warm interactive startup on the accepted Windows runner.
- Preserve restart-valid certification authority without payload-wide reads while continuing to reject uncertain or changed immutable content before execution.
- Preserve exact release/layer identity, rollback, public Pi APIs, extension behavior, and native assets.
- Make startup costs attributable by phase and keep diagnostics opt-in.

**Non-Goals:**

- Import private Pi distribution subpaths for performance.
- Treat hard links to mutable npm content as immutable.
- Remove old full-copy releases while they are live or selected for rollback.
- Promise identical cold-cache timings on unbounded third-party machines; normative budgets apply to the accepted release runner.
- Gain speed by trusting an ordinary writable marker, skipping integrity validation, moving validation behind selected code execution, or recommending antivirus exclusions.
- Make project extensions execute during updater warmup.

## Decisions

### 1. Establish phase evidence before changing storage

A shared monotonic startup trace will carry timestamps through the mutable CLI, bootstrap, guardian, UI entry, owned composition, Pi service/resource initialization, session construction, and first input-ready render. It will be silent by default and emit structured evidence only in isolated diagnostic runs. Exact release ID, dependency-layer IDs, profile ID, Node version, file/read counters, and phase durations are included; credentials, prompts, messages, and environment values are excluded.

The accepted Windows gate measures both profiles after an exact update and on a subsequent warm launch. The budgets are 5 seconds post-update and 3 seconds warm from command invocation to input-ready paint.

Alternative: optimize from total elapsed time alone. Rejected because it cannot distinguish antivirus/module loading from model, resource, guardian, or rendering regressions.

### 2. Separate product releases from immutable dependency layers

The managed layout becomes conceptually:

```text
data/
  dependency-layers/<layer-id>/
    node_modules/...
    layer-manifest.json
  releases/<release-id>/
    bin/...
    dist/...
    package.json
    dependency binding -> dependency-layers/<layer-id>
    release-manifest.json
```

A layer identity is computed from the selected dependency runtime paths, bytes, executable metadata, and package topology. A release identity binds its product-file identity plus ordered layer identities. Materialization may create a platform-managed directory binding only after both sides are within A1-owned immutable storage; certification resolves and validates that binding rather than accepting arbitrary links.

On Windows, implementation will evaluate a junction created entirely inside the managed store; on Unix, an equivalent managed symlink or resolver-approved binding may be used. If a platform cannot safely provide a filesystem binding, A1 will use an explicit launch-time module-resolution mechanism proven to work for ESM rather than copy mutable dependencies.

Alternative: hard-link every unchanged file into each release. Rejected because mutation has a cross-release blast radius and each new path still triggers path-based scanning.

Alternative: keep resolving dependencies from global npm. Rejected because npm replacement would break old live cohorts and violate immutable execution.

### 3. Certify layers independently and reuse only exact identities

Fresh layer materialization remains one source-read/candidate-write pass and atomically commits a manifest. An existing layer can be reused only when trusted certification binds its manifest and complete content identity. Release certification binds layer IDs and managed canonical targets. Activation validates manifests and bindings before starting persistent processes; a live process never switches layers.

The cohort state records enough layout metadata to launch old full-copy and new layered releases. Layer references are derived from all retained release manifests plus verified live endpoints. Final layer deletion delegates to bounded retention GC.

Alternative: identify a layer only by dependency version strings. Rejected because package versions do not prove installed bytes, optional/native layout, or package-manager topology.

### 4. Generate a conservative runtime payload manifest

Publication produces a deterministic runtime inventory for A1 product files and dependency packages. It starts from supported command entries, package export targets and manifests, then closes over static imports and declared dynamic imports. Package-specific declarations add native binaries, WebAssembly, themes, templates, provider catalogs, export assets, and required licenses. Unknown dynamic access keeps the containing published package files until exact-package evidence supports a narrower rule.

The immutable materializer consumes this signed-in-package inventory and verifies that selected files match it. Source declarations, source maps, examples, tests, and documentation are excluded only when not reachable or declared. Exact-package tests exercise every command/profile and representative optional paths.

Alternative: blanket extension filtering. Rejected because file suffix does not prove runtime irrelevance.

Alternative: continue copying every published dependency file. Rejected because it preserves the measured update and cold-scan cost without a runtime requirement.

### 5. Reduce eager Pi evaluation only through supported boundaries

The implementation will inventory which public Pi exports the owned startup path actually uses and compare the evaluated module graph. If the pinned Pi package provides suitable documented subpath exports, A1 adopts them behind its adapter compatibility gates. Otherwise A1 may generate an owned build-time facade from public exports only when bundling/tree-shaking evidence preserves licenses, extension singleton behavior, provider registration, and the external `#pi-tui` identity. Private runtime deep imports are not an option.

If neither path safely reduces the graph, stable dependency paths, payload minimization, compile cache, and warmup ship without this optimization; the compatibility boundary takes precedence over an additional timing gain.

### 6. Add a content-scoped persistent compile cache

Launch enables Node's supported persistent compile cache before loading the heavy immutable graph. Cache storage lives under an A1-owned cache root, not inside immutable content or user profiles. Namespace includes Node ABI/version and release/layer identities; stale or malformed cache entries are ignored and can be collected with their final content reference. Failure to create or use the cache is non-fatal.

Alternative: rely only on process-local module caching. Rejected because every interactive launch starts a new UI process.

### 7. Warm common startup modules during update only when required

After activation and before success, a dedicated immutable warmup entry imports and validates the common owned composition graph. It receives no terminal, session path, project trust callback, or network permission; profile and project executable resource loading are disabled. It is separately contained, bounded, and represented in update progress. Import or identity failure is treated as candidate startup failure and uses existing rollback handling.

Evidence may remove warmup once cold-path improvements satisfy the 5-second next-launch budget without it. Warmup moves unavoidable scanning into the visible update and is therefore a mitigation, not the primary architecture. It does not establish restart performance because volatile filesystem and antivirus caches, plus live supervisor authority, can disappear after update completion.

Alternative: start and immediately close a hidden interactive session. Rejected because it can mutate profile/session state, execute extensions, or prompt for trust.

### 8. Make certification durable across supervisor loss

Successful complete certification will commit a restart seal that binds the release record, release and ordered layer content identities, canonical managed roots and dependency bindings, and platform evidence that the sealed roots remain immutable. The seal is useful only when the current launch can validate it with work bounded independently of payload file count and bytes. A missing supervisor does not invalidate a sound seal; a changed path, binding, identity, immutability control, unsupported platform proof, or incomplete transaction does.

The implementation will first qualify platform-backed immutable-root evidence on Windows and Unix. A qualifying mechanism must prevent ordinary payload mutation without changing evidence checked by launch and must detect loss or replacement of that protection. If a platform cannot provide such proof, it must use a safe bounded representation such as a sealed startup payload or retain complete verification; an ordinary certification file beside writable content is insufficient. Complete verification remains the recovery path and creates a new seal only after every byte and binding passes.

Alternative: replace the dead-supervisor branch's complete verifier with the existing metadata-only certified-manifest reader. Rejected because that reader's current precondition is authority from the same parent process or an authenticated live supervisor, neither of which exists after restart.

Alternative: start the UI and verify the tree in the background. Rejected because selected code could execute before tamper detection.

Alternative: register a logon warmup or antivirus exclusion. Rejected as the primary design because it shifts cost into login or weakens host protection without fixing launch authority.

### 9. Gate the actual no-live-supervisor topology

Exact-package startup validation will distinguish three topologies: post-update with the updater-started supervisor, approved active release with no supervisor, and subsequent live-supervisor launch. The no-live-supervisor fixture must stop and verify exit of the supervisor while retaining release state and durable evidence, then launch each profile from that state. In addition to elapsed budgets, operation evidence must prove the accepted restart fast path does not scale reads or hashes with payload file count. Fault fixtures invalidate each seal input and require safe fallback or failure before selected code execution.

Startup tracing adds separate durable-validation and replacement-supervisor phases so a bootstrap gap cannot be hidden inside a broad `bootstrap-selected` interval again.

Alternative: infer restart coverage from a newly addressed post-update path. Rejected because update intentionally starts a supervisor, making its authority and cache topology different from restart.

### 10. Require first-attempt Node 22 margin, not a retry-shaped pass

The corrective implementation will reproduce the exact candidate under Defender-enabled Node 22, compare per-phase and module-evaluation evidence with the passing Node 24 lane, and reduce measured work in the dominant `ui-modules-loaded` and `ui-entry` phases. Candidate optimizations must preserve public Pi boundaries, extension behavior, compile-cache identity, and first-frame semantics. Focused repeated diagnostics may establish margin during development, but the release gate executes each scenario once and a failed first attempt remains a failure.

Raising the 3-second budget is rejected because the accepted requirement already defines warm responsiveness and the miss has phase-attributed work to optimize. Automatic retry is rejected because it would warm filesystem, antivirus, and compile caches and report a different topology from the failed user-facing launch. Treating Node 22 as optional is rejected because it remains a supported release lane.

## Risks / Trade-offs

- **[Risk] Shared-layer mutation affects several releases.** → Make layers private, atomically committed and read-only; bind complete identities; verify before activation; never link to mutable npm files.
- **[Risk] Managed junctions or symlinks create an escape path.** → Permit only generated bindings whose canonical target is a direct certified layer under the same managed store and reject all other links.
- **[Risk] Runtime inventory omits a dynamic asset.** → Begin conservatively, require declarations for dynamic reads, and gate every exact package across commands, profiles, providers, extensions, native features, themes, and exports.
- **[Risk] Bundling public Pi exports changes singleton or extension behavior.** → Prefer documented narrow exports; externalize the terminal module; require compatibility and extension conformance; omit bundling if proof fails.
- **[Risk] Warmup increases update duration.** → Show it as progress, bound it, measure its benefit, and remove it when cold launch meets budget directly.
- **[Risk] Compile cache grows or becomes incompatible.** → Scope it by immutable identity and Node ABI, bound retention, and fall back without changing behavior.
- **[Risk] A durable seal becomes a writable trust token.** → Accept only platform-backed immutable-root evidence bound to canonical identities; reject metadata-only markers and fall back before execution.
- **[Risk] Platform mutation evidence is unavailable, reset, wrapped, or ambiguous.** → Treat uncertainty as fast-path rejection and use a qualified bounded representation or complete verification.
- **[Risk] A warm fixture passes while restart remains slow.** → Stop the supervisor explicitly, assert topology and payload-read counts, and retain a Defender-enabled Windows acceptance run.
- **[Risk] Existing rollback code cannot understand layered records.** → Preserve full-copy record support and only activate the new layout with a bootstrap capable of validating both forms.
- **[Risk] A locally repeated warm run hides the first-attempt Node 22 cost.** → Reset the exact-package fixture and owned caches for each diagnostic sample, retain per-phase evidence, and require the publication lane's single attempt to pass without retry.
- **[Risk] Reducing eager UI work changes the first usable frame.** → Preserve the input-ready definition and rendering/extension compatibility gates; defer only work proven unnecessary before that frame.

## Migration Plan

1. Add startup phase tracing and exact-package Windows baselines without changing launch behavior.
2. Generate and validate a conservative runtime inventory while continuing to materialize the old full copy; compare omitted paths and exercise all package routes.
3. Implement independently certified dependency layers and dual-layout manifest reading behind a feature gate; keep full-copy rollback.
4. Integrate bounded layer references with the accepted release-retention collector.
5. Enable layer reuse for unchanged dependencies, then persistent compile cache, and collect performance evidence.
6. Add the side-effect-free warmup only if the next-launch budget still requires it.
7. Evaluate narrow public Pi exports or a proven build-time facade as a separate measured optimization within the same compatibility gates.
8. Remove the old-layout writer only after exact packaged update, live-cohort, rollback, extension, native-asset, and Windows startup acceptance; retain old-layout reading until no supported rollback can require it.
9. Reproduce and trace the approved-release/no-live-supervisor path, record payload-wide verification operations, and keep the original implementation unaccepted until the correction passes.
10. Qualify durable immutable-root evidence on supported platforms and implement restart seals with complete-verification fallback behind compatibility tests.
11. Change retained-release bootstrap to use the restart seal only when every bound identity, path, dependency binding, transaction state, and immutability proof agrees; otherwise verify completely before execution.
12. Gate both profiles with the supervisor explicitly stopped, payload-read assertions, tamper faults, and Defender-enabled Windows timing before repeating manual restart acceptance.
13. Reproduce run `34022380161`'s Node 22 warm `a1 pi` path from a reset exact-package fixture, compare Node 22/24 phase and module evidence, and identify the deterministic work responsible for the missing margin.
14. Optimize the dominant warm-path work without changing the 3-second budget, first-input-ready semantics, public Pi API boundary, compile-cache identity, or retry policy.
15. Require current-head CI and one fresh post-merge development publication to pass the Windows Node 22 warm gate on its first attempt; coordinate final publication only after the separate macOS blocker is corrected.
