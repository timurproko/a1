## Context

See `proposal.md` for motivation and the delta specs for required behavior. The accepted release-layer work reduced the old 13,557-file, 93.1 MiB payload and removed payload-wide verification from restart. The current installed layout demonstrates that those mechanisms work: consecutive product releases contain roughly 475 files each and share one certified dependency layer of roughly 5,847 files and 43 MiB.

The remaining exact-package Windows floor is approximately 2.0–2.6 seconds. Detailed Node 22 evidence attributes about 1.7 seconds to the UI import region, while durable restart validation takes about 15 ms and replacement-supervisor startup about 230 ms. A static inventory of the current entry graph reaches roughly 142 A1 JavaScript modules and 177 relative modules beneath Pi's package-root entry before external dependencies are counted. These counts are directional rather than acceptance evidence; the implementation must produce an exact runtime census.

The broad graph remains because direct imports in `bin/ui.js` lead into composition and session modules that import runtime barrel files, and because the pinned Pi package exposes required capabilities primarily through a package root that re-exports its CLI, modes, components, tools, and utilities. Node's compile cache avoids part of parsing and compilation but does not preserve an evaluated module graph across UI processes. Update warmup primes the exact immutable paths and host caches but exits before the user's UI process starts.

This change depends on the accepted immutable layers, restart seals, compile-cache namespaces, and side-effect-free warmup from `reduce-post-update-cold-start`. It does not weaken those controls or assume that old-release deletion improves the active import graph.

## Goals / Non-Goals

**Goals:**

- Reduce modules, file opens, evaluated bytes, and wall time before the first genuinely input-ready frame.
- Keep startup-graph changes measurable and attributable on exact packaged bytes.
- Preserve Pi public API governance, provider and extension behavior, one terminal module identity, immutable execution, and process containment.
- Make optional capabilities available on demand without paying their implementation cost during every launch.
- Ensure update warmup and compile-cache preparation cover the artifact actually launched.

**Non-Goals:**

- Remove retained rollback releases or weaken retention to improve launch time.
- Import private Pi distribution paths, patch installed dependencies, or derive runtime authority from dependency layout.
- Mark the editor ready before settings, model scope, resources, tools, extensions, session state, and terminal semantics needed by the first prompt are valid.
- Hide a slow first attempt with retries, a larger budget, antivirus exclusions, or background verification after selected code executes.
- Redesign the supervisor/guardian ownership model unless module-graph reduction proves that process topology is the remaining dominant cost.

## Decisions

### 1. Measure the exact evaluated startup graph before optimizing it

Extend startup evidence with an exact module census grouped into A1-owned modules, Pi public entries, other dependencies, and generated artifacts. Evidence records normalized package-relative identities, file counts, source bytes, and phase durations; it does not record user paths, environment values, prompts, credentials, or session content. A build-time reachability report complements runtime evidence and identifies the import edge that first makes each module reachable.

The baseline will cover post-update, no-live-supervisor, and warm launches for both profiles on supported Windows Node lanes. A graph-budget failure is independent from elapsed time so a fast runner cannot conceal renewed eager coupling.

Alternative: continue using only coarse phases. Rejected because the current `ui-entry` and `ui-modules-loaded` interval identifies the region but not the import responsible for it.

### 2. Keep runtime entry points free of broad A1 barrels

Production modules reachable before first input-ready render will import executable values from leaf modules. Type-only imports may continue to use contract barrels because they are erased from emitted JavaScript. A deterministic architecture rule will reject runtime barrel imports from the declared startup roots and print the shortest introducing path.

The first conversion covers CLI dispatch, launch preparation, release bootstrap, guardian startup, owned composition, session shell, settings composition, Pi integration, and terminal composition. Public barrels remain available to tests and non-startup consumers where they do not enter the eager graph.

Alternative: rely on bundler tree shaking while retaining broad source imports. Rejected as the first step because runtime ESM remains the development and fallback shape, and undeclared module side effects make implicit elimination unsafe.

### 3. Prefer documented narrow Pi exports, with a certified owned artifact as fallback

The preferred solution is a pinned Pi version that documents narrow runtime, session, settings, component, and theme exports. Every Pi import reachable from startup must move together: one remaining package-root value import keeps the broad root graph alive. Candidate subpaths pass the existing API, source-provenance, component, provider, extension, and terminal-identity compatibility suites.

If a compatible Pi package cannot expose all required narrow entries, A1 may generate one startup artifact from documented public exports. The build treats Node built-ins, native and optional runtime packages, dynamic extension loading, and `#pi-tui` as explicit externals where bundling would change identity or discovery. Tree-shaken modules are removed only after a side-effect inventory proves their initialization unnecessary. The generated artifact carries source inputs, dependency identity, licenses, and a deterministic digest in package evidence.

Private Pi `dist` subpaths are not a fallback. If neither narrow exports nor a generated artifact passes every compatibility gate, implementation stops rather than trading correctness for speed.

Alternative: copy selected private Pi modules into A1. Rejected because it creates an unsupported fork of engine behavior and breaks the public API boundary.

### 4. Split essential readiness from optional feature implementation

The startup graph retains everything required to accept a prompt correctly: selected settings, trusted project decision, model scope, session state, resource and extension registration, tools, terminal input/output, and the initial owned surface. Feature implementations not required for that invariant move behind typed asynchronous boundaries and load on first invocation or after the first frame.

Initial candidates are settings presentation, session/tree selectors, login and model dialogs, package-update presentation, export workflows, rich Markdown/Mermaid and image helpers, and clipboard image support. Each candidate receives a focused test proving that the triggering interaction is retained while loading and that failure produces the existing bounded diagnostic. Classification is evidence-driven; a candidate remains eager when deferral would change extension registration, first-prompt behavior, terminal identity, or visible startup state.

Git branch discovery and other informational enrichment may run after the first frame and update the view when complete, provided no command or prompt semantics depend on the result.

Alternative: render an immediately editable shell while engine initialization continues. Rejected because that would redefine input-ready and could accept a prompt before its resources or tools exist.

### 5. Warm exactly what the next UI process imports

Warmup and the interactive entry consume one generated startup descriptor containing the selected entry files, generated artifact identity when present, dependency-layer identities, and compile-cache namespace. Publication validates the descriptor against the runtime inventory. Update warmup loads that descriptor's eager graph but does not traverse deferred features.

A mismatch between warmup and launch fails candidate activation or uses existing rollback handling. Compile-cache failure remains non-fatal when the uncached launch still satisfies compatibility and performance requirements.

Alternative: retain a broader warmup to scan optional modules preemptively. Rejected because it hides startup-graph growth, lengthens update, and does not reduce top-level execution in the later UI process.

### 6. Optimize pre-UI process work only after the module graph is bounded

After the UI graph reaches its target, measurements may remove remaining avoidable work from the command, bootstrap, and guardian stages. Likely changes include direct imports for interactive dispatch, lazy loading of update/package/version commands, loading only the current platform's process inspector, and using existing certified immutable evidence for repeated native-artifact checks where that can fail closed.

The CLI, bootstrap, guardian, native containment helper, and supervisor remain separate unless evidence shows process creation dominates after graph reduction. Combining those responsibilities is not part of this change because it would alter immutable-code and process-ownership boundaries for a smaller expected gain.

Alternative: redesign process topology first. Rejected because current evidence attributes most delay to UI module loading rather than supervisor or guardian startup.

### 7. Gate first-attempt latency and graph size

Accepted Windows exact-package gates run each profile once for post-update, no-live-supervisor, and warm topologies on every supported Node lane with Defender enabled. Post-update and warm budgets are 2 seconds; no-live-supervisor is 2.5 seconds. A failed attempt is retained and never retried as a warmed replacement.

The implementation establishes module-count and evaluated-byte baselines from the optimized candidate. Future increases require an explicit reviewed baseline update naming the new eager capability and demonstrating that it is essential before input-ready render.

## Risks / Trade-offs

- **[Risk] A deferred module is required by the first prompt or an extension hook.** → Define readiness invariants first and exercise immediate submission plus extension/tool fixtures before accepting deferral.
- **[Risk] Narrow Pi exports omit initialization side effects.** → Add provider, model, resource, extension, and component compatibility tests against the exact pinned package.
- **[Risk] A generated artifact duplicates Pi TUI classes.** → Externalize `#pi-tui`, resolve its canonical target in exact-package tests, and reject more than one identity.
- **[Risk] Bundling changes dynamic extension or native-module resolution.** → Keep those boundaries external and validate representative installed extensions and native paths from packed bytes.
- **[Risk] Module instrumentation changes timing.** → Use instrumented runs for attribution and separate low-overhead single-attempt runs for normative latency.
- **[Risk] Module-count targets become brittle across necessary features.** → Store normalized grouped baselines and require an explicit reviewed update rather than a permanently fixed universal count.
- **[Risk] Parallel or deferred imports reorder visible startup behavior.** → Preserve deterministic first-frame state and test that triggering interactions are queued or completed exactly once.
- **[Risk] Tighter budgets are sensitive to runner contention.** → Keep the accepted dedicated Defender-enabled runner, record dominant phases, and optimize for first-attempt margin rather than retries or percentile substitution.

## Migration Plan

1. Add exact module-graph evidence and record the current package baseline without changing runtime behavior.
2. Replace A1 hot-path barrel imports with leaf imports and enforce the startup-root architecture boundary.
3. Measure the reduced A1 graph and remove or defer optional owned modules one capability at a time.
4. Qualify a Pi version with documented narrow exports; if unavailable, build and certify the public-export startup artifact behind the same package and compatibility gates.
5. Make warmup and runtime inventory consume the exact optimized startup descriptor and verify compile-cache identity.
6. Optimize measured CLI/bootstrap/guardian imports without changing process ownership.
7. Run exact-package Node 22 and Node 24 Windows gates with Defender, no retries, and the new latency and graph budgets.
8. Publish a development preview, complete manual post-update and restart acceptance, and retain the prior release as rollback authority until accepted.
