## 1. Exact Startup-Graph Evidence

- [ ] 1.1 Define normalized, redacted startup-module evidence for A1-owned modules, Pi public entries, other dependencies, and generated artifacts; verify deterministic tests cover module identity, source bytes, grouping, ordering, and exclusion of absolute user paths and environment/session content
- [ ] 1.2 Add a build-time startup reachability report that identifies each eager module's shortest introducing import edge; verify a synthetic broad barrel reports the expected path and totals
- [ ] 1.3 Capture exact-package pre-change module/file/evaluated-byte and phase baselines for post-update, no-live-supervisor, and warm `a1` and `a1 pi` launches on supported Windows Node lanes; verify every measurement identifies the exact package, release, layer, Node version, and first-attempt topology

## 2. Bound the A1-Owned Eager Graph

- [ ] 2.1 Declare the production roots that execute before first input-ready render and add an architecture rule prohibiting executable imports from broad A1 barrels in their reachable graph; verify the gate reports the shortest introducing edge while allowing erased type-only imports
- [ ] 2.2 Route interactive CLI startup through direct capability, dispatch, preparation, bootstrap, and module-identity entries while loading update, package, and version implementations only for their commands; verify CLI grammar, silent unknown-command behavior, version output, and update routing remain unchanged
- [ ] 2.3 Replace broad lifecycle, release, and process-containment imports on the bootstrap and guardian path with leaf or platform-selected imports; verify immutable selection, restart certification, endpoint ownership, native artifact verification, and all supported platform containment tests retain their behavior
- [ ] 2.4 Replace broad composition, settings, session-shell, component, engine, and terminal-runtime imports with leaf imports throughout the eager UI graph; verify the reachability report contains no prohibited A1 startup barrel and records lower module/file and byte totals
- [ ] 2.5 Record the A1-only graph reduction and compare phase evidence with the baseline before introducing Pi or lazy-loading changes; verify both profiles still reach an equivalent input-ready frame and immediate submission uses the selected runtime

## 3. Defer Optional Interactive Features

- [ ] 3.1 Classify every eager UI module as required for initial rendering, first-prompt correctness, or optional use, and encode the accepted classification in deterministic startup-graph policy; verify settings, model scope, session state, resources, tools, extensions, and terminal semantics remain mandatory readiness inputs
- [ ] 3.2 Move settings presentation, session/tree selectors, login/model dialogs, package presentation, and export workflows behind typed on-demand boundaries where classification permits; verify each first triggering interaction is retained and completes exactly once
- [ ] 3.3 Move rich Markdown/Mermaid, image, and clipboard implementations behind on-demand boundaries where initial content does not require them; verify initial content that does require one loads it before rendering and later content loads it without loss or duplicate output
- [ ] 3.4 Move informational enrichment such as Git branch discovery and package-update presentation after first paint where it does not affect prompt semantics; verify the initial frame is deterministic and the later view update is safe after disposal or rapid input
- [ ] 3.5 Add immediate-submit, extension tool, resource, model, settings, session-resume, terminal-input, and deferred-load failure coverage; verify first-input-ready is never emitted before every capability required by the first accepted prompt is valid

## 4. Narrow the Pi Startup Boundary

- [ ] 4.1 Inventory every value import from the Pi coding-agent package and terminal package reachable from the optimized startup roots, then evaluate an exact Pi candidate with documented narrow runtime, session, settings, component, and theme exports; verify the report proves whether all broad package-root imports can be removed
- [ ] 4.2 When suitable documented Pi subpaths are available, migrate every startup-reachable Pi value import together and update the exact pin; verify no package-root value import remains reachable and compile-time, API, provider, component, extension, resource, and terminal compatibility suites pass
- [ ] 4.3 If suitable narrow exports are unavailable or insufficient, generate an A1-owned startup artifact from documented public exports with Node built-ins, dynamic extension/native boundaries, and `#pi-tui` treated as required externals; verify deterministic output, side-effect inventory, source identity, licenses, and package inclusion, or record a deliberate skip if the narrow-export path already meets every graph and latency gate
- [ ] 4.4 Prove the selected narrow-export or generated-artifact path preserves provider registration, model resolution, settings, resources, extension hooks and UI, native features, and exactly one Pi TUI module identity; verify each injected incompatibility rejects the candidate before publication

## 5. Align Warmup, Compile Cache, and Runtime Inventory

- [ ] 5.1 Generate one startup descriptor binding the eager entries, generated artifact when present, dependency-layer identities, and compile-cache namespace; verify repeated generation from identical inputs is byte-for-byte stable and any changed input changes the descriptor identity
- [ ] 5.2 Make interactive launch and post-activation warmup consume the same startup descriptor; verify mismatched entry, artifact, dependency, or cache identity fails activation or follows existing safe rollback behavior
- [ ] 5.3 Restrict warmup to the declared eager graph while retaining terminal-free, session-free, trust-free, extension-free, profile-mutation-free, and network-free behavior; verify optional deferred modules are not loaded by warmup
- [ ] 5.4 Include the optimized entries and generated artifacts in the conservative runtime payload inventory and immutable certification; verify exact-package launch fails when a required startup artifact is omitted or changed

## 6. Performance Gates and Acceptance

- [ ] 6.1 Update the Windows exact-package gate to enforce 2-second post-update and warm budgets and a 2.5-second no-live-supervisor budget for both profiles on Node 22 and Node 24; verify each scenario executes once without retry and an injected delay fails with phase and module-group diagnostics
- [ ] 6.2 Establish reviewed optimized module-count and evaluated-byte baselines and fail unapproved growth independently of elapsed time; verify an injected optional import fails even on a timing pass
- [ ] 6.3 Run focused exact-package compatibility coverage for deferred interactions, Pi public boundaries, extension and provider registration, runtime payloads, compile-cache invalidation, update warmup, restart certification, guardian containment, and terminal identity; verify all selected suites pass in required CI
- [ ] 6.4 Run strict OpenSpec, typecheck, architecture, code-documentation, startup, package-install, rendering, and supported-platform validation in CI; push the implementation pull request with auto-merge disabled and verify current-head required checks pass
- [ ] 6.5 Publish one development preview from authoritative `develop` after merge and record first-attempt Windows Node 22/24 startup evidence, exact graph totals, package identity, and registry outcome; verify all six startup scenarios meet their budgets without retry
- [ ] 6.6 Provide exact post-update, restart-equivalent, immediate-submit, extension/native, and deferred-feature manual checks; record maintainer acceptance before marking the change complete or archiving it
