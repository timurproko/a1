## 1. Freeze the Boundary and Establish Failing Proofs

- [x] 1.1 Record the accepted dependency graph, production Pi import sites, package-layout reads, reflected concrete constructors, feature-to-adapter dependencies, source-derived UI units, and exact-oracle resolution in machine-readable baseline evidence; validate it with a focused repository-governance test.
- [x] 1.2 Add negative architecture fixtures proving that feature imports of Pi packages, concrete Pi adapters, Pi-named contracts, or Pi component factories fail with actionable paths; run the focused architecture-policy suite.
- [x] 1.3 Add negative production fixtures for dependency package-file reads, private path construction, reflected concrete Pi constructors, structural concrete-session substitutes, and ambient-`pi` oracle selection; run the focused boundary suite and preserve the expected failures before migration.
- [x] 1.4 Add one checked compatibility-authority reader derived from `package.json` and `package-lock.json`, remove production version constants that are not protocol identities, and pass exact-version/integrity drift tests.

## 2. Introduce Vendor-Neutral A1 Ports

- [x] 2.1 Define capability-scoped A1 engine/session lifecycle, command, event, snapshot, and explicit capability contracts without Pi package types or Pi-named public symbols; pass contract validation and serialization tests.
- [x] 2.2 Define separate A1 model/authentication, settings, resources/extensions, and workflow ports from product use cases rather than vendor class shapes; pass required-versus-optional capability tests.
- [x] 2.3 Define vendor-neutral presentation component, editor, selector/dialog, extension UI, terminal runtime, layout, overlay, and focus ports; pass malformed component and lifecycle contract tests.
- [x] 2.4 Extend project ownership and dependency governance so features and workspace modules may depend only on neutral ports while Pi implementations may depend inward on those ports; run architecture and project-structure policy suites.
- [x] 2.5 Provide owned test doubles for the neutral ports and migrate feature-level synthetic tests away from partial Pi session/service objects; run the affected owned-UI test suite.

## 3. Add the Composition Root and Invert Feature Dependencies

- [x] 3.1 Add one process composition root that selects, validates, and wires Pi engine, component, and TUI implementations to neutral ports without owning workflow behavior; pass construction, failure, and disposal tests.
- [x] 3.2 Change owned-UI startup to require injected neutral ports and remove direct creation or imports of concrete Pi adapters from the feature run path; pass startup, shutdown, and injected-fake tests.
- [x] 3.3 Refactor the session shell/root orchestration to neutral names and contracts while preserving command routing, input targeting, transcript state, focus, extension surfaces, and lifecycle behavior; run the complete owned-shell suite.
- [x] 3.4 Migrate customization registration and rendering to neutral component/presentation ports with no direct Pi component adapter dependency; run customization registry and prerequisite tests.
- [x] 3.5 Add reachability and import assertions proving workspace and feature trees contain no Pi package, concrete adapter, or Pi-named contract dependency; run architecture, typecheck, and repository-governance gates.

## 4. Harden the Pi Engine Integration by Capability

- [x] 4.1 Extract runtime creation, active-session replacement, rebind, disposal, and lifecycle adaptation into a Pi integration module using official exported runtime/session/service types; pass real isolated runtime and replacement tests.
- [x] 4.2 Extract documented session prompting, steer/follow-up queueing, abort, retry/compaction, bash, and ordered event conversion into typed integration modules; pass prompt, queue, settlement, malformed-event, and cancellation tests.
- [x] 4.3 Extract model selection, scoped models, catalog refresh, authentication login/logout, credential status, timeout, and cancellation behind the neutral model/auth ports; pass real API-shape and controlled provider fixture tests.
- [x] 4.4 Extract settings reads, writes, persistence flush, errors, and every A1-exposed setting behind the neutral settings port; pass setting coverage, invalid-value, persistence, and unavailable-capability tests.
- [x] 4.5 Extract resource discovery, commands, session metadata, extension binding/rebinding, reload, renderers, and extension failures behind neutral resource/extension ports; pass resource, session-switch, reload, and extension lifecycle tests.
- [x] 4.6 Extract built-in workflows into capability-specific controllers whose required operations are statically typed and fail with bounded diagnostics; pass every routed command and required-capability mutation test.
- [x] 4.7 Delete the broad permissive Pi `*Like` mirrors and repeated vendor property-name interpretation after all consumers migrate; run typecheck, engine integration, workflow, and malformed-result suites.

## 5. Harden Component and TUI Adaptation

- [ ] 5.1 Replace reflected `CustomEditor` construction with a compile-time-valid public constructor path or an attributed A1-owned editor implementation; pass editor, autocomplete, history, keybinding, IME/focus, and parity tests.
- [ ] 5.2 Replace the fabricated concrete session passed to `FooterComponent` with either a real session-contained adapter or an attributed A1-owned footer over neutral view data; pass usage, model, context, branch, status, width, and parity tests.
- [ ] 5.3 Audit every reused public Pi component constructor and callback, remove constructor type escapes and structural concrete-object substitutes, and expose only neutral component ports; run component conformance and selector/dialog suites.
- [ ] 5.4 Migrate the Pi TUI runtime implementation behind neutral terminal/layout/overlay contracts while preserving regular/fullscreen mode, scrolling, focus, restoration, and width ownership; run TUI conformance and terminal architecture tests.
- [ ] 5.5 Keep reflection only where a documented extension callback contract inherently requires dynamic invocation, validate callback results at the boundary, and add negative extension factory tests.

## 6. Remove Runtime Package-Layout Coupling and Reclassify UI Ownership

- [ ] 6.1 Move built-in theme data required by the owned presentation to attributed A1-owned resources or documented public loading APIs; remove production construction of Pi `dist` theme paths and pass theme reload/parity tests.
- [ ] 6.2 Move optional announcement imagery and baseline changelog content to attributed A1-owned resources or omit unsupported optional content; remove production reads beneath Pi's package root and pass announcement/changelog behavior tests.
- [ ] 6.3 Add a production scan that rejects dependency package-directory reads, `node_modules` traversal, private distribution suffixes, and package-root-plus-internal-path construction while allowing explicitly classified test-only provenance tooling; run mutation fixtures.
- [ ] 6.4 Reclassify the source ledger into public API reuse, A1-owned source-derived presentation, and host adaptation; ensure private upstream changes do not invalidate engine-only compatibility and pass provenance/license/governance tests.
- [ ] 6.5 Separate optional UI synchronization/parity regeneration commands from mandatory engine candidate conformance and document the two maintenance workflows; run documentation and source-ledger policy tests.

## 7. Bind the Explicit Vanilla Oracle to the Selected Dependency

- [ ] 7.1 Add an A1-owned child entry that imports Pi's documented package-root `main(args)` API and reports bounded startup failure without resolving a private CLI file; pass direct entry argument and exit tests.
- [ ] 7.2 Select the exact public-entry child and `process.execPath` before constructing the generic transparent launch profile, leaving the terminal launcher application-agnostic; pass launch-intent and transparent-boundary tests.
- [ ] 7.3 Prove `a1 pi` launches the selected exact dependency when ambient `pi` is missing or a conflicting fake executable appears first on `PATH`; pass exact-entry integration tests.
- [ ] 7.4 Verify ordinary Pi profile paths, inherited physical terminal ownership, arguments, exit outcomes, and complete bypass of owned UI, workspace, and composed infrastructure; run explicit-mode regression tests.
- [ ] 7.5 Verify the public-entry wrapper and required dependency are present in the exact packed artifact without publishing scripts, source maps, or private path assumptions; run build, pack dry-run, and packaged-oracle tests.

## 8. Build the Complete Candidate Compatibility Gate

- [ ] 8.1 Expand engine conformance to public exports, service creation, prompt/queue/abort/compaction events, session replacement, models/authentication, settings, resources, extensions, workflows, and disposal; emit bounded machine-readable capability results.
- [ ] 8.2 Expand component/TUI conformance to every reused public component family, regular/fullscreen construction, overlays, focus, width, extension surfaces, restoration, and malformed callback isolation; run focused real-package tests.
- [ ] 8.3 Add mutation fixtures that remove or change each required capability and prove candidate validation fails with package version, capability, and operation instead of silently defaulting.
- [ ] 8.4 Add an isolated candidate evaluator that installs one exact proposed Pi dependency set, runs compile-time and runtime compatibility without changing the accepted lockfile, and produces a bounded migration report; test success, incompatibility, timeout, and cleanup.
- [ ] 8.5 Make architecture, compatibility authority, candidate conformance, exact-oracle, packaging, owned-UI regression, and extension behavior mandatory release gates while keeping optional UI synchronization distinct; run release-gate policy tests.

## 9. Revalidate the Baseline and Authorize Workspace Task 5.5

- [ ] 9.1 Run typecheck, architecture, customization, dependency, unit, integration, release, audit, and package-content gates; record exact command outcomes and artifact hashes.
- [ ] 9.2 Run the independent untouched-Pi versus A1 terminal parity gate for current accepted presentation and preserve zero-difference or reviewed explicit deviations.
- [ ] 9.3 Provide user-controlled manual commands for bare owned UI, extension surfaces, `a1 pi`, `a1 sandbox`, resize, input, shutdown, and recovery; record the exact candidate verdict without automating an active workstation.
- [ ] 9.4 Re-run negative boundary and candidate mutation suites and prove no production package-layout reads, reflected concrete constructors, permissive Pi mirrors, ambient oracle resolution, or feature/workspace Pi dependencies remain.
- [ ] 9.5 Validate `harden-pi-api-boundary` strictly, record final acceptance evidence, and mark the prerequisite satisfied so `evolve-bare-a1-into-multi-agent-workspace` task 5.5 may resume only through the accepted neutral ports.
