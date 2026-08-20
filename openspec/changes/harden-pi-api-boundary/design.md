## Context

See `proposal.md` for motivation and `specs/pi-api-boundary/spec.md` for required behavior. The current implementation already confines package imports to three Pi adapter roots and prohibits deep imports, patching, prototype mutation, and private-field inspection. However, `features/owned-ui` constructs concrete Pi adapters, production reads several files beneath Pi's package directory, public components are sometimes reflected into existence with structural substitutes, and the engine adapter mirrors a large mostly optional vendor surface through `unknown` values.

The accepted owned presentation also contains public Pi component reuse plus attributed source-derived units. Exact pinned parity was useful to establish a baseline, but treating every retained source-derived unit as automatically synchronized with each engine update would make API isolation impossible. The active workspace change is about to integrate SDK-backed Pi agents at task 5.5, so the boundary must be corrected before that composition is duplicated across tabs.

## Goals / Non-Goals

**Goals:**

- Make feature and workspace code vendor-neutral before structured Pi tabs are added.
- Ensure production uses only documented Pi package exports and A1-owned resources.
- Turn incompatible Pi updates into explicit compile-time or bounded conformance failures.
- Keep the accepted A1 presentation stable while the Pi engine can be evaluated independently.
- Preserve exact package pinning, explicit vanilla mode, extension behavior, and current owned-UI outcomes.
- Make architecture and upgrade guarantees executable in repository gates.
- Enforce repository-global responsibility-based implementation names so the product name is never used as an internal ownership namespace.

**Non-Goals:**

- Upgrade Pi beyond the currently selected exact version in this change.
- Support multiple Pi versions simultaneously at runtime.
- Replace Pi as the selected engine or remove `a1 pi`.
- Redesign the accepted presentation, introduce structured tabs, or continue workspace task 5.5.
- Remove attribution or provenance for source-derived A1 code.
- Eliminate source-path inspection from isolated non-production synchronization research where source provenance genuinely requires it.

## Decisions

### 1. Introduce vendor-neutral contracts and a single composition root

A1 will define capability-scoped contracts for engine/session lifecycle, commands, events and snapshots, models/authentication, settings, resources/extensions, presentation components, and terminal runtime. Owned UI and workspace features will accept these ports through constructors or run options. They will not import concrete adapter classes, factories, package types, or `Pi*`-named contracts.

One composition root selected by the process entry path will import the Pi implementations, construct them, validate compatibility, and inject the resulting ports. The root is wiring only; it will not own workflow behavior.

**Alternative rejected:** rename the current Pi adapter interfaces while leaving feature construction unchanged. This hides vendor names but does not invert ownership or contain replacement and upgrade impact.

### 2. Keep vendor types inside capability-specific Pi integration modules

The monolithic engine adapter will be decomposed by public capability: runtime/session replacement, event mapping, models and authentication, settings, resources and extensions, workflow operations, and compatibility validation. Integration modules will use official package-root exported types directly. Each module will convert vendor objects to A1 DTOs at one boundary.

Required methods will be non-optional in the selected compatibility profile. Truly optional behavior will be represented as an explicit capability with a defined unavailable result. Runtime validators will cover untrusted or weakly typed extension payloads and external data, but validators will not substitute for exported static types.

**Alternative rejected:** preserve large hand-written `*Like` interfaces with most methods optional. That approach keeps tests easy to fake but permits incompatible upgrades to compile and degrade at runtime.

### 3. Test adapters through owned test doubles rather than weakening production interfaces

Tests will provide A1 port fakes and focused Pi compatibility fixtures. Production interfaces will not be made optional merely to accommodate synthetic sessions. Where a real public Pi runtime is required, conformance tests will construct one with isolated settings, resources, credentials, and in-memory sessions.

**Alternative rejected:** continue injecting objects that partially resemble concrete Pi sessions and services. Structural substitutes are difficult to keep synchronized and obscure which API is actually required.

### 4. Public Pi components may be reused only with valid public inputs

The component integration may wrap documented package-root component exports behind A1 component ports. Constructors must be called normally with compile-time-valid arguments. Reflection may remain only for invoking extension callbacks whose public contract is inherently callback-based, never for bypassing a concrete component constructor.

A component such as the footer that requires a concrete stock `AgentSession` cannot receive a fabricated object. The implementation will either keep the real session entirely inside the component adapter or use an attributed A1-owned presenter over neutral view data. The same rule applies to editor, selectors, and dialogs.

**Alternative rejected:** use `Reflect.construct` plus `instanceof` to bypass constructor typing. It validates the returned class identity but not the substituted dependencies the class may access later.

### 5. Production owns every resource it reads

Built-in theme JSON, optional announcement imagery, and baseline changelog content needed by the A1-owned presentation will be stored as A1-owned attributed resources or obtained from a documented public API. Production will not append `dist`, `src`, or other internal paths to a dependency package directory.

Public Pi helpers that internally manage Pi's own files remain valid; A1 code must not know the suffix beneath the returned package root. Isolated source/provenance tooling may inspect an installed package, but published runtime modules and product startup cannot depend on those paths.

**Alternative rejected:** classify `getPackageDir() + private suffix` as a public API because `getPackageDir()` is exported. The exported root does not make every internal descendant a compatibility contract.

### 6. Source-derived UI becomes an A1-owned presentation baseline

Existing attributed ports remain licensed A1 code. Their current upstream identity remains provenance, not a runtime compatibility requirement. The source ledger will distinguish:

- public Pi API reuse that must pass candidate conformance;
- A1-owned source-derived presentation units that change only through explicit presentation work;
- host adapters that convert public APIs to A1 contracts.

An engine candidate will not be rejected merely because private upstream interactive source changed. A deliberate UI synchronization will update provenance and parity evidence in a separate change.

**Alternative rejected:** automatically resynchronize all private interactive source for every engine update. That makes the private UI tree the real API and defeats the boundary this change establishes.

### 7. Launch exact vanilla Pi through an A1-owned public-entry wrapper

A1 will provide a small child entry module that imports Pi's documented package-root `main(args)` export. Transparent mode will launch `process.execPath` with this A1-owned entry and the selected arguments, preserving inherited physical terminal handles and ordinary Pi configuration. This binds `a1 pi` to A1's exact dependency without resolving `node_modules`, reading package metadata paths, or depending on a global `pi` command.

The generic transparent launcher remains application-agnostic; selection of the wrapper and its arguments occurs before the generic launch profile reaches the terminal boundary.

**Alternative rejected:** resolve `dist/cli.js` or the package `bin` field. Pi does not export those paths as a documented module contract. Continuing to use ambient `PATH` also cannot guarantee the pinned oracle version.

### 8. Expand compatibility from smoke checks to a capability matrix

A single compatibility suite will report the exact dependency identity and results for:

- public exports and service creation;
- prompt, steer/follow-up, abort, retry/compaction, and event ordering;
- new/resume/fork/import session replacement and rebind lifecycle;
- model selection, scoped models, refresh, login/logout, and cancellation;
- settings read/write/flush and every A1-exposed setting;
- resources, commands, extension binding, extension UI, renderers, and reload;
- all reused public components and TUI regular/fullscreen construction;
- owned-port conversion validation and malformed-result failure;
- exact `a1 pi` child selection, packaging, and transparent bypass behavior.

Focused tests remain, but a candidate cannot pass from export presence and three rendered components alone. Mutation fixtures will remove or alter required capabilities to prove the gate fails.

### 9. Keep one dependency authority and derive compatibility evidence

`package.json` and `package-lock.json` remain authoritative for selected versions and integrity. Production constants that duplicate dependency versions will be removed unless they are genuine protocol versions. Test fixtures and evidence must be generated from or checked against package/lock authority. Upstream source commit metadata remains only where provenance is needed and is not used to authorize runtime behavior.

Candidate evaluation will run against one exact dependency set in an isolated worktree or temporary install before the accepted pin changes. Supporting current and candidate packages concurrently in production is not required.

### 10. Use semantic implementation identifiers globally

Classes, interfaces, functions, variables, fields, and constants will be named for their responsibility rather than prefixed or suffixed with the product name. This applies across production, tooling, native code, tests, and generated source, and is enforced by a deterministic repository gate. Exact external identity tokens remain centralized and unchanged where they are part of observable compatibility, including `A1_*` environment keys, package and command names, profile ids, state paths, and schema values; local bindings around those tokens remain semantic.

Existing occurrences will first be inventoried and classified so external contracts are not accidentally renamed. A separate cleanup task will then rename internal identifiers and add positive and negative governance fixtures. Product-name prose, user-visible identity, and exact external string constants are not implementation identifier violations.

**Alternative rejected:** use names such as `A1OwnedEditor` to distinguish product-owned code from upstream code. Ownership belongs in module boundaries, attribution, and architecture metadata; encoding it in every symbol creates noisy names and invites the same prefix across unrelated responsibilities.

### 11. Gate workspace task 5.5 explicitly

The active workspace planning artifacts will record this change as a prerequisite immediately before task 5.5. Task 5.5 will consume only the new neutral ports and will include an architecture assertion that no Pi package, concrete adapter, or Pi-named contract has entered workspace feature code.

This hardening change does not implement tabs. Its final acceptance evidence is the authorization to resume task 5.5.

## Risks / Trade-offs

- **[Neutral ports accidentally recreate the entire Pi API]** → Define ports from A1 use cases and capability boundaries, not vendor class shapes; reject one universal session interface.
- **[Decomposition changes accepted UI behavior]** → Migrate behind existing behavior tests and independent terminal parity, one capability at a time.
- **[Owned source-derived UI can drift from upstream]** → Treat drift as deliberate product ownership, retain provenance, and keep `a1 pi` as the exact current upstream comparison path.
- **[Using real Pi objects makes tests slower]** → Use neutral port fakes for feature tests and reserve real isolated runtimes for integration/conformance gates.
- **[The public `main()` entry changes]** → Candidate conformance fails before release; do not fall back to private CLI paths.
- **[Pi public component APIs remain volatile]** → Keep them behind component adapters and prefer A1-owned presenters when a component requires stock-root state.
- **[Migration conflicts with active workspace work]** → Stop before task 5.5, land hardening coherently, then rebase workspace integration onto accepted contracts.
- **[Exact parity evidence still contains source-layout assumptions]** → Classify it as test-only presentation synchronization evidence and ensure runtime/package gates do not require it for an engine-only update.
- **[Naming cleanup accidentally changes external identity contracts]** → Inventory and classify exact external tokens before cleanup; enforce only identifier syntax while preserving centralized product strings and serialized compatibility values.

## Migration Plan

1. Record the workspace prerequisite and freeze task 5.5 implementation.
2. Add neutral contracts plus dependency-direction governance without changing runtime behavior.
3. Add the composition root and inject the existing Pi implementation through temporary complete adapters.
4. Migrate owned UI and customization consumers off concrete Pi adapter/component/TUI names.
5. Split engine capabilities and replace permissive mirrors with exported types, validators, and explicit capability results.
6. Replace reflected concrete-component construction and package-layout resource reads.
7. Introduce and verify the public-entry vanilla child wrapper while preserving the generic transparent launcher.
8. Reclassify source-derived UI ownership and separate engine compatibility from optional UI synchronization evidence.
9. Expand candidate conformance, mutation coverage, architecture checks, package checks, and full regressions.
10. Run independent parity and manual baseline checks, record final hardening evidence, then authorize workspace task 5.5.

Each migration slice must keep bare owned UI and both explicit modes runnable. A failed slice reverts to the prior exact pinned implementation; rollback must not weaken architecture checks or begin workspace tab integration early.
